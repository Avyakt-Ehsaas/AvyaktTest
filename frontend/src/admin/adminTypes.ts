export interface OverviewData {
  totalParticipants: number;
  completedSessions: number;
  totalTrials: number;
  avgMedianRt: number | null;
  avgLapseCount: number | null;
  studyOptedIn: number;
  armACount: number;
  armBCount: number;
  avgCheckinDelta: number | null;
  contextBreakdown: { talk: number; stall: number };
  activityByDay: Array<{ date: string; sessions: number; participants: number }>;
  rtTrend: Array<{ week: string; avgRt: number | null; count: number }>;
}

export interface ParticipantRow {
  id: string;
  name: string;
  email: string;
  company: string;
  role: string | null;
  age: number | null;
  ageGroup: string;
  context: string;
  studyArm: string | null;
  studyOptedIn: boolean;
  preRt: number | null;
  postRt: number | null;
  improvement: number | null;
  lapseCount: number | null;
  falseStartCount: number | null;
  checkinDelta: number | null;
  sessionCount: number;
  createdAt: string;
  diagnosticSleep: string | null;
  diagnosticFocus: string | null;
  diagnosticStress: string | null;
}

export interface ParticipantListResponse {
  total: number;
  page: number;
  limit: number;
  data: ParticipantRow[];
}

export interface TrialRow {
  id: string;
  trialIndex: number;
  isiMs: number;
  reactionTimeMs: number | null;
  isFalseStart: boolean;
  isLapse: boolean;
  isValid: boolean;
}

export interface SessionRow {
  id: string;
  participantId: string;
  participant: { name: string; email: string; company: string; age: number | null; studyArm: string | null };
  phase: string;
  context: string;
  medianRt: number | null;
  meanRt: number | null;
  cv: number | null;
  lapseCount: number;
  falseStartCount: number;
  validTrialCount: number;
  totalTrialCount: number;
  startedAt: string;
  completedAt: string | null;
}

export interface SessionDetail extends SessionRow {
  trials: TrialRow[];
}

export interface AgeGroupStat {
  group: string;
  count: number;
  avgMedianRt: number | null;
  avgLapseCount: number | null;
  avgPreRt: number | null;
  avgPostRt: number | null;
  improvement: number | null;
  avgCheckinDelta: number | null;
}

export interface CompanyStat {
  company: string;
  count: number;
  avgMedianRt: number | null;
  avgLapseCount: number | null;
}

export interface ArmStat {
  count: number;
  avgPreRt: number | null;
  avgPostRt: number | null;
  avgImprovement: number | null;
  avgCheckinDelta: number | null;
}

export interface DiagnosticStat {
  label: string;
  count: number;
  avgMedianRt: number | null;
  avgLapseCount: number | null;
}

export interface RtBucket {
  bucket: string;
  bucketStart: number;
  count: number;
}

export interface AnalyticsData {
  ageGroups: AgeGroupStat[];
  companies: CompanyStat[];
  armComparison: { A: ArmStat; B: ArmStat };
  diagnostics: {
    diagnosticSleep: DiagnosticStat[];
    diagnosticFocus: DiagnosticStat[];
    diagnosticStress: DiagnosticStat[];
  };
  rtDistribution: RtBucket[];
  checkinDeltaDistribution: Array<{ delta: number; count: number }>;
}

export interface SessionListResponse {
  total: number;
  page: number;
  limit: number;
  data: SessionRow[];
}
