/**
 * Validation result for assignment checking
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Result of regeneration analysis
 */
export interface RegenerationAnalysis {
  canRegenerate: boolean;
  isFullRegeneration: boolean;
  lockedParticipants: string[];
  unlockedParticipants: string[];
  reason?: string;
}

/**
 * Validates that assignments meet all Secret Santa requirements:
 * 1. No one is assigned to themselves
 * 2. Everyone has exactly one assignment (is a giver)
 * 3. Everyone receives exactly one gift (is a receiver)
 */
export function validateAssignments<T>(
  originalItems: T[],
  assignments: Map<T, T>
): ValidationResult {
  const errors: string[] = [];

  // Check 1: Everyone has an assignment
  if (assignments.size !== originalItems.length) {
    errors.push(
      `Assignment count mismatch: expected ${originalItems.length}, got ${assignments.size}`
    );
  }

  // Check 2: No one is assigned to themselves
  for (const [giver, receiver] of assignments) {
    if (giver === receiver) {
      errors.push(`Self-assignment detected: ${giver} is assigned to themselves`);
    }
  }

  // Check 3: Everyone is assigned exactly once as a receiver (no duplicates)
  const receivers = Array.from(assignments.values());
  const receiverCounts = new Map<T, number>();
  for (const receiver of receivers) {
    receiverCounts.set(receiver, (receiverCounts.get(receiver) || 0) + 1);
  }

  for (const [receiver, count] of receiverCounts) {
    if (count > 1) {
      errors.push(`Duplicate receiver: ${receiver} is assigned to ${count} people`);
    }
  }

  // Check 4: All original items appear as receivers (everyone gets a gift)
  for (const item of originalItems) {
    if (!receivers.includes(item)) {
      errors.push(`Missing receiver: ${item} is not receiving a gift from anyone`);
    }
  }

  // Check 5: All original items appear as givers (everyone gives a gift)
  for (const item of originalItems) {
    if (!assignments.has(item)) {
      errors.push(`Missing giver: ${item} is not assigned to give a gift`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validates partial assignments for a subset of participants
 */
export function validatePartialAssignments(
  participants: string[],
  assignments: Map<string, string>
): ValidationResult {
  const errors: string[] = [];

  // Check: Each participant has exactly one assignment
  for (const participant of participants) {
    if (!assignments.has(participant)) {
      errors.push(`Missing assignment for participant: ${participant}`);
    }
  }

  // Check: No self-assignments
  for (const [giver, receiver] of assignments) {
    if (giver === receiver) {
      errors.push(`Self-assignment detected: ${giver}`);
    }
  }

  // Check: Each participant in the group receives from exactly one person in the group
  const receivers = Array.from(assignments.values());
  const receiverCounts = new Map<string, number>();
  for (const receiver of receivers) {
    receiverCounts.set(receiver, (receiverCounts.get(receiver) || 0) + 1);
  }

  for (const participant of participants) {
    const count = receiverCounts.get(participant) || 0;
    if (count !== 1) {
      errors.push(`Participant ${participant} receives ${count} gifts (should be 1)`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Generates a derangement (permutation where no element appears in its original position)
 * Uses Sattolo's algorithm which guarantees a single cycle derangement in O(n) time
 */
export function generateDerangement<T>(items: T[]): Map<T, T> {
  if (items.length < 2) {
    throw new Error("Need at least 2 items to generate a derangement");
  }

  const n = items.length;
  const result = [...items];

  // Sattolo's algorithm: guaranteed to produce a single cycle
  // This means everyone forms one big loop: A->B->C->...->A
  // No one can be assigned to themselves
  for (let i = n - 1; i > 0; i--) {
    // Key difference from Fisher-Yates: j is strictly less than i (not i+1)
    // This guarantees a derangement
    const j = Math.floor(Math.random() * i);

    // Swap elements - we know these indices are valid since i < n and j < i
    const temp = result[i]!;
    result[i] = result[j]!;
    result[j] = temp;
  }

  // Create mapping: original[i] -> result[i]
  const mapping = new Map<T, T>();
  for (let i = 0; i < n; i++) {
    const original = items[i];
    const assigned = result[i];
    if (original !== undefined && assigned !== undefined) {
      mapping.set(original, assigned);
    }
  }

  return mapping;
}

const MAX_ATTEMPTS = 5;
const MIN_PARTICIPANTS_FOR_REGENERATION = 3;

/**
 * Analyzes whether regeneration is possible given the current state
 *
 * Rules:
 * - If no one has viewed: full regeneration is allowed
 * - If some have viewed: only regenerate among those who haven't viewed
 * - Need at least 3 participants who haven't viewed for partial regeneration
 * - Participants who viewed are "locked" - their assignments cannot change
 */
export function analyzeRegeneration(
  participants: { id: string; hasViewed: boolean }[]
): RegenerationAnalysis {
  const lockedParticipants = participants.filter(p => p.hasViewed).map(p => p.id);
  const unlockedParticipants = participants.filter(p => !p.hasViewed).map(p => p.id);

  // No one has viewed - full regeneration
  if (lockedParticipants.length === 0) {
    return {
      canRegenerate: participants.length >= MIN_PARTICIPANTS_FOR_REGENERATION,
      isFullRegeneration: true,
      lockedParticipants: [],
      unlockedParticipants: participants.map(p => p.id),
      reason: participants.length < MIN_PARTICIPANTS_FOR_REGENERATION
        ? `Need at least ${MIN_PARTICIPANTS_FOR_REGENERATION} participants to generate assignments`
        : undefined,
    };
  }

  // Some have viewed - check if partial regeneration is possible
  if (unlockedParticipants.length < MIN_PARTICIPANTS_FOR_REGENERATION) {
    return {
      canRegenerate: false,
      isFullRegeneration: false,
      lockedParticipants,
      unlockedParticipants,
      reason: `Cannot regenerate: ${lockedParticipants.length} participant(s) have already viewed their assignments. ` +
        `Only ${unlockedParticipants.length} participant(s) haven't viewed yet, but you need at least ${MIN_PARTICIPANTS_FOR_REGENERATION} ` +
        `to create new assignments. Add more participants to enable regeneration.`,
    };
  }

  return {
    canRegenerate: true,
    isFullRegeneration: false,
    lockedParticipants,
    unlockedParticipants,
  };
}

/**
 * Generates assignments for participants with validation and retry logic
 * Returns a Map of participantId -> assignedToId
 * Throws an error if valid assignments cannot be generated after MAX_ATTEMPTS tries
 */
export function generateAssignments(
  participantIds: string[]
): { assignments: Map<string, string>; attempts: number } {
  if (participantIds.length < 2) {
    throw new Error("Need at least 2 participants to generate assignments");
  }

  const allErrors: string[][] = [];

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const assignments = generateDerangement(participantIds);
    const validation = validateAssignments(participantIds, assignments);

    if (validation.valid) {
      return { assignments, attempts: attempt };
    }

    allErrors.push(validation.errors);
  }

  // All attempts failed - this should theoretically never happen with Sattolo's algorithm
  const error = new Error(
    `Failed to generate valid assignments after ${MAX_ATTEMPTS} attempts`
  );
  (error as Error & { validationErrors: string[][] }).validationErrors = allErrors;
  throw error;
}

/**
 * Generates partial assignments for a subset of participants
 * Used when some participants have already viewed their assignments (locked)
 *
 * @param unlockedParticipantIds - IDs of participants who haven't viewed (can be reassigned)
 * @param lockedAssignments - Map of locked assignments (viewed participants -> their targets)
 * @returns New assignments for unlocked participants only
 */
export function generatePartialAssignments(
  unlockedParticipantIds: string[],
  lockedAssignments: Map<string, string>
): { assignments: Map<string, string>; attempts: number } {
  if (unlockedParticipantIds.length < MIN_PARTICIPANTS_FOR_REGENERATION) {
    throw new Error(
      `Need at least ${MIN_PARTICIPANTS_FOR_REGENERATION} unlocked participants to regenerate assignments. ` +
      `Only ${unlockedParticipantIds.length} available.`
    );
  }

  // Get the set of participants who are already receiving from locked givers
  const lockedReceivers = new Set(lockedAssignments.values());

  // Find unlocked participants who are NOT receiving from a locked giver
  // These are the only ones whose incoming assignment can change
  const fullyUnlocked = unlockedParticipantIds.filter(id => !lockedReceivers.has(id));

  // Also include unlocked participants who ARE receiving from locked givers
  // But they can only give to other unlocked participants
  const allUnlocked = [...unlockedParticipantIds];

  if (fullyUnlocked.length < 2) {
    throw new Error(
      `Not enough participants available for reassignment. ` +
      `${lockedReceivers.size} participants are locked as receivers.`
    );
  }

  const allErrors: string[][] = [];

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    // Generate a derangement among unlocked participants
    // They will only give to each other
    const newAssignments = generateDerangement(allUnlocked);
    const validation = validatePartialAssignments(allUnlocked, newAssignments);

    if (validation.valid) {
      return { assignments: newAssignments, attempts: attempt };
    }

    allErrors.push(validation.errors);
  }

  const error = new Error(
    `Failed to generate valid partial assignments after ${MAX_ATTEMPTS} attempts. ` +
    `This may be due to constraints from locked assignments.`
  );
  (error as Error & { validationErrors: string[][] }).validationErrors = allErrors;
  throw error;
}
