export type Context = "talk" | "stall";
export type Phase = "pre" | "post";
export type StudyArm = "A" | "B";

// Trial parameters — see PDF §1.3, §4.3
export const PVT_ISI_MIN = 1000;   // ms
export const PVT_ISI_MAX = 4000;   // ms
export const FALSE_START_MS = 100; // rt < 100 → false start
export const LAPSE_MS = 355;       // rt ≥ 355 → lapse (PVT-B validated)
export const TALK_DURATION_S = 90;
export const STALL_DURATION_S = 180;

// Debug override: when ?debug=1 is on the URL, shorten tests + guided timer
// so end-to-end verification can run in seconds.  Real event runs unchanged.
export function debugMode(): boolean {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).has("debug")
    || window.localStorage.getItem("arp:debug") === "1";
}
export function testDurationSeconds(base: number): number {
  return debugMode() ? 8 : base;
}
export function guidedDurationSeconds(): number {
  return debugMode() ? 8 : 180;
}
export const PRACTICE_TRIALS = 3;

export interface Trial {
  trialIndex: number;
  isiMs: number;
  stimulusOnsetMs: number | null;
  responseMs: number | null;
  reactionTimeMs: number | null;
  isFalseStart: boolean;
  isLapse: boolean;
  isValid: boolean;
}

export interface ParticipantForm {
  context: Context;
  consentDataUse: boolean;
  consentScoreDisplay: boolean;
  consentAnonAggregate: boolean;
  consentFutureContact: boolean;
  name: string;
  email: string;
  whatsapp: string;
  company: string;
  role?: string;
  age?: number;
  diagnosticSleep?: string;
  diagnosticFocus?: string;
  diagnosticStress?: string;
}

export interface Participant extends ParticipantForm {
  id: string;
  studyOptedIn: boolean;
  studyArm: StudyArm | null;
  createdAt: string;
  updatedAt: string;
}

export interface SessionResult {
  id: string;
  participantId: string;
  phase: Phase;
  context: Context;
  durationSeconds: number;
  medianRt: number | null;
  meanRt: number | null;
  cv: number | null;
  lapseCount: number;
  falseStartCount: number;
  validTrialCount: number;
  totalTrialCount: number;
  status: "completed" | "interrupted" | "in_progress";
  percentile?: number | null;
}
