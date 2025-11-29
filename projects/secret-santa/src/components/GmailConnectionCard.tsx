"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface GmailStatus {
  connected: boolean;
  email: string | null;
  expired: boolean;
}

interface GmailConnectionCardProps {
  adminToken: string;
  onStatusChange?: () => void;
  initialStatus?: GmailStatus | null;
}

export function GmailConnectionCard({
  adminToken,
  onStatusChange,
  initialStatus,
}: GmailConnectionCardProps) {
  const [status, setStatus] = useState<GmailStatus>(
    initialStatus || { connected: false, email: null, expired: false }
  );
  const [loading, setLoading] = useState(!initialStatus);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [showDisconnectModal, setShowDisconnectModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const response = await fetch(`/api/admin/${adminToken}/gmail/status`);
      if (response.ok) {
        const data = await response.json();
        setStatus(data);
      }
    } catch {
      // Status check failed silently - user can still try to connect
    } finally {
      setLoading(false);
    }
  }, [adminToken]);

  useEffect(() => {
    if (!initialStatus) {
      fetchStatus();
    }
  }, [fetchStatus, initialStatus]);

  async function handleConnect() {
    setConnecting(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/gmail/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminToken }),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || "Failed to initiate connection");
      }

      const { authUrl } = await response.json();

      // Redirect to Google OAuth
      window.location.href = authUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to connect");
      setConnecting(false);
    }
  }

  async function handleDisconnect() {
    setDisconnecting(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/gmail/disconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminToken }),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || "Failed to disconnect");
      }

      setStatus({ connected: false, email: null, expired: false });
      setShowDisconnectModal(false);
      onStatusChange?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to disconnect");
    } finally {
      setDisconnecting(false);
    }
  }

  if (loading) {
    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Email Settings</CardTitle>
          <CardDescription>Loading...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  // Expired state
  if (status.connected && status.expired) {
    return (
      <Card className="mb-6 border-amber-300 bg-amber-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Email Settings
            <span className="text-amber-600 text-sm font-normal">
              Reconnection required
            </span>
          </CardTitle>
          <CardDescription>
            Your Gmail connection has expired
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-amber-700">
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <span>Connection expired for {status.email}</span>
            </div>
            <p className="text-sm text-amber-700">
              Please reconnect your Gmail to continue sending emails.
            </p>
            {error && <p className="text-red-600 text-sm">{error}</p>}
            <Button onClick={handleConnect} disabled={connecting}>
              {connecting ? "Connecting..." : "Reconnect Gmail"}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Connected state
  if (status.connected) {
    return (
      <>
        <Card className="mb-6 border-green-300 bg-green-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Email Settings
              <span className="inline-flex items-center gap-1 text-green-600 text-sm font-normal">
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                Connected
              </span>
            </CardTitle>
            <CardDescription>
              Invitations will be sent from your Gmail
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-green-700">
                <svg
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
                <span className="font-medium">{status.email}</span>
              </div>
              <p className="text-sm text-green-700">
                Emails will be sent from this address.
              </p>
              {error && <p className="text-red-600 text-sm">{error}</p>}
              <Button
                variant="outline"
                onClick={() => setShowDisconnectModal(true)}
                className="bg-white"
              >
                Disconnect Gmail
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Disconnect Confirmation Modal */}
        <Dialog open={showDisconnectModal} onOpenChange={setShowDisconnectModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Disconnect Gmail?</DialogTitle>
              <DialogDescription>
                You won&apos;t be able to send emails until you connect again.
                Participants who haven&apos;t received their invitation will need to
                be sent links manually.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowDisconnectModal(false)}
                disabled={disconnecting}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDisconnect}
                disabled={disconnecting}
              >
                {disconnecting ? "Disconnecting..." : "Disconnect"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // Not connected state (default)
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Email Settings</CardTitle>
        <CardDescription>
          Send invitations from your personal Gmail account
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-gray-600">
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
            <span>No Gmail account connected</span>
          </div>
          <p className="text-sm text-gray-600">
            Connect your Gmail to send invitation emails to participants. Emails
            will appear to come from your address, not a generic &quot;no-reply&quot;
            address.
          </p>
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <Button onClick={handleConnect} disabled={connecting}>
            {connecting ? "Connecting..." : "Connect Gmail"}
          </Button>
          <p className="text-xs text-gray-500 flex items-center gap-1">
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
            Your Gmail credentials are encrypted and only used to send emails for
            this event.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
