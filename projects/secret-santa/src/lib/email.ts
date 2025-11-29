import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

interface SendAdminLinkEmailParams {
  to: string;
  eventName: string;
  adminLink: string;
}

export async function sendAdminLinkEmail({
  to,
  eventName,
  adminLink,
}: SendAdminLinkEmailParams): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await resend.emails.send({
      from: "Secret Santa <onboarding@resend.dev>",
      to,
      subject: `Your Admin Link for ${eventName}`,
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="color: #c41e3a; margin-bottom: 10px;">Secret Santa</h1>
    <p style="font-size: 18px; color: #666;">Your Admin Dashboard Link</p>
  </div>

  <div style="background: #f8f9fa; border-radius: 10px; padding: 25px; margin-bottom: 25px;">
    <p style="margin: 0 0 15px 0;">You created the gift exchange <strong>${eventName}</strong>.</p>
    <p style="margin: 0 0 15px 0;">Save this email! The link below is your <strong>only way</strong> to access your admin dashboard.</p>
  </div>

  <div style="text-align: center; margin-bottom: 25px;">
    <a href="${adminLink}" style="display: inline-block; background: #c41e3a; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
      Open Admin Dashboard
    </a>
  </div>

  <div style="background: #fff3cd; border: 1px solid #ffc107; border-radius: 8px; padding: 15px; margin-bottom: 25px;">
    <p style="margin: 0; color: #856404; font-size: 14px;">
      <strong>Important:</strong> Do not share this link with participants. This link gives full admin access to your event.
    </p>
  </div>

  <p style="color: #888; font-size: 14px; text-align: center;">
    If the button doesn't work, copy and paste this link into your browser:<br>
    <a href="${adminLink}" style="color: #c41e3a; word-break: break-all;">${adminLink}</a>
  </p>

  <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">

  <p style="color: #aaa; font-size: 12px; text-align: center;">
    This email was sent by Secret Santa Gift Exchange
  </p>
</body>
</html>
      `,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

interface SendInviteEmailParams {
  to: string;
  participantName: string;
  eventName: string;
  eventDate?: string | null; // YYYY-MM-DD format
  budget?: string | null;
  revealLink: string;
}

export async function sendInviteEmail({
  to,
  participantName,
  eventName,
  eventDate,
  budget,
  revealLink,
}: SendInviteEmailParams): Promise<{ success: boolean; error?: string }> {
  try {
    const formattedDate = eventDate
      ? new Date(eventDate + "T12:00:00").toLocaleDateString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      : null;

    const { error } = await resend.emails.send({
      from: "Secret Santa <onboarding@resend.dev>",
      to,
      subject: `You've been invited to ${eventName}!`,
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="color: #c41e3a; margin-bottom: 10px;">Secret Santa</h1>
    <p style="font-size: 18px; color: #666;">You've been invited!</p>
  </div>

  <div style="background: #f8f9fa; border-radius: 10px; padding: 25px; margin-bottom: 25px;">
    <p style="margin: 0 0 15px 0;">Hi <strong>${participantName}</strong>,</p>
    <p style="margin: 0 0 15px 0;">You've been added to the <strong>${eventName}</strong> gift exchange!</p>
    ${formattedDate ? `<p style="margin: 0 0 15px 0;"><strong>Date:</strong> ${formattedDate}</p>` : ""}
    ${budget ? `<p style="margin: 0 0 15px 0;"><strong>Budget:</strong> ${budget}</p>` : ""}
  </div>

  <div style="text-align: center; margin-bottom: 25px;">
    <a href="${revealLink}" style="display: inline-block; background: #c41e3a; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
      Reveal Your Assignment
    </a>
  </div>

  <p style="color: #888; font-size: 14px; text-align: center;">
    Click the button above to see who you'll be buying a gift for!<br>
    Keep it secret, keep it safe.
  </p>

  <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">

  <p style="color: #aaa; font-size: 12px; text-align: center;">
    This email was sent by Secret Santa Gift Exchange
  </p>
</body>
</html>
      `,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
