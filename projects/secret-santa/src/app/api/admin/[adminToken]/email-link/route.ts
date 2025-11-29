import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendAdminLinkEmail } from "@/lib/email";
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
      select: { name: true },
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const adminLink = `${appUrl}/admin/${adminToken}`;

    const result = await sendAdminLinkEmail({
      to: email.trim(),
      eventName: event.name,
      adminLink,
    });

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
    logError("Error sending admin link email", error, { endpoint: "POST /api/admin/[adminToken]/email-link" });
    return NextResponse.json(
      { error: "Failed to send email" },
      { status: 500 }
    );
  }
}
