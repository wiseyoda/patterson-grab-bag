import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  sendAdminLinkEmailViaGmail,
  GmailNotConnectedError,
  GmailTokenRevokedError,
} from "@/lib/gmail-send";
import { logError } from "@/lib/logger";

interface RouteParams {
  params: Promise<{ adminToken: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { adminToken } = await params;
    const body = await request.json();
    const { email } = body;

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || typeof email !== "string" || !emailRegex.test(email.trim())) {
      return NextResponse.json(
        { error: "Please enter a valid email address" },
        { status: 400 }
      );
    }

    const event = await prisma.event.findUnique({
      where: { adminToken },
      include: {
        gmailCredential: true,
      },
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Check if Gmail is connected
    if (!event.gmailCredential || event.gmailCredential.revokedAt) {
      return NextResponse.json(
        {
          error:
            "Gmail is not connected. Please connect your Gmail account to send emails.",
        },
        { status: 400 }
      );
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const adminLink = `${appUrl}/admin/${adminToken}`;

    const result = await sendAdminLinkEmailViaGmail(
      event.id,
      email.trim(),
      event.name,
      adminLink
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to send email" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Admin link sent to your email",
    });
  } catch (error) {
    // Handle Gmail-specific errors
    if (error instanceof GmailNotConnectedError) {
      return NextResponse.json(
        { error: "Gmail is not connected. Please connect your Gmail account." },
        { status: 400 }
      );
    }
    if (error instanceof GmailTokenRevokedError) {
      return NextResponse.json(
        { error: "Gmail access was revoked. Please reconnect your Gmail account." },
        { status: 400 }
      );
    }

    logError("Error sending admin link email", error, { endpoint: "POST /api/admin/[adminToken]/email-link" });
    return NextResponse.json(
      { error: "Failed to send email" },
      { status: 500 }
    );
  }
}
