import { prisma } from "@/lib/db";
import { encryptToken, decryptToken } from "@/lib/encryption";
import { serverEnv } from "@/lib/env";
import { logError, logInfo, logWarn } from "@/lib/logger";

/** Refresh tokens this many milliseconds before expiry */
const TOKEN_REFRESH_BUFFER_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Error thrown when Gmail access has been revoked
 */
export class GmailTokenRevokedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GmailTokenRevokedError";
  }
}

/**
 * Error thrown when Gmail is not connected for an event
 */
export class GmailNotConnectedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GmailNotConnectedError";
  }
}

interface GmailCredential {
  id: string;
  eventId: string;
  encryptedAccessToken: string;
  encryptedRefreshToken: string;
  tokenIV: string;
  tokenAuthTag: string;
  refreshTokenIV: string;
  refreshTokenAuthTag: string;
  gmailAddress: string;
  tokenExpiresAt: Date;
  revokedAt: Date | null;
}

/**
 * Get a valid access token for an event, refreshing if necessary
 * Throws GmailNotConnectedError if Gmail isn't connected
 * Throws GmailTokenRevokedError if the token has been revoked
 */
export async function getValidAccessToken(eventId: string): Promise<{
  accessToken: string;
  gmailAddress: string;
}> {
  const credential = await prisma.gmailCredential.findUnique({
    where: { eventId },
  });

  if (!credential) {
    throw new GmailNotConnectedError(
      "Gmail is not connected for this event. Please connect your Gmail account first."
    );
  }

  if (credential.revokedAt) {
    throw new GmailTokenRevokedError(
      "Gmail access was revoked. Please reconnect your Gmail account."
    );
  }

  // Check if token expires within buffer period
  const expiresIn = credential.tokenExpiresAt.getTime() - Date.now();

  if (expiresIn < TOKEN_REFRESH_BUFFER_MS) {
    logInfo("Refreshing Gmail access token", { eventId });
    await refreshAccessToken(credential);

    // Re-fetch the updated credential
    const updated = await prisma.gmailCredential.findUnique({
      where: { id: credential.id },
    });

    if (!updated) {
      throw new GmailNotConnectedError("Gmail credential disappeared during refresh");
    }

    return {
      accessToken: decryptAccessToken(updated),
      gmailAddress: updated.gmailAddress,
    };
  }

  return {
    accessToken: decryptAccessToken(credential),
    gmailAddress: credential.gmailAddress,
  };
}

/**
 * Decrypt the access token from a credential
 */
function decryptAccessToken(credential: GmailCredential): string {
  return decryptToken({
    encrypted: credential.encryptedAccessToken,
    iv: credential.tokenIV,
    authTag: credential.tokenAuthTag,
  });
}

/**
 * Refresh the access token using the refresh token
 */
async function refreshAccessToken(credential: GmailCredential): Promise<void> {
  // Decrypt refresh token
  const refreshToken = decryptToken({
    encrypted: credential.encryptedRefreshToken,
    iv: credential.refreshTokenIV,
    authTag: credential.refreshTokenAuthTag,
  });

  // Exchange refresh token for new access token
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: serverEnv.GOOGLE_CLIENT_ID,
      client_secret: serverEnv.GOOGLE_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();

    // Check for revoked token
    if (
      errorData.error === "invalid_grant" ||
      errorData.error_description?.includes("revoked")
    ) {
      // Mark as revoked in database
      await prisma.gmailCredential.update({
        where: { id: credential.id },
        data: { revokedAt: new Date() },
      });

      logWarn("Gmail token was revoked", {
        eventId: credential.eventId,
        error: errorData.error,
      });

      throw new GmailTokenRevokedError(
        "Gmail access was revoked. Please reconnect your Gmail account."
      );
    }

    logError("Token refresh failed", new Error(errorData.error), {
      eventId: credential.eventId,
      errorDescription: errorData.error_description,
    });

    throw new Error(`Token refresh failed: ${errorData.error}`);
  }

  const tokens = await response.json();

  // Encrypt new access token
  const encryptedAccess = encryptToken(tokens.access_token);

  // Prepare update data
  const updateData: {
    encryptedAccessToken: string;
    tokenIV: string;
    tokenAuthTag: string;
    tokenExpiresAt: Date;
    encryptedRefreshToken?: string;
    refreshTokenIV?: string;
    refreshTokenAuthTag?: string;
  } = {
    encryptedAccessToken: encryptedAccess.encrypted,
    tokenIV: encryptedAccess.iv,
    tokenAuthTag: encryptedAccess.authTag,
    tokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
  };

  // Handle refresh token rotation (Google may issue a new refresh token)
  if (tokens.refresh_token) {
    const encryptedRefresh = encryptToken(tokens.refresh_token);
    updateData.encryptedRefreshToken = encryptedRefresh.encrypted;
    updateData.refreshTokenIV = encryptedRefresh.iv;
    updateData.refreshTokenAuthTag = encryptedRefresh.authTag;
  }

  await prisma.gmailCredential.update({
    where: { id: credential.id },
    data: updateData,
  });

  logInfo("Gmail access token refreshed", { eventId: credential.eventId });
}

/**
 * Check if Gmail is connected for an event
 */
export async function isGmailConnected(eventId: string): Promise<boolean> {
  const credential = await prisma.gmailCredential.findUnique({
    where: { eventId },
    select: { revokedAt: true },
  });

  return credential !== null && credential.revokedAt === null;
}
