import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { encryptToken, decryptToken } from "@/lib/encryption";
import { logError, logInfo } from "@/lib/logger";

/**
 * GET /api/auth/gmail/callback
 * Handles the OAuth callback from Google
 * Exchanges authorization code for tokens and stores them encrypted
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");
  const grantedScopes = searchParams.get("scope");

  // Handle user denial
  if (error) {
    logInfo("Gmail OAuth denied by user", { error });
    return redirectToAdmin(null, `Gmail connection was cancelled`);
  }

  // Validate required parameters
  if (!code || !state) {
    return redirectToAdmin(null, "Missing OAuth parameters");
  }

  // Validate that gmail.send scope was granted
  if (!grantedScopes || !grantedScopes.includes("gmail.send")) {
    logError("Gmail scope not granted", new Error("Missing gmail.send scope"), {
      grantedScopes,
    });
    return redirectToAdmin(
      null,
      "Gmail send permission was not granted. Please ensure you check all permission boxes during authorization."
    );
  }

  try {
    // Look up state record
    const oauthState = await prisma.oAuthState.findUnique({
      where: { state },
    });

    if (!oauthState) {
      return redirectToAdmin(null, "Invalid or expired OAuth session");
    }

    // Verify not expired
    if (new Date() > oauthState.expiresAt) {
      await prisma.oAuthState.delete({ where: { id: oauthState.id } });
      return redirectToAdmin(null, "OAuth session expired. Please try again.");
    }

    // Verify not already used (replay attack prevention)
    if (oauthState.usedAt) {
      return redirectToAdmin(null, "OAuth session already used");
    }

    // Mark as used IMMEDIATELY to prevent race conditions
    await prisma.oAuthState.update({
      where: { id: oauthState.id },
      data: { usedAt: new Date() },
    });

    // Verify the event still exists
    const event = await prisma.event.findUnique({
      where: { adminToken: oauthState.adminToken },
      select: { id: true, adminToken: true },
    });

    if (!event) {
      return redirectToAdmin(null, "Event no longer exists");
    }

    // Decrypt code_verifier
    const codeVerifier = decryptToken({
      encrypted: oauthState.codeVerifier,
      iv: oauthState.verifierIV,
      authTag: oauthState.verifierAuthTag,
    });

    // Exchange authorization code for tokens
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        code,
        code_verifier: codeVerifier,
        grant_type: "authorization_code",
        redirect_uri: process.env.GOOGLE_REDIRECT_URI!,
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json();
      logError("Token exchange failed", new Error(errorData.error), {
        endpoint: "GET /api/auth/gmail/callback",
        errorDescription: errorData.error_description,
      });
      return redirectToAdmin(
        oauthState.adminToken,
        "Failed to exchange authorization code"
      );
    }

    const tokens = await tokenResponse.json();

    // Verify we got required tokens
    if (!tokens.access_token) {
      return redirectToAdmin(oauthState.adminToken, "No access token received");
    }

    // Google may not return refresh_token on subsequent authorizations
    if (!tokens.refresh_token) {
      return redirectToAdmin(
        oauthState.adminToken,
        "No refresh token received. Please revoke app access in your Google account settings and try again."
      );
    }

    // Get user's Gmail address
    const userInfoResponse = await fetch(
      "https://www.googleapis.com/oauth2/v2/userinfo",
      {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      }
    );

    if (!userInfoResponse.ok) {
      return redirectToAdmin(
        oauthState.adminToken,
        "Failed to get Gmail address"
      );
    }

    const userInfo = await userInfoResponse.json();
    const gmailAddress = userInfo.email;

    // Encrypt tokens
    const encryptedAccess = encryptToken(tokens.access_token);
    const encryptedRefresh = encryptToken(tokens.refresh_token);

    // Store in GmailCredential (upsert in case reconnecting)
    await prisma.gmailCredential.upsert({
      where: { eventId: event.id },
      create: {
        eventId: event.id,
        encryptedAccessToken: encryptedAccess.encrypted,
        encryptedRefreshToken: encryptedRefresh.encrypted,
        tokenIV: encryptedAccess.iv,
        tokenAuthTag: encryptedAccess.authTag,
        refreshTokenIV: encryptedRefresh.iv,
        refreshTokenAuthTag: encryptedRefresh.authTag,
        gmailAddress,
        tokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
        connectedAt: new Date(),
      },
      update: {
        encryptedAccessToken: encryptedAccess.encrypted,
        encryptedRefreshToken: encryptedRefresh.encrypted,
        tokenIV: encryptedAccess.iv,
        tokenAuthTag: encryptedAccess.authTag,
        refreshTokenIV: encryptedRefresh.iv,
        refreshTokenAuthTag: encryptedRefresh.authTag,
        gmailAddress,
        tokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
        revokedAt: null, // Clear revoked status if reconnecting
      },
    });

    // Delete OAuthState record (cleanup)
    await prisma.oAuthState.delete({ where: { id: oauthState.id } });

    logInfo("Gmail OAuth connected successfully", {
      eventId: event.id,
      gmailAddress,
    });

    // Redirect to admin with success
    return redirectToAdmin(oauthState.adminToken, null, true);
  } catch (error) {
    logError("Gmail OAuth callback error", error, {
      endpoint: "GET /api/auth/gmail/callback",
    });
    return redirectToAdmin(null, "OAuth callback failed");
  }
}

function redirectToAdmin(
  adminToken: string | null,
  error: string | null,
  success: boolean = false
): NextResponse {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  if (!adminToken) {
    // Can't redirect to admin, go to home with error
    const url = new URL("/", baseUrl);
    if (error) url.searchParams.set("error", error);
    return NextResponse.redirect(url);
  }

  const url = new URL(`/admin/${adminToken}`, baseUrl);
  if (error) url.searchParams.set("gmail_error", error);
  if (success) url.searchParams.set("gmail_connected", "true");

  return NextResponse.redirect(url);
}
