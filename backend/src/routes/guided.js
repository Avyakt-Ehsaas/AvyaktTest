import { Router } from "express";
import prisma from "../lib/prisma.js";

const router = Router();

// POST /api/guided — start a guided/quiet session, returns the record
router.post("/", async (req, res) => {
  try {
    const { participantId, studyArm, durationSeconds = 180 } = req.body;
    if (!participantId) {
      return res.status(400).json({ error: "participantId required" });
    }
    if (studyArm !== "A" && studyArm !== "B") {
      return res.status(400).json({ error: "studyArm must be A or B" });
    }
    const session = await prisma.guidedSession.create({
      data: { participantId, studyArm, durationSeconds },
    });
    res.status(201).json(session);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to start guided session" });
  }
});

// PATCH /api/guided/:id/complete — mark it finished
router.patch("/:id/complete", async (req, res) => {
  try {
    const updated = await prisma.guidedSession.update({
      where: { id: req.params.id },
      data: { completed: true, completedAt: new Date() },
    });
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to complete guided session" });
  }
});

export default router;
