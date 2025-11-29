import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { logError } from "@/lib/logger";

interface RouteParams {
  params: Promise<{ adminToken: string }>;
}

/**
 * GET /api/admin/[adminToken]/gmail/status
 * Returns the Gmail connection status for an event
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { adminToken } = await params;

    const event = await prisma.event.findUnique({
      where: { adminToken },
      include: { gmailCredential: true },
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const credential = event.gmailCredential;

    // No credential or revoked
    if (!credential || credential.revokedAt) {
      return NextResponse.json({
        connected: false,
        email: null,
        expired: false,
      });
    }

    // Check if token is expired
    const isExpired = new Date() > credential.tokenExpiresAt;

    return NextResponse.json({
      connected: true,
      email: credential.gmailAddress,
      expired: isExpired,
      connectedAt: credential.connectedAt,
    });
  } catch (error) {
    logError("Failed to get Gmail status", error, {
      endpoint: "GET /api/admin/[adminToken]/gmail/status",
    });
    return NextResponse.json(
      { error: "Failed to get Gmail status" },
      { status: 500 }
    );
  }
}
