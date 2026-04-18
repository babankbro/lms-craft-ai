/**
 * P1-8: Submission state-machine validator
 * Single source of truth for all legal status transitions.
 */

import { SubmissionStatus } from "@prisma/client";

// Legal transitions: from → set of allowed to-states
const TRANSITIONS: Record<SubmissionStatus, SubmissionStatus[]> = {
  DRAFT: ["SUBMITTED"],
  SUBMITTED: ["DRAFT", "UNDER_REVIEW", "REVISION_REQUESTED", "APPROVED", "REJECTED"],
  UNDER_REVIEW: ["REVISION_REQUESTED", "APPROVED", "REJECTED", "SUBMITTED"],
  REVISION_REQUESTED: ["SUBMITTED"],
  APPROVED: [],
  REJECTED: [],
};

export function canTransition(from: SubmissionStatus, to: SubmissionStatus): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
}

export function assertTransition(from: SubmissionStatus, to: SubmissionStatus): void {
  if (!canTransition(from, to)) {
    throw new Error(
      `Invalid submission transition: ${from} → ${to}`
    );
  }
}

/** Locked states — student cannot edit/attach files */
const LOCKED_STATES: SubmissionStatus[] = ["SUBMITTED", "UNDER_REVIEW", "APPROVED", "REJECTED"];

export function assertEditable(status: SubmissionStatus): void {
  if (LOCKED_STATES.includes(status)) {
    throw new Error(
      `Submission is locked (status: ${status}) and cannot be modified`
    );
  }
}

export function isLocked(status: SubmissionStatus): boolean {
  return LOCKED_STATES.includes(status);
}

export function canRecallSubmission(status: SubmissionStatus, dueDate: Date | null): boolean {
  if (status !== "SUBMITTED") return false;
  if (dueDate && new Date() >= new Date(dueDate)) return false;
  return true;
}
