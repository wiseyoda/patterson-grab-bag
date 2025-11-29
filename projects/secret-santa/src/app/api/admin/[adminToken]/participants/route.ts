import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { logError } from "@/lib/logger";

interface RouteParams {
  params: Promise<{ adminToken: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { adminToken } = await params;
    const body = await request.json();
    const { name, email } = body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Participant name is required" },
        { status: 400 }
      );
    }

    const event = await prisma.event.findUnique({
      where: { adminToken },
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    if (event.isLocked) {
      return NextResponse.json(
        { error: "Cannot add participants after assignments are generated" },
        { status: 400 }
      );
    }

    const participant = await prisma.participant.create({
      data: {
        eventId: event.id,
        name: name.trim(),
        email: email?.trim() || null,
      },
    });

    return NextResponse.json({
      id: participant.id,
      name: participant.name,
      email: participant.email,
      accessToken: participant.accessToken,
      notificationStatus: participant.notificationStatus,
    });
  } catch (error) {
    logError("Error adding participant", error, { endpoint: "POST /api/admin/[adminToken]/participants" });
    return NextResponse.json(
      { error: "Failed to add participant" },
      { status: 500 }
    );
  }
}
