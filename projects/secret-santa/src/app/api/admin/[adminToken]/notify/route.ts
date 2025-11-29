import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  sendInviteEmailViaGmail,
  GmailNotConnectedError,
  GmailTokenRevokedError,
} from "@/lib/gmail-send";
import { logError } from "@/lib/logger";

interface RouteParams {
  params: Promise<{ adminToken: string }>;
}

export async function POST(_request: NextRequest, { params }: RouteParams) {
  try {
    const { adminToken } = await params;

    const event = await prisma.event.findUnique({
      where: { adminToken },
      include: {
        participants: {
          where: {
            email: { not: null },
            notificationStatus: "NOT_SENT",
          },
        },
        gmailCredential: true,
      },
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    if (!event.isLocked) {
      return NextResponse.json(
        { error: "Must generate assignments before sending notifications" },
        { status: 400 }
      );
    }

    // Check if Gmail is connected
    if (!event.gmailCredential || event.gmailCredential.revokedAt) {
      return NextResponse.json(
        {
          error:
            "Gmail is not connected. Please connect your Gmail account to send emails.",
        },
        { status: 400 }
      );
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const results: { name: string; success: boolean; error?: string }[] = [];

    for (const participant of event.participants) {
      if (!participant.email) continue;

      const revealLink = `${appUrl}/reveal/${participant.accessToken}`;

      try {
        const result = await sendInviteEmailViaGmail(
          event.id,
          participant.email,
          participant.name,
          event.name,
          revealLink,
          event.eventDate,
          event.budget
        );

        if (result.success) {
          await prisma.participant.update({
            where: { id: participant.id },
            data: {
              notificationStatus: "SENT",
              notifiedAt: new Date(),
            },
          });
        }

        results.push({
          name: participant.name,
          success: result.success,
          error: result.error,
        });
      } catch (error) {
        // Handle Gmail-specific errors
        if (error instanceof GmailNotConnectedError) {
          return NextResponse.json(
            { error: "Gmail is not connected. Please reconnect your Gmail account." },
            { status: 400 }
          );
        }
        if (error instanceof GmailTokenRevokedError) {
          return NextResponse.json(
            { error: "Gmail access was revoked. Please reconnect your Gmail account." },
            { status: 400 }
          );
        }

        results.push({
          name: participant.name,
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.filter((r) => !r.success).length;

    return NextResponse.json({
      success: true,
      sent: successCount,
      failed: failureCount,
      results,
    });
  } catch (error) {
    // Handle Gmail-specific errors at the top level too
    if (error instanceof GmailNotConnectedError) {
      return NextResponse.json(
        { error: "Gmail is not connected. Please connect your Gmail account." },
        { status: 400 }
      );
    }
    if (error instanceof GmailTokenRevokedError) {
      return NextResponse.json(
        { error: "Gmail access was revoked. Please reconnect your Gmail account." },
        { status: 400 }
      );
    }

    logError("Error sending notifications", error, {
      endpoint: "POST /api/admin/[adminToken]/notify",
    });
    return NextResponse.json(
      { error: "Failed to send notifications" },
      { status: 500 }
    );
  }
}
