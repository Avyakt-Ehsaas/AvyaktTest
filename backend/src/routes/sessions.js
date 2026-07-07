import { Router } from "express";
import prisma from "../lib/prisma.js";
import { classifyTrial, aggregate } from "../utils/metrics.js";

const router = Router();

// POST /api/sessions — submit a completed test run (pre or post)
// Payload:
//   participantId, phase ("pre"|"post"), context, durationSeconds,
//   status ("completed"|"interrupted"),
//   trials: [{ trialIndex, isiMs, stimulusOnsetMs, responseMs, reactionTimeMs }]
router.post("/", async (req, res) => {
  try {
    const {
      participantId,
      phase,
      context,
      durationSeconds,
      status = "completed",
      trials = [],
    } = req.body;

    if (!participantId) {
      return res.status(400).json({ error: "participantId required" });
    }
    if (phase !== "pre" && phase !== "post") {
      return res.status(400).json({ error: "phase must be pre or post" });
    }
    if (context !== "talk" && context !== "stall") {
      return res.status(400).json({ error: "context invalid" });
    }

    const enriched = trials.map((t) => {
      const { isFalseStart, isLapse, isValid } = classifyTrial(t.reactionTimeMs);
      return {
        trialIndex: t.trialIndex,
        isiMs: t.isiMs,
        stimulusOnsetMs: t.stimulusOnsetMs ?? null,
        responseMs: t.responseMs ?? null,
        reactionTimeMs: t.reactionTimeMs ?? null,
        isFalseStart,
        isLapse,
        isValid,
      };
    });

    const agg = aggregate(enriched);

    const session = await prisma.testSession.create({
      data: {
        participantId,
        phase,
        context,
        durationSeconds,
        status,
        completedAt: status === "completed" ? new Date() : null,
        ...agg,
        trials: { create: enriched },
      },
      include: { trials: true },
    });

    // Percentile relative to same-context, same-phase peers (soft ranking).
    const peers = await prisma.testSession.findMany({
      where: {
        context,
        phase,
        status: "completed",
        medianRt: { not: null },
      },
      select: { medianRt: true },
    });

    let percentile = null;
    if (session.medianRt != null && peers.length > 0) {
      const faster = peers.filter((p) => p.medianRt > session.medianRt).length;
      percentile = Math.round((faster / peers.length) * 100);
    }

    res.status(201).json({ ...session, percentile });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to record session" });
  }
});

// GET /api/sessions/:id — with trials + percentile
router.get("/:id", async (req, res) => {
  try {
    const session = await prisma.testSession.findUnique({
      where: { id: req.params.id },
      include: { trials: { orderBy: { trialIndex: "asc" } } },
    });
    if (!session) return res.status(404).json({ error: "Not found" });
    res.json(session);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Lookup failed" });
  }
});

// GET /api/sessions?participantId=… — for pre/post comparison
router.get("/", async (req, res) => {
  try {
    const { participantId } = req.query;
    if (!participantId) {
      return res.status(400).json({ error: "participantId required" });
    }
    const sessions = await prisma.testSession.findMany({
      where: { participantId, status: "completed" },
      orderBy: { createdAt: "asc" },
    });
    res.json(sessions);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Query failed" });
  }
});

export default router;
