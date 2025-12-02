import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { logError } from "@/lib/logger";

interface RouteParams {
  params: Promise<{ adminToken: string }>;
}

interface ParsedParticipant {
  name: string;
  phone: string | null;
  email: string | null;
}

/**
 * Validate email format
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
}

/**
 * Parse tab-separated or multi-space-separated data
 * Expected format: Name\tPhone\tEmail (with optional header row)
 */
function parseParticipantData(data: string): ParsedParticipant[] {
  const lines = data.trim().split("\n");
  const participants: ParsedParticipant[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]?.trim();
    if (!line) continue;

    // Split by tab first, fall back to multiple spaces
    let parts = line.split("\t");
    if (parts.length < 2) {
      // Try splitting by 2+ spaces
      parts = line.split(/\s{2,}/);
    }

    // Skip header row (check if first column looks like a header)
    if (i === 0) {
      const firstCol = parts[0]?.toLowerCase();
      if (firstCol === "name" || firstCol === "names" || firstCol === "participant") {
        continue;
      }
    }

    const name = parts[0]?.trim();
    if (!name) continue;

    // Phone is second column, email is third
    const phone = parts[1]?.trim() ?? null;
    const email = parts[2]?.trim() ?? null;

    participants.push({
      name,
      phone,
      email: email && isValidEmail(email) ? email : null,
    });
  }

  return participants;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { adminToken } = await params;
    const body = await request.json();
    const { data } = body;

    if (!data || typeof data !== "string" || data.trim().length === 0) {
      return NextResponse.json(
        { error: "Participant data is required" },
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

    const parsedParticipants = parseParticipantData(data);

    if (parsedParticipants.length === 0) {
      return NextResponse.json(
        { error: "No valid participants found in the data" },
        { status: 400 }
      );
    }

    // Create all participants in a transaction
    const createdParticipants = await prisma.$transaction(
      parsedParticipants.map((p) =>
        prisma.participant.create({
          data: {
            eventId: event.id,
            name: p.name,
            phone: p.phone,
            email: p.email,
          },
        })
      )
    );

    return NextResponse.json({
      success: true,
      count: createdParticipants.length,
      participants: createdParticipants.map((p) => ({
        id: p.id,
        name: p.name,
        phone: p.phone,
        email: p.email,
      })),
    });
  } catch (error) {
    logError("Error bulk importing participants", error, {
      endpoint: "POST /api/admin/[adminToken]/participants/bulk",
    });
    return NextResponse.json(
      { error: "Failed to import participants" },
      { status: 500 }
    );
  }
}
