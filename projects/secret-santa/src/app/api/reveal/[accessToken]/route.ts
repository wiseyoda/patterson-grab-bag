import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { logError } from "@/lib/logger";

interface RouteParams {
  params: Promise<{ accessToken: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { accessToken } = await params;

    const participant = await prisma.participant.findUnique({
      where: { accessToken },
      include: {
        event: {
          select: {
            name: true,
            budget: true,
            eventDate: true,
            rules: true,
            isLocked: true,
          },
        },
        assignedTo: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!participant) {
      return NextResponse.json(
        { error: "Invalid link" },
        { status: 404 }
      );
    }

    if (!participant.event.isLocked || !participant.assignedTo) {
      return NextResponse.json(
        { error: "Assignments have not been generated yet" },
        { status: 400 }
      );
    }

    // Mark as viewed if not already
    if (!participant.viewedAt) {
      await prisma.participant.update({
        where: { id: participant.id },
        data: {
          notificationStatus: "VIEWED",
          viewedAt: new Date(),
        },
      });
    }

    return NextResponse.json({
      participantName: participant.name,
      assignedToName: participant.assignedTo.name,
      event: {
        name: participant.event.name,
        budget: participant.event.budget,
        eventDate: participant.event.eventDate,
        rules: participant.event.rules,
      },
    });
  } catch (error) {
    logError("Error revealing assignment", error, { endpoint: "GET /api/reveal/[accessToken]" });
    return NextResponse.json(
      { error: "Failed to reveal assignment" },
      { status: 500 }
    );
  }
}
