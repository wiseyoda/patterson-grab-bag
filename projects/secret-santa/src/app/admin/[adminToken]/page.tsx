"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Participant {
  id: string;
  name: string;
  email: string | null;
  accessToken: string;
  hasAssignment: boolean;
  notificationStatus: "NOT_SENT" | "SENT" | "VIEWED";
  notifiedAt: string | null;
  viewedAt: string | null;
}

interface Event {
  id: string;
  name: string;
  budget: string | null;
  eventDate: string | null;
  rules: string | null;
  isLocked: boolean;
  participants: Participant[];
}

interface RegenerationStatus {
  hasAssignments: boolean;
  totalParticipants: number;
  viewedCount: number;
  unviewedCount: number;
  viewedParticipants: { id: string; name: string }[];
  unviewedParticipants: { id: string; name: string }[];
  canRegenerate: boolean;
  isFullRegeneration: boolean;
  reason?: string;
}

export default function AdminPage() {
  const params = useParams();
  const router = useRouter();
  const adminToken = params.adminToken as string;

  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form state for adding participants
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");

  // Email admin link modal state
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");
  const [adminEmailError, setAdminEmailError] = useState<string | null>(null);
  const [adminEmailSending, setAdminEmailSending] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [copiedParticipantId, setCopiedParticipantId] = useState<string | null>(null);

  // Delete event modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteConfirmStep, setDeleteConfirmStep] = useState(1);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Confirmation modal state (for remove participant, generate assignments, send emails)
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean;
    title: string;
    message: string | React.ReactNode;
    action: () => Promise<void>;
    actionLabel: string;
    variant?: "default" | "destructive";
    requireDoubleConfirm?: boolean;
  }>({
    open: false,
    title: "",
    message: "",
    action: async () => {},
    actionLabel: "",
    variant: "default",
    requireDoubleConfirm: false,
  });
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [confirmStep, setConfirmStep] = useState(1);

  // Regeneration status state
  const [_regenStatus, setRegenStatus] = useState<RegenerationStatus | null>(null);
  const [regenLoading, setRegenLoading] = useState(false);

  // Edit event details state
  const [isEditingEvent, setIsEditingEvent] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editBudget, setEditBudget] = useState("");
  const [editRules, setEditRules] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  const fetchEvent = useCallback(async () => {
    try {
      const response = await fetch(`/api/admin/${adminToken}`);
      if (!response.ok) {
        throw new Error("Event not found");
      }
      const data = await response.json();
      setEvent(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load event");
    } finally {
      setLoading(false);
    }
  }, [adminToken]);

  useEffect(() => {
    fetchEvent();
  }, [fetchEvent]);

  async function addParticipant(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;

    setActionLoading("add");
    try {
      const response = await fetch(`/api/admin/${adminToken}/participants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim(), email: newEmail.trim() || null }),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error);
      }

      setNewName("");
      setNewEmail("");
      fetchEvent();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to add participant");
    } finally {
      setActionLoading(null);
    }
  }

  function showConfirmModal(
    title: string,
    message: string | React.ReactNode,
    actionLabel: string,
    action: () => Promise<void>,
    variant: "default" | "destructive" = "default",
    requireDoubleConfirm: boolean = false
  ) {
    setConfirmStep(1);
    setConfirmModal({
      open: true,
      title,
      message,
      action,
      actionLabel,
      variant,
      requireDoubleConfirm,
    });
  }

  function closeConfirmModal() {
    setConfirmModal((prev) => ({ ...prev, open: false }));
    setConfirmLoading(false);
    setConfirmStep(1);
  }

  async function executeConfirmedAction() {
    // If double confirmation is required and we're on step 1, advance to step 2
    if (confirmModal.requireDoubleConfirm && confirmStep === 1) {
      setConfirmStep(2);
      return;
    }

    setConfirmLoading(true);
    try {
      await confirmModal.action();
    } finally {
      closeConfirmModal();
    }
  }

  function confirmRemoveParticipant(participantId: string, participantName: string) {
    showConfirmModal(
      "Remove Participant",
      `Are you sure you want to remove ${participantName} from the gift exchange?`,
      "Remove",
      async () => {
        setActionLoading(participantId);
        try {
          const response = await fetch(
            `/api/admin/${adminToken}/participants/${participantId}`,
            { method: "DELETE" }
          );

          if (!response.ok) {
            const result = await response.json();
            throw new Error(result.error);
          }

          fetchEvent();
        } catch (err) {
          setSuccessMessage(null);
          setTimeout(() => {
            alert(err instanceof Error ? err.message : "Failed to remove participant");
          }, 100);
        } finally {
          setActionLoading(null);
        }
      },
      "destructive"
    );
  }

  async function confirmGenerateAssignments() {
    // First fetch the current regeneration status
    setRegenLoading(true);
    try {
      const response = await fetch(`/api/admin/${adminToken}/randomize`);
      if (!response.ok) {
        throw new Error("Failed to check regeneration status");
      }
      const status: RegenerationStatus = await response.json();
      setRegenStatus(status);

      // If can't regenerate, show error message
      if (!status.canRegenerate) {
        showConfirmModal(
          "Cannot Generate Assignments",
          (
            <div className="space-y-3">
              <p className="text-red-600 font-medium">{status.reason}</p>
              {status.viewedCount > 0 && (
                <div className="bg-red-50 p-3 rounded-md">
                  <p className="text-sm font-medium text-red-800 mb-2">
                    Participants who have viewed their assignments:
                  </p>
                  <ul className="text-sm text-red-700 list-disc list-inside">
                    {status.viewedParticipants.map(p => (
                      <li key={p.id}>{p.name}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ),
          "OK",
          async () => {},
          "default",
          false
        );
        return;
      }

      // Build appropriate warning message
      const isRegeneration = status.hasAssignments;
      const title = isRegeneration ? "Regenerate Assignments" : "Generate Assignments";

      let warningMessage: React.ReactNode;

      if (!isRegeneration) {
        // First-time generation
        warningMessage = (
          <div className="space-y-4">
            <p>This will randomly assign each participant to another person.</p>
            <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-md">
              <p className="font-medium text-yellow-800 mb-2">⚠️ Important Warning</p>
              <ul className="text-sm text-yellow-700 space-y-2">
                <li>• Once a participant <strong>views</strong> their assignment, they will be <strong>locked</strong> and cannot be reassigned.</li>
                <li>• You can only regenerate assignments if at least <strong>3 participants</strong> haven&apos;t viewed theirs yet.</li>
                <li>• If too many people view their assignments, you won&apos;t be able to make changes.</li>
              </ul>
            </div>
            <p className="text-sm text-gray-600">
              Make sure you have all participants added before generating assignments.
            </p>
          </div>
        );
      } else if (status.isFullRegeneration) {
        // Full regeneration (no one has viewed)
        warningMessage = (
          <div className="space-y-4">
            <p>No one has viewed their assignment yet. You can fully regenerate all assignments.</p>
            <div className="bg-blue-50 border border-blue-200 p-4 rounded-md">
              <p className="font-medium text-blue-800 mb-2">ℹ️ Full Regeneration</p>
              <p className="text-sm text-blue-700">
                All {status.totalParticipants} participants will receive new random assignments.
              </p>
            </div>
          </div>
        );
      } else {
        // Partial regeneration
        warningMessage = (
          <div className="space-y-4">
            <div className="bg-amber-50 border border-amber-200 p-4 rounded-md">
              <p className="font-medium text-amber-800 mb-2">⚠️ Partial Regeneration</p>
              <p className="text-sm text-amber-700 mb-3">
                {status.viewedCount} participant(s) have already viewed their assignments and will keep them.
                Only the remaining {status.unviewedCount} participant(s) will be reassigned among themselves.
              </p>

              {status.viewedParticipants.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs font-medium text-amber-800 mb-1">Locked participants (viewed):</p>
                  <div className="flex flex-wrap gap-1">
                    {status.viewedParticipants.map(p => (
                      <span key={p.id} className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded">
                        {p.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {status.unviewedParticipants.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs font-medium text-amber-800 mb-1">Will be reassigned:</p>
                  <div className="flex flex-wrap gap-1">
                    {status.unviewedParticipants.map(p => (
                      <span key={p.id} className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">
                        {p.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      }

      showConfirmModal(
        title,
        warningMessage,
        isRegeneration ? "Regenerate Assignments" : "Generate Assignments",
        async () => {
          setActionLoading("randomize");
          setSuccessMessage(null);
          try {
            const response = await fetch(`/api/admin/${adminToken}/randomize`, {
              method: "POST",
            });

            if (!response.ok) {
              const result = await response.json();
              throw new Error(result.error);
            }

            const result = await response.json();
            if (result.isPartialRegeneration) {
              setSuccessMessage(result.message);
            } else {
              setSuccessMessage(`Assignments generated successfully for ${result.participantCount} participants!`);
            }
            fetchEvent();
          } catch (err) {
            setTimeout(() => {
              alert(err instanceof Error ? err.message : "Failed to generate assignments");
            }, 100);
          } finally {
            setActionLoading(null);
          }
        },
        "default",
        true // Require double confirmation
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to check regeneration status");
    } finally {
      setRegenLoading(false);
    }
  }

  function confirmSendAllEmails() {
    showConfirmModal(
      "Send All Emails",
      "This will send invitation emails to all participants who have an email address and haven't been notified yet.",
      "Send Emails",
      async () => {
        setActionLoading("notify");
        try {
          const response = await fetch(`/api/admin/${adminToken}/notify`, {
            method: "POST",
          });

          if (!response.ok) {
            const result = await response.json();
            throw new Error(result.error);
          }

          const result = await response.json();
          setSuccessMessage(`Sent ${result.sent} emails successfully.${result.failed > 0 ? ` ${result.failed} failed.` : ""}`);
          fetchEvent();
        } catch (err) {
          setTimeout(() => {
            alert(err instanceof Error ? err.message : "Failed to send emails");
          }, 100);
        } finally {
          setActionLoading(null);
        }
      }
    );
  }

  async function resendEmail(participantId: string) {
    setActionLoading(participantId);
    try {
      const response = await fetch(
        `/api/admin/${adminToken}/resend/${participantId}`,
        { method: "POST" }
      );

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error);
      }

      alert("Email sent!");
      fetchEvent();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to send email");
    } finally {
      setActionLoading(null);
    }
  }

  async function copyToClipboard(text: string): Promise<boolean> {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fallback for older browsers or non-secure contexts
      try {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        textArea.style.top = "-999999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        const successful = document.execCommand("copy");
        document.body.removeChild(textArea);
        return successful;
      } catch {
        return false;
      }
    }
  }

  async function copyLink(accessToken: string, participantId: string) {
    const url = `${window.location.origin}/reveal/${accessToken}`;
    const success = await copyToClipboard(url);
    if (success) {
      setCopiedParticipantId(participantId);
      setTimeout(() => setCopiedParticipantId(null), 2000);
    } else {
      // Only use alert as fallback if copy truly failed
      prompt("Copy this link:", url);
    }
  }

  async function copyAdminLink() {
    const url = window.location.href;
    const success = await copyToClipboard(url);
    if (success) {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } else {
      alert("Failed to copy link. Please copy manually from your browser's address bar.");
    }
  }

  function validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  }

  async function sendAdminLinkEmail(e: React.FormEvent) {
    e.preventDefault();
    setAdminEmailError(null);

    const trimmedEmail = adminEmail.trim();
    if (!trimmedEmail) {
      setAdminEmailError("Email address is required");
      return;
    }

    if (!validateEmail(trimmedEmail)) {
      setAdminEmailError("Please enter a valid email address");
      return;
    }

    setAdminEmailSending(true);
    try {
      const response = await fetch(`/api/admin/${adminToken}/email-link`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmedEmail }),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || "Failed to send email");
      }

      setEmailModalOpen(false);
      setAdminEmail("");
      setSuccessMessage("Admin link sent to your email!");
    } catch (err) {
      setAdminEmailError(err instanceof Error ? err.message : "Failed to send email");
    } finally {
      setAdminEmailSending(false);
    }
  }

  function openDeleteModal() {
    setDeleteModalOpen(true);
    setDeleteConfirmStep(1);
    setDeleteConfirmText("");
  }

  function closeDeleteModal() {
    setDeleteModalOpen(false);
    setDeleteConfirmStep(1);
    setDeleteConfirmText("");
  }

  async function deleteEvent() {
    if (!event) return;

    setDeleteLoading(true);
    try {
      const response = await fetch(`/api/admin/${adminToken}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || "Failed to delete event");
      }

      // Redirect to home page
      router.push("/");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete event");
      setDeleteLoading(false);
    }
  }

  function startEditingEvent() {
    if (!event) return;
    setEditName(event.name);
    setEditDate(event.eventDate || ""); // Already stored as YYYY-MM-DD string
    setEditBudget(event.budget || "");
    setEditRules(event.rules || "");
    setIsEditingEvent(true);
  }

  function cancelEditingEvent() {
    setIsEditingEvent(false);
    setEditName("");
    setEditDate("");
    setEditBudget("");
    setEditRules("");
  }

  async function saveEventDetails() {
    if (!editName.trim()) {
      alert("Event name is required");
      return;
    }

    setEditSaving(true);
    try {
      const response = await fetch(`/api/admin/${adminToken}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName.trim(),
          eventDate: editDate || null,
          budget: editBudget.trim() || null,
          rules: editRules.trim() || null,
        }),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || "Failed to update event");
      }

      setIsEditingEvent(false);
      setSuccessMessage("Event details updated successfully!");
      fetchEvent();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update event");
    } finally {
      setEditSaving(false);
    }
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case "VIEWED":
        return <Badge className="bg-green-500">Viewed</Badge>;
      case "SENT":
        return <Badge className="bg-blue-500">Sent</Badge>;
      default:
        return <Badge variant="secondary">Not Sent</Badge>;
    }
  }

  if (loading) {
    return (
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <p className="text-center">Loading...</p>
      </main>
    );
  }

  if (error || !event) {
    return (
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <Card>
          <CardContent className="pt-6">
            <p className="text-red-600 text-center">{error || "Event not found"}</p>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-red-700 mb-2">{event.name}</h1>
        <p className="text-gray-600">Admin Dashboard</p>
      </div>

      {/* Event Details */}
      <Card className="mb-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Event Details</CardTitle>
          {!isEditingEvent && !event.isLocked && (
            <Button variant="outline" size="sm" onClick={startEditingEvent}>
              Edit
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {isEditingEvent ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="editName">Event Name *</Label>
                <Input
                  id="editName"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Event name"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editDate">Event Date</Label>
                <Input
                  id="editDate"
                  type="date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editBudget">Budget</Label>
                <Input
                  id="editBudget"
                  value={editBudget}
                  onChange={(e) => setEditBudget(e.target.value)}
                  placeholder="$25"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editRules">Rules & Guidelines</Label>
                <Textarea
                  id="editRules"
                  value={editRules}
                  onChange={(e) => setEditRules(e.target.value)}
                  rows={5}
                />
              </div>
              <div className="flex gap-2 pt-2">
                <Button onClick={saveEventDetails} disabled={editSaving}>
                  {editSaving ? "Saving..." : "Save Changes"}
                </Button>
                <Button variant="outline" onClick={cancelEditingEvent} disabled={editSaving}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {event.eventDate && (
                <p><strong>Date:</strong> {new Date(event.eventDate + "T12:00:00").toLocaleDateString()}</p>
              )}
              {event.budget && <p><strong>Budget:</strong> {event.budget}</p>}
              {event.rules && (
                <div>
                  <strong>Rules:</strong>
                  <p className="mt-1 text-gray-600 whitespace-pre-wrap">{event.rules}</p>
                </div>
              )}
              <p>
                <strong>Status:</strong>{" "}
                {event.isLocked ? (
                  <Badge className="bg-green-500">Assignments Generated</Badge>
                ) : (
                  <Badge variant="secondary">Pending Assignment</Badge>
                )}
              </p>
              {event.isLocked && (
                <p className="text-sm text-gray-500 mt-2">
                  Event details cannot be edited after assignments are generated.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Success Message */}
      {successMessage && (
        <Card className="mb-6 border-green-300 bg-green-50">
          <CardContent className="pt-6">
            <p className="text-green-800 text-sm font-medium">{successMessage}</p>
          </CardContent>
        </Card>
      )}

      {/* Admin Link Warning */}
      <Card className="mb-6 border-yellow-300 bg-yellow-50">
        <CardContent className="pt-6">
          <p className="text-yellow-800 text-sm mb-4">
            <strong>Save this link!</strong> This is your only way to access this admin dashboard.
          </p>
          <div className="flex gap-3 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={copyAdminLink}
              className="bg-white"
            >
              {linkCopied ? "Copied!" : "Copy Link"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEmailModalOpen(true)}
              className="bg-white"
            >
              Email Link to Myself
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Email Admin Link Modal */}
      <Dialog open={emailModalOpen} onOpenChange={setEmailModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Email Admin Link</DialogTitle>
            <DialogDescription>
              Send the admin dashboard link to your email for safekeeping.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={sendAdminLinkEmail}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="adminEmail">Email Address</Label>
                <Input
                  id="adminEmail"
                  type="email"
                  placeholder="you@example.com"
                  value={adminEmail}
                  onChange={(e) => {
                    setAdminEmail(e.target.value);
                    setAdminEmailError(null);
                  }}
                  autoComplete="email"
                  autoFocus
                />
                {adminEmailError && (
                  <p className="text-red-600 text-sm">{adminEmailError}</p>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setEmailModalOpen(false);
                  setAdminEmail("");
                  setAdminEmailError(null);
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={adminEmailSending}>
                {adminEmailSending ? "Sending..." : "Send Email"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Participant Form */}
      {!event.isLocked && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Add Participant</CardTitle>
            <CardDescription>Add people to your gift exchange</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={addParticipant} className="flex gap-4 flex-wrap">
              <div className="flex-1 min-w-[200px]">
                <Label htmlFor="newName">Name *</Label>
                <Input
                  id="newName"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="John Doe"
                  required
                />
              </div>
              <div className="flex-1 min-w-[200px]">
                <Label htmlFor="newEmail">Email (optional)</Label>
                <Input
                  id="newEmail"
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="john@example.com"
                />
              </div>
              <div className="flex items-end">
                <Button type="submit" disabled={actionLoading === "add"}>
                  {actionLoading === "add" ? "Adding..." : "Add"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Participants Table */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Participants ({event.participants.length})</CardTitle>
          <CardDescription>
            {event.isLocked
              ? "View participant status"
              : "Manage participants before generating assignments"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {event.participants.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No participants yet</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Assigned</TableHead>
                  <TableHead>Notification</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {event.participants.map((participant) => (
                  <TableRow key={participant.id}>
                    <TableCell className="font-medium">{participant.name}</TableCell>
                    <TableCell>{participant.email || "-"}</TableCell>
                    <TableCell>
                      {participant.hasAssignment ? (
                        <Badge className="bg-green-500">Yes</Badge>
                      ) : (
                        <Badge variant="secondary">No</Badge>
                      )}
                    </TableCell>
                    <TableCell>{getStatusBadge(participant.notificationStatus)}</TableCell>
                    <TableCell>
                      <div className="flex gap-2 flex-wrap">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => copyLink(participant.accessToken, participant.id)}
                        >
                          {copiedParticipantId === participant.id ? "Copied!" : "Copy Link"}
                        </Button>
                        {event.isLocked && participant.email && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => resendEmail(participant.id)}
                            disabled={actionLoading === participant.id}
                          >
                            {actionLoading === participant.id ? "Sending..." : "Send Email"}
                          </Button>
                        )}
                        {!event.isLocked && (
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={() => confirmRemoveParticipant(participant.id, participant.name)}
                            disabled={actionLoading === participant.id}
                          >
                            Remove
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4 flex-wrap">
            {!event.isLocked ? (
              <Button
                type="button"
                onClick={confirmGenerateAssignments}
                disabled={event.participants.length < 3 || actionLoading === "randomize" || regenLoading}
                className="bg-green-600 hover:bg-green-700"
              >
                {regenLoading ? "Checking..." : actionLoading === "randomize" ? "Generating..." : "Generate Assignments"}
              </Button>
            ) : (
              <>
                <Button
                  type="button"
                  onClick={confirmSendAllEmails}
                  disabled={actionLoading === "notify"}
                >
                  {actionLoading === "notify" ? "Sending..." : "Send All Emails"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={confirmGenerateAssignments}
                  disabled={actionLoading === "randomize" || regenLoading}
                >
                  {regenLoading ? "Checking..." : actionLoading === "randomize" ? "Regenerating..." : "Regenerate Assignments"}
                </Button>
              </>
            )}
          </div>
          {!event.isLocked && event.participants.length < 3 && (
            <p className="text-sm text-gray-500 mt-2">
              Need at least 3 participants to generate assignments
            </p>
          )}
          {event.isLocked && (
            <p className="text-sm text-gray-500 mt-2">
              You can regenerate assignments for participants who haven&apos;t viewed their assignment yet.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="mt-8 border-red-300">
        <CardHeader>
          <CardTitle className="text-red-700">Danger Zone</CardTitle>
          <CardDescription>
            Irreversible actions that affect your entire event
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Delete this event</p>
              <p className="text-sm text-gray-500">
                Permanently delete this event and all participant data
              </p>
            </div>
            <Button type="button" variant="destructive" onClick={openDeleteModal}>
              Delete Event
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Delete Event Modal */}
      <Dialog open={deleteModalOpen} onOpenChange={(open) => !open && closeDeleteModal()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-700">
              {deleteConfirmStep === 1 ? "Delete Event?" : "Confirm Deletion"}
            </DialogTitle>
            <DialogDescription>
              {deleteConfirmStep === 1 ? (
                "This will permanently delete the event and all participant data. This action cannot be undone."
              ) : (
                <>
                  To confirm, type <strong>{event.name}</strong> below.
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          {deleteConfirmStep === 2 && (
            <div className="py-4">
              <Label htmlFor="deleteConfirm">Event name</Label>
              <Input
                id="deleteConfirm"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder={event.name}
                autoFocus
              />
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={closeDeleteModal}>
              Cancel
            </Button>
            {deleteConfirmStep === 1 ? (
              <Button
                variant="destructive"
                onClick={() => setDeleteConfirmStep(2)}
              >
                Yes, I want to delete this event
              </Button>
            ) : (
              <Button
                variant="destructive"
                onClick={deleteEvent}
                disabled={deleteConfirmText !== event.name || deleteLoading}
              >
                {deleteLoading ? "Deleting..." : "Permanently Delete"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Modal (for actions like remove, generate, send) */}
      <Dialog open={confirmModal.open} onOpenChange={(open) => !open && closeConfirmModal()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {confirmModal.requireDoubleConfirm && confirmStep === 2
                ? "Are you absolutely sure?"
                : confirmModal.title}
            </DialogTitle>
            {confirmModal.requireDoubleConfirm && confirmStep === 2 ? (
              <div className="pt-2">
                <p className="text-sm text-gray-600 mb-3">
                  Please confirm that you want to proceed with this action.
                </p>
                <div className="bg-amber-50 border border-amber-200 p-3 rounded-md">
                  <p className="text-sm text-amber-800">
                    This will change gift assignments. Make sure all participants are aware before proceeding.
                  </p>
                </div>
              </div>
            ) : (
              <div className="pt-2">
                {typeof confirmModal.message === "string" ? (
                  <p className="text-sm text-gray-600">{confirmModal.message}</p>
                ) : (
                  confirmModal.message
                )}
              </div>
            )}
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={closeConfirmModal} disabled={confirmLoading}>
              Cancel
            </Button>
            <Button
              variant={confirmModal.variant === "destructive" ? "destructive" : "default"}
              onClick={executeConfirmedAction}
              disabled={confirmLoading}
            >
              {confirmLoading
                ? "Processing..."
                : confirmModal.requireDoubleConfirm && confirmStep === 1
                  ? "Continue"
                  : confirmModal.actionLabel}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
