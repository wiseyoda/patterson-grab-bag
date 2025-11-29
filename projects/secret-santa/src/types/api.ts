/**
 * API request and response types
 */

// Event creation
export interface CreateEventRequest {
  name: string;
  budget?: string;
  eventDate?: string;
  rules?: string;
}

export interface CreateEventResponse {
  id: string;
  adminToken: string;
  name: string;
}

// Participant management
export interface AddParticipantRequest {
  name: string;
  email?: string;
}

export interface AddParticipantResponse {
  id: string;
  name: string;
  email: string | null;
  accessToken: string;
  notificationStatus: string;
}

// Randomization
export interface RandomizeResponse {
  success: boolean;
  message: string;
  participantCount: number;
}

// Notification
export interface NotifyResponse {
  success: boolean;
  sent: number;
  failed: number;
  results: Array<{
    name: string;
    success: boolean;
    error?: string;
  }>;
}

// Reveal
export interface RevealResponse {
  participantName: string;
  assignedToName: string;
  event: {
    name: string;
    budget: string | null;
    eventDate: string | null;
    rules: string | null;
  };
}

// Error response
export interface ApiErrorResponse {
  error: string;
}

// Generic success response
export interface ApiSuccessResponse {
  success: boolean;
  message?: string;
}
