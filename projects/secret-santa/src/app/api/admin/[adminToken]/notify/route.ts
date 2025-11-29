import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendInviteEmail } from "@/lib/email";
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

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const results: { name: string; success: boolean; error?: string }[] = [];

    for (const participant of event.participants) {
      if (!participant.email) continue;

      const revealLink = `${appUrl}/reveal/${participant.accessToken}`;

      const result = await sendInviteEmail({
        to: participant.email,
        participantName: participant.name,
        eventName: event.name,
        eventDate: event.eventDate,
        budget: event.budget,
        revealLink,
      });

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
    logError("Error sending notifications", error, { endpoint: "POST /api/admin/[adminToken]/notify" });
    return NextResponse.json(
      { error: "Failed to send notifications" },
      { status: 500 }
    );
  }
}
