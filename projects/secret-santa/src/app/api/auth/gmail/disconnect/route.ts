import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { decryptToken } from "@/lib/encryption";
import { logError, logInfo, logWarn } from "@/lib/logger";

/**
 * POST /api/auth/gmail/disconnect
 * Revokes Gmail OAuth tokens and removes the connection
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { adminToken } = body;

    if (!adminToken) {
      return NextResponse.json(
        { error: "Admin token required" },
        { status: 401 }
      );
    }

    // Find event and credential
    const event = await prisma.event.findUnique({
      where: { adminToken },
      include: { gmailCredential: true },
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    if (!event.gmailCredential) {
      return NextResponse.json(
        { error: "No Gmail connection found" },
        { status: 404 }
      );
    }

    // Decrypt refresh token for revocation
    try {
      const refreshToken = decryptToken({
        encrypted: event.gmailCredential.encryptedRefreshToken,
        iv: event.gmailCredential.refreshTokenIV,
        authTag: event.gmailCredential.refreshTokenAuthTag,
      });

      // Revoke token at Google (best effort)
      const revokeResponse = await fetch(
        `https://oauth2.googleapis.com/revoke?token=${refreshToken}`,
        { method: "POST" }
      );

      if (!revokeResponse.ok) {
        logWarn("Token revocation at Google failed", {
          eventId: event.id,
          status: revokeResponse.status,
        });
      }
    } catch (revokeError) {
      // Log but don't fail - token might already be invalid
      logWarn("Token revocation failed", {
        eventId: event.id,
        error: revokeError instanceof Error ? revokeError.message : "Unknown",
      });
    }

    // Soft-delete for audit trail
    await prisma.gmailCredential.update({
      where: { id: event.gmailCredential.id },
      data: { revokedAt: new Date() },
    });

    logInfo("Gmail disconnected", {
      eventId: event.id,
      gmailAddress: event.gmailCredential.gmailAddress,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logError("Failed to disconnect Gmail", error, {
      endpoint: "POST /api/auth/gmail/disconnect",
    });
    return NextResponse.json(
      { error: "Failed to disconnect Gmail" },
      { status: 500 }
    );
  }
}
