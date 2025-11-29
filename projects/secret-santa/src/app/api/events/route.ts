import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { logError } from "@/lib/logger";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, budget, eventDate, rules } = body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Event name is required" },
        { status: 400 }
      );
    }

    const event = await prisma.event.create({
      data: {
        name: name.trim(),
        budget: budget?.trim() || null,
        eventDate: eventDate?.trim() || null, // Store as YYYY-MM-DD string
        rules: rules?.trim() || null,
      },
    });

    return NextResponse.json({
      id: event.id,
      adminToken: event.adminToken,
      name: event.name,
    });
  } catch (error) {
    logError("Error creating event", error, { endpoint: "POST /api/events" });
    return NextResponse.json(
      { error: "Failed to create event" },
      { status: 500 }
    );
  }
}
