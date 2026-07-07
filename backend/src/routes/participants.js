import { Router } from "express";
import prisma from "../lib/prisma.js";

const router = Router();

// POST /api/participants — create participant (consent + self-report)
router.post("/", async (req, res) => {
  try {
    const {
      context,
      consentDataUse,
      consentScoreDisplay,
      consentAnonAggregate,
      consentFutureContact,
      name,
      email,
      whatsapp,
      company,
      role,
      age,
      diagnosticSleep,
      diagnosticFocus,
      diagnosticStress,
    } = req.body;

    if (context !== "talk" && context !== "stall") {
      return res.status(400).json({ error: "context must be 'talk' or 'stall'" });
    }
    if (!consentDataUse || !consentScoreDisplay || !consentAnonAggregate) {
      return res
        .status(400)
        .json({ error: "Required consent boxes must be checked" });
    }
    if (!name || !email || !whatsapp || !company) {
      return res
        .status(400)
        .json({ error: "name, email, whatsapp, company are required" });
    }

    const participant = await prisma.participant.create({
      data: {
        context,
        consentDataUse: !!consentDataUse,
        consentScoreDisplay: !!consentScoreDisplay,
        consentAnonAggregate: !!consentAnonAggregate,
        consentFutureContact: !!consentFutureContact,
        name,
        email,
        whatsapp,
        company,
        role: role || null,
        age: age != null ? Number(age) : null,
        diagnosticSleep: diagnosticSleep || null,
        diagnosticFocus: diagnosticFocus || null,
        diagnosticStress: diagnosticStress || null,
      },
    });

    res.status(201).json(participant);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create participant" });
  }
});

// GET /api/participants/:id — used by returning-visitor check
router.get("/:id", async (req, res) => {
  try {
    const participant = await prisma.participant.findUnique({
      where: { id: req.params.id },
      include: {
        sessions: {
          orderBy: { createdAt: "asc" },
          include: {
            trials: false,
          },
        },
        checkIns: { orderBy: { createdAt: "asc" } },
        guided: true,
      },
    });
    if (!participant) return res.status(404).json({ error: "Not found" });
    res.json(participant);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Lookup failed" });
  }
});

// POST /api/participants/:id/opt-in — study opt-in (stall only), assigns arm
router.post("/:id/opt-in", async (req, res) => {
  try {
    const participant = await prisma.participant.findUnique({
      where: { id: req.params.id },
    });
    if (!participant) return res.status(404).json({ error: "Not found" });

    // Alternating A/B assignment to keep arms balanced (spec §7 + §11.2).
    // Count existing opted-in participants to decide next arm.
    const optedInCount = await prisma.participant.count({
      where: { studyOptedIn: true },
    });
    const arm = optedInCount % 2 === 0 ? "A" : "B";

    const updated = await prisma.participant.update({
      where: { id: req.params.id },
      data: { studyOptedIn: true, studyArm: arm },
    });
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Opt-in failed" });
  }
});

export default router;
