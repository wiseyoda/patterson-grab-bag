import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { logError } from "@/lib/logger";

interface RouteParams {
  params: Promise<{ adminToken: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { adminToken } = await params;

    const event = await prisma.event.findUnique({
      where: { adminToken },
      include: {
        participants: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            accessToken: true,
            assignedToId: true, // We'll convert this to a boolean
            notificationStatus: true,
            notifiedAt: true,
            viewedAt: true,
            createdAt: true,
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Transform participants to hide assignedToId but show hasAssignment
    const participantsWithAssignmentStatus = event.participants.map((p) => ({
      id: p.id,
      name: p.name,
      email: p.email,
      phone: p.phone,
      accessToken: p.accessToken,
      hasAssignment: p.assignedToId !== null,
      notificationStatus: p.notificationStatus,
      notifiedAt: p.notifiedAt,
      viewedAt: p.viewedAt,
      createdAt: p.createdAt,
    }));

    return NextResponse.json({
      id: event.id,
      name: event.name,
      budget: event.budget,
      eventDate: event.eventDate,
      rules: event.rules,
      isLocked: event.isLocked,
      createdAt: event.createdAt,
      participants: participantsWithAssignmentStatus,
    });
  } catch (error) {
    logError("Error fetching event", error, { endpoint: "GET /api/admin/[adminToken]" });
    return NextResponse.json(
      { error: "Failed to fetch event" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { adminToken } = await params;
    const body = await request.json();
    const { name, budget, eventDate, rules } = body;

    const event = await prisma.event.findUnique({
      where: { adminToken },
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    if (event.isLocked) {
      return NextResponse.json(
        { error: "Cannot modify event after assignments are generated" },
        { status: 400 }
      );
    }

    const updatedEvent = await prisma.event.update({
      where: { adminToken },
      data: {
        name: name?.trim() || event.name,
        budget: budget?.trim() || event.budget,
        eventDate: eventDate?.trim() || event.eventDate, // Store as YYYY-MM-DD string
        rules: rules?.trim() || event.rules,
      },
    });

    return NextResponse.json({
      id: updatedEvent.id,
      name: updatedEvent.name,
      budget: updatedEvent.budget,
      eventDate: updatedEvent.eventDate,
      rules: updatedEvent.rules,
      isLocked: updatedEvent.isLocked,
    });
  } catch (error) {
    logError("Error updating event", error, { endpoint: "PUT /api/admin/[adminToken]" });
    return NextResponse.json(
      { error: "Failed to update event" },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { adminToken } = await params;

    const event = await prisma.event.findUnique({
      where: { adminToken },
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    await prisma.event.delete({
      where: { adminToken },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logError("Error deleting event", error, { endpoint: "DELETE /api/admin/[adminToken]" });
    return NextResponse.json(
      { error: "Failed to delete event" },
      { status: 500 }
    );
  }
}
