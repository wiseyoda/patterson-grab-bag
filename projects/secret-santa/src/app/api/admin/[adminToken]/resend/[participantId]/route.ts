import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  sendInviteEmailViaGmail,
  GmailNotConnectedError,
  GmailTokenRevokedError,
} from "@/lib/gmail-send";
import { logError } from "@/lib/logger";

interface RouteParams {
  params: Promise<{ adminToken: string; participantId: string }>;
}

export async function POST(_request: NextRequest, { params }: RouteParams) {
  try {
    const { adminToken, participantId } = await params;

    const event = await prisma.event.findUnique({
      where: { adminToken },
      include: {
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

    const participant = await prisma.participant.findFirst({
      where: {
        id: participantId,
        eventId: event.id,
      },
    });

    if (!participant) {
      return NextResponse.json(
        { error: "Participant not found" },
        { status: 404 }
      );
    }

    if (!participant.email) {
      return NextResponse.json(
        { error: "Participant has no email address" },
        { status: 400 }
      );
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const revealLink = `${appUrl}/reveal/${participant.accessToken}`;

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

      return NextResponse.json({
        success: true,
        message: `Email sent to ${participant.name}`,
      });
    } else {
      return NextResponse.json(
        { error: result.error || "Failed to send email" },
        { status: 500 }
      );
    }
  } catch (error) {
    // Handle Gmail-specific errors
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

    logError("Error resending notification", error, {
      endpoint: "POST /api/admin/[adminToken]/resend/[participantId]",
    });
    return NextResponse.json(
      { error: "Failed to resend notification" },
      { status: 500 }
    );
  }
}
