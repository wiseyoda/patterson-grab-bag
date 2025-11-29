import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  generateAssignments,
  generatePartialAssignments,
  analyzeRegeneration,
} from "@/lib/derangement";
import { logError, logInfo, logWarn } from "@/lib/logger";

interface RouteParams {
  params: Promise<{ adminToken: string }>;
}

// GET - Analyze if regeneration is possible and what type
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
            viewedAt: true,
            assignedToId: true,
          },
        },
      },
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Check if event is locked (assignments exist)
    const hasAssignments = event.isLocked;
    const viewedParticipants = event.participants.filter(p => p.viewedAt !== null);
    const unviewedParticipants = event.participants.filter(p => p.viewedAt === null);

    // Analyze regeneration possibility
    const analysis = analyzeRegeneration(
      event.participants.map(p => ({
        id: p.id,
        hasViewed: p.viewedAt !== null,
      }))
    );

    return NextResponse.json({
      hasAssignments,
      totalParticipants: event.participants.length,
      viewedCount: viewedParticipants.length,
      unviewedCount: unviewedParticipants.length,
      viewedParticipants: viewedParticipants.map(p => ({ id: p.id, name: p.name })),
      unviewedParticipants: unviewedParticipants.map(p => ({ id: p.id, name: p.name })),
      canRegenerate: analysis.canRegenerate,
      isFullRegeneration: analysis.isFullRegeneration,
      reason: analysis.reason,
    });
  } catch (error) {
    logError("Error analyzing regeneration", error, {
      endpoint: "GET /api/admin/[adminToken]/randomize",
    });
    return NextResponse.json(
      { error: "Failed to analyze regeneration status" },
      { status: 500 }
    );
  }
}

// POST - Generate or regenerate assignments
export async function POST(_request: NextRequest, { params }: RouteParams) {
  try {
    const { adminToken } = await params;

    const event = await prisma.event.findUnique({
      where: { adminToken },
      include: {
        participants: {
          select: {
            id: true,
            name: true,
            viewedAt: true,
            assignedToId: true,
          },
        },
      },
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    if (event.participants.length < 3) {
      return NextResponse.json(
        { error: "Need at least 3 participants to generate assignments" },
        { status: 400 }
      );
    }

    // Analyze the current state
    const participantsWithViewStatus = event.participants.map(p => ({
      id: p.id,
      name: p.name,
      hasViewed: p.viewedAt !== null,
      currentAssignment: p.assignedToId,
    }));

    const analysis = analyzeRegeneration(
      participantsWithViewStatus.map(p => ({ id: p.id, hasViewed: p.hasViewed }))
    );

    // Check if regeneration is possible
    if (!analysis.canRegenerate) {
      logWarn("Regeneration blocked", {
        eventId: event.id,
        reason: analysis.reason,
        lockedCount: analysis.lockedParticipants.length,
        unlockedCount: analysis.unlockedParticipants.length,
      });
      return NextResponse.json(
        { error: analysis.reason || "Cannot regenerate assignments" },
        { status: 400 }
      );
    }

    let result;
    let isPartialRegeneration = false;

    if (analysis.isFullRegeneration) {
      // Full regeneration - no one has viewed yet
      const participantIds = event.participants.map(p => p.id);

      try {
        result = generateAssignments(participantIds);
      } catch (assignmentError) {
        const validationErrors = (
          assignmentError as Error & { validationErrors?: string[][] }
        ).validationErrors;
        logError("Full assignment generation failed", assignmentError, {
          endpoint: "POST /api/admin/[adminToken]/randomize",
          eventId: event.id,
          participantCount: participantIds.length,
          validationErrors: validationErrors || [],
        });
        return NextResponse.json(
          { error: "Failed to generate valid assignments. Please try again." },
          { status: 500 }
        );
      }
    } else {
      // Partial regeneration - some have viewed, regenerate only unlocked participants
      isPartialRegeneration = true;
      const lockedParticipants = participantsWithViewStatus.filter(p => p.hasViewed);
      const unlockedParticipants = participantsWithViewStatus.filter(p => !p.hasViewed);

      // Build map of locked assignments
      const lockedAssignments = new Map<string, string>();
      for (const p of lockedParticipants) {
        if (p.currentAssignment) {
          lockedAssignments.set(p.id, p.currentAssignment);
        }
      }

      try {
        result = generatePartialAssignments(
          unlockedParticipants.map(p => p.id),
          lockedAssignments
        );

        logInfo("Partial regeneration successful", {
          eventId: event.id,
          lockedCount: lockedParticipants.length,
          unlockedCount: unlockedParticipants.length,
          attempts: result.attempts,
        });
      } catch (assignmentError) {
        const validationErrors = (
          assignmentError as Error & { validationErrors?: string[][] }
        ).validationErrors;
        logError("Partial assignment generation failed", assignmentError, {
          endpoint: "POST /api/admin/[adminToken]/randomize",
          eventId: event.id,
          lockedCount: lockedParticipants.length,
          unlockedCount: unlockedParticipants.length,
          validationErrors: validationErrors || [],
        });
        return NextResponse.json(
          {
            error:
              "Failed to generate valid assignments for remaining participants. " +
              "Try adding more participants who haven't viewed their assignments yet.",
          },
          { status: 500 }
        );
      }
    }

    const { assignments, attempts } = result;

    // Log if it took multiple attempts
    if (attempts > 1) {
      logInfo("Assignment generation succeeded after retry", {
        eventId: event.id,
        eventName: event.name,
        participantCount: event.participants.length,
        attempts,
        isPartialRegeneration,
      });
    }

    // Update the database in a transaction
    await prisma.$transaction(async (tx) => {
      if (analysis.isFullRegeneration) {
        // Full regeneration - clear all assignments first
        await tx.participant.updateMany({
          where: { eventId: event.id },
          data: {
            assignedToId: null,
            notificationStatus: "NOT_SENT",
            notifiedAt: null,
            viewedAt: null,
          },
        });

        // Set all new assignments
        for (const [giverId, receiverId] of assignments) {
          await tx.participant.update({
            where: { id: giverId },
            data: { assignedToId: receiverId },
          });
        }
      } else {
        // Partial regeneration - only update unlocked participants
        for (const participantId of analysis.unlockedParticipants) {
          const newAssignment = assignments.get(participantId);
          if (newAssignment) {
            await tx.participant.update({
              where: { id: participantId },
              data: {
                assignedToId: newAssignment,
                notificationStatus: "NOT_SENT",
                notifiedAt: null,
                // Don't reset viewedAt - they haven't viewed the new one yet
                // but keep it null since these are unviewed participants
              },
            });
          }
        }
      }

      // Lock the event (or keep it locked)
      await tx.event.update({
        where: { id: event.id },
        data: { isLocked: true },
      });
    });

    return NextResponse.json({
      success: true,
      message: isPartialRegeneration
        ? `Assignments regenerated for ${analysis.unlockedParticipants.length} participants. ` +
          `${analysis.lockedParticipants.length} participants kept their original assignments.`
        : "Assignments generated successfully",
      participantCount: event.participants.length,
      regeneratedCount: isPartialRegeneration
        ? analysis.unlockedParticipants.length
        : event.participants.length,
      lockedCount: isPartialRegeneration ? analysis.lockedParticipants.length : 0,
      isPartialRegeneration,
    });
  } catch (error) {
    logError("Error generating assignments", error, {
      endpoint: "POST /api/admin/[adminToken]/randomize",
    });
    return NextResponse.json(
      { error: "Failed to generate assignments" },
      { status: 500 }
    );
  }
}
