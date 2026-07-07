-- CreateEnum
CREATE TYPE "TestContext" AS ENUM ('talk', 'stall');

-- CreateEnum
CREATE TYPE "TestPhase" AS ENUM ('pre', 'post');

-- CreateEnum
CREATE TYPE "StudyArm" AS ENUM ('A', 'B');

-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('completed', 'interrupted', 'in_progress');

-- CreateEnum
CREATE TYPE "CheckInSource" AS ENUM ('test', 'meditation');

-- CreateTable
CREATE TABLE "participants" (
    "id" TEXT NOT NULL,
    "context" "TestContext" NOT NULL,
    "consentDataUse" BOOLEAN NOT NULL DEFAULT false,
    "consentScoreDisplay" BOOLEAN NOT NULL DEFAULT false,
    "consentAnonAggregate" BOOLEAN NOT NULL DEFAULT false,
    "consentFutureContact" BOOLEAN NOT NULL DEFAULT false,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "whatsapp" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "role" TEXT,
    "diagnosticSleep" TEXT,
    "diagnosticFocus" TEXT,
    "diagnosticStress" TEXT,
    "studyOptedIn" BOOLEAN NOT NULL DEFAULT false,
    "studyArm" "StudyArm",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "test_sessions" (
    "id" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "phase" "TestPhase" NOT NULL,
    "context" "TestContext" NOT NULL,
    "durationSeconds" INTEGER NOT NULL,
    "medianRt" DOUBLE PRECISION,
    "meanRt" DOUBLE PRECISION,
    "cv" DOUBLE PRECISION,
    "lapseCount" INTEGER NOT NULL DEFAULT 0,
    "falseStartCount" INTEGER NOT NULL DEFAULT 0,
    "validTrialCount" INTEGER NOT NULL DEFAULT 0,
    "totalTrialCount" INTEGER NOT NULL DEFAULT 0,
    "status" "SessionStatus" NOT NULL DEFAULT 'in_progress',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "test_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "test_trials" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "trialIndex" INTEGER NOT NULL,
    "isiMs" INTEGER NOT NULL,
    "stimulusOnsetMs" DOUBLE PRECISION,
    "responseMs" DOUBLE PRECISION,
    "reactionTimeMs" DOUBLE PRECISION,
    "isFalseStart" BOOLEAN NOT NULL DEFAULT false,
    "isLapse" BOOLEAN NOT NULL DEFAULT false,
    "isValid" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "test_trials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "state_checkins" (
    "id" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "phase" "TestPhase" NOT NULL,
    "source" "CheckInSource" NOT NULL DEFAULT 'test',
    "value" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "state_checkins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guided_sessions" (
    "id" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "studyArm" "StudyArm" NOT NULL,
    "durationSeconds" INTEGER NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "guided_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "test_sessions_participantId_phase_idx" ON "test_sessions"("participantId", "phase");

-- CreateIndex
CREATE INDEX "test_trials_sessionId_trialIndex_idx" ON "test_trials"("sessionId", "trialIndex");

-- AddForeignKey
ALTER TABLE "test_sessions" ADD CONSTRAINT "test_sessions_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "participants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_trials" ADD CONSTRAINT "test_trials_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "test_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "state_checkins" ADD CONSTRAINT "state_checkins_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "participants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guided_sessions" ADD CONSTRAINT "guided_sessions_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "participants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
