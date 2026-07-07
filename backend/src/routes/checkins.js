import { Router } from "express";
import prisma from "../lib/prisma.js";

const router = Router();

// POST /api/checkins  — 1-7 scattered/focused slider (reused across test + meditation)
router.post("/", async (req, res) => {
  try {
    const { participantId, phase, source = "test", value } = req.body;
    if (!participantId) {
      return res.status(400).json({ error: "participantId required" });
    }
    if (phase !== "pre" && phase !== "post") {
      return res.status(400).json({ error: "phase must be pre or post" });
    }
    const v = Number(value);
    if (!Number.isInteger(v) || v < 1 || v > 7) {
      return res.status(400).json({ error: "value must be integer 1..7" });
    }
    const checkin = await prisma.stateCheckIn.create({
      data: { participantId, phase, source, value: v },
    });
    res.status(201).json(checkin);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Check-in failed" });
  }
});

export default router;
