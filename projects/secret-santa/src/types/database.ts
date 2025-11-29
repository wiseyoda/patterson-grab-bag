/**
 * Database model types
 * These mirror the Prisma schema but are useful for type-safe API responses
 */

export type NotificationStatus = "NOT_SENT" | "SENT" | "VIEWED";

export interface Event {
  id: string;
  name: string;
  adminToken: string;
  budget: string | null;
  eventDate: string | null; // Stored as YYYY-MM-DD string
  rules: string | null;
  isLocked: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Participant {
  id: string;
  eventId: string;
  name: string;
  email: string | null;
  accessToken: string;
  assignedToId: string | null;
  notificationStatus: NotificationStatus;
  notifiedAt: Date | null;
  viewedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Participant data safe for admin view (no assignment info)
 */
export interface ParticipantAdminView {
  id: string;
  name: string;
  email: string | null;
  accessToken: string;
  notificationStatus: NotificationStatus;
  notifiedAt: string | null;
  viewedAt: string | null;
  createdAt: string;
}

/**
 * Event data for admin view
 */
export interface EventAdminView {
  id: string;
  name: string;
  budget: string | null;
  eventDate: string | null;
  rules: string | null;
  isLocked: boolean;
  createdAt: string;
  participants: ParticipantAdminView[];
}
