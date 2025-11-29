import { getValidAccessToken, GmailNotConnectedError, GmailTokenRevokedError } from "@/lib/gmail-auth";
import { logError, logInfo } from "@/lib/logger";

export { GmailNotConnectedError, GmailTokenRevokedError };

interface SendEmailResult {
  success: boolean;
  error?: string;
}

/**
 * Send an email via Gmail API
 *
 * @param eventId - The event ID to get Gmail credentials for
 * @param to - Recipient email address
 * @param subject - Email subject
 * @param htmlBody - HTML email body
 * @returns Result indicating success or failure
 */
export async function sendEmailViaGmail(
  eventId: string,
  to: string,
  subject: string,
  htmlBody: string
): Promise<SendEmailResult> {
  try {
    // Get valid access token (will refresh if needed)
    const { accessToken, gmailAddress } = await getValidAccessToken(eventId);

    // Build the email in MIME format
    const email = createMimeMessage(gmailAddress, to, subject, htmlBody);

    // Base64url encode the email
    const encodedEmail = Buffer.from(email)
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    // Send via Gmail API
    const response = await fetch(
      "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          raw: encodedEmail,
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      logError("Gmail API send failed", new Error(errorData.error?.message || "Unknown error"), {
        eventId,
        to,
        status: response.status,
        errorCode: errorData.error?.code,
      });

      // Check for auth errors that indicate revocation
      if (response.status === 401 || response.status === 403) {
        throw new GmailTokenRevokedError(
          "Gmail access was revoked or expired. Please reconnect your Gmail account."
        );
      }

      return {
        success: false,
        error: errorData.error?.message || `Gmail API error: ${response.status}`,
      };
    }

    logInfo("Email sent via Gmail", { eventId, to, from: gmailAddress });

    return { success: true };
  } catch (error) {
    if (error instanceof GmailNotConnectedError || error instanceof GmailTokenRevokedError) {
      throw error; // Re-throw these for caller to handle
    }

    logError("Failed to send email via Gmail", error, { eventId, to });

    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to send email",
    };
  }
}

/**
 * Create a MIME-formatted email message
 */
function createMimeMessage(
  from: string,
  to: string,
  subject: string,
  htmlBody: string
): string {
  const boundary = `boundary_${Date.now()}`;

  const plainText = htmlBody
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();

  const emailLines = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: =?UTF-8?B?${Buffer.from(subject).toString("base64")}?=`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: base64",
    "",
    Buffer.from(plainText).toString("base64"),
    "",
    `--${boundary}`,
    "Content-Type: text/html; charset=UTF-8",
    "Content-Transfer-Encoding: base64",
    "",
    Buffer.from(htmlBody).toString("base64"),
    "",
    `--${boundary}--`,
  ];

  return emailLines.join("\r\n");
}

/**
 * Send an invite email to a participant via Gmail
 */
export async function sendInviteEmailViaGmail(
  eventId: string,
  recipientEmail: string,
  recipientName: string,
  eventName: string,
  revealLink: string,
  eventDate?: string | null,
  budget?: string | null
): Promise<SendEmailResult> {
  const subject = `You're invited to ${eventName} - Secret Santa Gift Exchange!`;

  const formattedDate = eventDate
    ? new Date(eventDate + "T12:00:00").toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #c41e3a 0%, #8b0000 100%); padding: 40px 30px; text-align: center; border-radius: 12px 12px 0 0;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">
                🎄 Secret Santa 🎁
              </h1>
              <p style="color: #ffcccc; margin: 10px 0 0 0; font-size: 16px;">
                ${eventName}
              </p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="color: #333333; margin: 0 0 20px 0; font-size: 22px;">
                Hi ${recipientName}! 👋
              </h2>

              <p style="color: #666666; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                You've been invited to participate in a Secret Santa gift exchange! Click the button below to find out who you'll be getting a gift for.
              </p>

              ${formattedDate ? `
              <div style="background-color: #f8f8f8; padding: 15px 20px; border-radius: 8px; margin: 0 0 20px 0;">
                <p style="color: #333333; margin: 0; font-size: 14px;">
                  <strong>📅 Event Date:</strong> ${formattedDate}
                </p>
              </div>
              ` : ""}

              ${budget ? `
              <div style="background-color: #f8f8f8; padding: 15px 20px; border-radius: 8px; margin: 0 0 20px 0;">
                <p style="color: #333333; margin: 0; font-size: 14px;">
                  <strong>💰 Budget:</strong> ${budget}
                </p>
              </div>
              ` : ""}

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                <tr>
                  <td align="center">
                    <a href="${revealLink}"
                       style="display: inline-block; background: linear-gradient(135deg, #c41e3a 0%, #8b0000 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-size: 18px; font-weight: bold; box-shadow: 0 4px 15px rgba(196, 30, 58, 0.3);">
                      🎁 Reveal My Assignment
                    </a>
                  </td>
                </tr>
              </table>

              <p style="color: #999999; font-size: 14px; line-height: 1.6; margin: 20px 0 0 0;">
                <strong>🤫 Remember:</strong> Keep your assignment a secret! That's what makes it fun.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 30px; background-color: #f8f8f8; border-radius: 0 0 12px 12px; text-align: center;">
              <p style="color: #999999; font-size: 12px; margin: 0;">
                If the button doesn't work, copy this link: ${revealLink}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  return sendEmailViaGmail(eventId, recipientEmail, subject, htmlBody);
}

/**
 * Send admin link email via Gmail
 */
export async function sendAdminLinkEmailViaGmail(
  eventId: string,
  recipientEmail: string,
  eventName: string,
  adminLink: string
): Promise<SendEmailResult> {
  const subject = `Your Secret Santa Admin Link - ${eventName}`;

  const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #c41e3a 0%, #8b0000 100%); padding: 40px 30px; text-align: center; border-radius: 12px 12px 0 0;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">
                🎄 Secret Santa Admin 🎁
              </h1>
              <p style="color: #ffcccc; margin: 10px 0 0 0; font-size: 16px;">
                ${eventName}
              </p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="color: #333333; margin: 0 0 20px 0; font-size: 22px;">
                Your Admin Dashboard Link
              </h2>

              <div style="background-color: #fff3cd; border: 1px solid #ffc107; padding: 15px 20px; border-radius: 8px; margin: 0 0 20px 0;">
                <p style="color: #856404; margin: 0; font-size: 14px;">
                  <strong>⚠️ Important:</strong> This link is your only way to access the admin dashboard. Save it somewhere safe and don't share it with participants!
                </p>
              </div>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                <tr>
                  <td align="center">
                    <a href="${adminLink}"
                       style="display: inline-block; background: linear-gradient(135deg, #c41e3a 0%, #8b0000 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-size: 18px; font-weight: bold; box-shadow: 0 4px 15px rgba(196, 30, 58, 0.3);">
                      🔐 Go to Admin Dashboard
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 30px; background-color: #f8f8f8; border-radius: 0 0 12px 12px; text-align: center;">
              <p style="color: #999999; font-size: 12px; margin: 0;">
                If the button doesn't work, copy this link: ${adminLink}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  return sendEmailViaGmail(eventId, recipientEmail, subject, htmlBody);
}
