import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { logError } from "@/lib/logger";

interface RouteParams {
  params: Promise<{ adminToken: string; participantId: string }>;
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { adminToken, participantId } = await params;

    const event = await prisma.event.findUnique({
      where: { adminToken },
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    if (event.isLocked) {
      return NextResponse.json(
        { error: "Cannot remove participants after assignments are generated" },
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

    await prisma.participant.delete({
      where: { id: participantId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logError("Error removing participant", error, { endpoint: "DELETE /api/admin/[adminToken]/participants/[participantId]" });
    return NextResponse.json(
      { error: "Failed to remove participant" },
      { status: 500 }
    );
  }
}
