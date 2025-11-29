import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  encryptToken,
  generateSecureRandom,
  generateCodeChallenge,
} from "@/lib/encryption";
import { logError } from "@/lib/logger";

/**
 * POST /api/auth/gmail/connect
 * Initiates Gmail OAuth flow with PKCE
 * Returns the Google OAuth URL for the frontend to redirect to
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { adminToken } = body;

    // Validate adminToken
    if (!adminToken) {
      return NextResponse.json(
        { error: "Admin token required" },
        { status: 401 }
      );
    }

    // Find the event
    const event = await prisma.event.findUnique({
      where: { adminToken },
      select: { id: true },
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Generate cryptographic state (CSRF protection)
    const state = generateSecureRandom(32);

    // Generate PKCE code_verifier and code_challenge
    const codeVerifier = generateSecureRandom(64);
    const codeChallenge = generateCodeChallenge(codeVerifier);

    // Encrypt code_verifier before storing
    const encryptedVerifier = encryptToken(codeVerifier);

    // Store state in database with 10-minute expiration
    await prisma.oAuthState.create({
      data: {
        state,
        eventId: event.id,
        adminToken,
        codeVerifier: encryptedVerifier.encrypted,
        verifierIV: encryptedVerifier.iv,
        verifierAuthTag: encryptedVerifier.authTag,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
      },
    });

    // Build Google OAuth URL
    const params = new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      redirect_uri: process.env.GOOGLE_REDIRECT_URI!,
      response_type: "code",
      scope: "https://www.googleapis.com/auth/gmail.send email",
      state,
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
      access_type: "offline", // Request refresh token
      prompt: "consent", // Always show consent screen to get refresh token
    });

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;

    return NextResponse.json({ authUrl });
  } catch (error) {
    logError("Failed to initiate Gmail OAuth", error, {
      endpoint: "POST /api/auth/gmail/connect",
    });
    return NextResponse.json(
      { error: "Failed to initiate Gmail connection" },
      { status: 500 }
    );
  }
}
