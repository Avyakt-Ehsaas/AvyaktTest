import { Router } from "express";
import prisma from "../lib/prisma.js";

const router = Router();

function adminAuth(req, res, next) {
  const key = req.headers["x-admin-key"];
  const expected = process.env.ADMIN_KEY || "admin123";
  if (key !== expected) return res.status(401).json({ error: "Unauthorized" });
  next();
}
router.use(adminAuth);

function ageGroup(age) {
  if (age == null) return "Unknown";
  if (age < 25) return "Under 25";
  if (age < 35) return "25–34";
  if (age < 45) return "35–44";
  if (age < 55) return "45–54";
  return "55+";
}

function avg(arr) {
  const nums = arr.filter((v) => v != null && !isNaN(v));
  return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : null;
}

// GET /api/admin/overview
router.get("/overview", async (_req, res) => {
  try {
    const [totalParticipants, sessionAgg, totalTrials, studyAgg, contextCounts] =
      await Promise.all([
        prisma.participant.count(),
        prisma.testSession.aggregate({
          _count: { id: true },
          _avg: { medianRt: true, lapseCount: true },
          where: { status: "completed" },
        }),
        prisma.testTrial.count(),
        prisma.participant.groupBy({
          by: ["studyArm"],
          _count: { id: true },
          where: { studyOptedIn: true },
        }),
        prisma.testSession.groupBy({
          by: ["context"],
          _count: { id: true },
          where: { status: "completed" },
        }),
      ]);

    const allCheckins = await prisma.stateCheckIn.findMany({
      where: { source: "test" },
      orderBy: { createdAt: "asc" },
    });
    const checkinMap = new Map();
    for (const c of allCheckins) {
      if (!checkinMap.has(c.participantId)) checkinMap.set(c.participantId, {});
      checkinMap.get(c.participantId)[c.phase] = c.value;
    }
    const deltas = [];
    for (const [, phases] of checkinMap) {
      if (phases.pre != null && phases.post != null) deltas.push(phases.post - phases.pre);
    }

    const activityByDay = await prisma.$queryRaw`
      SELECT
        DATE("startedAt") as date,
        COUNT(*)::int        as sessions,
        COUNT(DISTINCT "participantId")::int as participants
      FROM test_sessions
      WHERE status = 'completed'
        AND "startedAt" >= NOW() - INTERVAL '30 days'
      GROUP BY DATE("startedAt")
      ORDER BY date ASC
    `;

    const rtTrend = await prisma.$queryRaw`
      SELECT
        DATE_TRUNC('week', "startedAt") as week,
        ROUND(AVG("medianRt")::numeric, 1)::float as "avgRt",
        COUNT(*)::int as count
      FROM test_sessions
      WHERE status = 'completed'
        AND "medianRt" IS NOT NULL
        AND "startedAt" >= NOW() - INTERVAL '90 days'
      GROUP BY DATE_TRUNC('week', "startedAt")
      ORDER BY week ASC
    `;

    const armCounts = { A: 0, B: 0 };
    for (const row of studyAgg) {
      if (row.studyArm === "A") armCounts.A = row._count.id;
      if (row.studyArm === "B") armCounts.B = row._count.id;
    }
    const ctxMap = { talk: 0, stall: 0 };
    for (const row of contextCounts) ctxMap[row.context] = row._count.id;

    res.json({
      totalParticipants,
      completedSessions: sessionAgg._count.id,
      totalTrials,
      avgMedianRt: sessionAgg._avg.medianRt,
      avgLapseCount: sessionAgg._avg.lapseCount,
      studyOptedIn: armCounts.A + armCounts.B,
      armACount: armCounts.A,
      armBCount: armCounts.B,
      avgCheckinDelta: avg(deltas),
      contextBreakdown: ctxMap,
      activityByDay: activityByDay.map((r) => ({
        date: r.date instanceof Date ? r.date.toISOString().slice(0, 10) : String(r.date).slice(0, 10),
        sessions: r.sessions,
        participants: r.participants,
      })),
      rtTrend: rtTrend.map((r) => ({
        week: r.week instanceof Date ? r.week.toISOString().slice(0, 10) : String(r.week).slice(0, 10),
        avgRt: r.avgRt,
        count: r.count,
      })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Overview query failed" });
  }
});

// GET /api/admin/participants
router.get("/participants", async (req, res) => {
  try {
    const { page = "1", limit = "25", company, context, arm, from, to, q } = req.query;
    const ageGroupFilter = req.query.ageGroup;
    const skip = (Number(page) - 1) * Number(limit);
    const take = Number(limit);

    const where = {};
    if (company) where.company = { contains: company, mode: "insensitive" };
    if (context === "talk" || context === "stall") where.context = context;
    if (arm === "A" || arm === "B") where.studyArm = arm;
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(to);
    }
    if (q) {
      where.OR = [
        { name: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
      ];
    }

    const [total, participants] = await Promise.all([
      prisma.participant.count({ where }),
      prisma.participant.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: "desc" },
        include: {
          sessions: { where: { status: "completed" }, orderBy: { createdAt: "asc" } },
          checkIns: { orderBy: { createdAt: "asc" } },
        },
      }),
    ]);

    let enriched = participants.map((p) => {
      const pre = p.sessions.find((s) => s.phase === "pre");
      const post = p.sessions.find((s) => s.phase === "post");
      const preRt = pre?.medianRt ?? null;
      const postRt = post?.medianRt ?? null;
      const improvement = preRt != null && postRt != null ? preRt - postRt : null;
      const preCheckin = p.checkIns.find((c) => c.phase === "pre")?.value ?? null;
      const postCheckin = p.checkIns.find((c) => c.phase === "post")?.value ?? null;
      return {
        id: p.id,
        name: p.name,
        email: p.email,
        company: p.company,
        role: p.role,
        age: p.age,
        ageGroup: ageGroup(p.age),
        context: p.context,
        studyArm: p.studyArm,
        studyOptedIn: p.studyOptedIn,
        preRt,
        postRt,
        improvement,
        lapseCount: pre?.lapseCount ?? null,
        falseStartCount: pre?.falseStartCount ?? null,
        checkinDelta: preCheckin != null && postCheckin != null ? postCheckin - preCheckin : null,
        sessionCount: p.sessions.length,
        createdAt: p.createdAt,
        diagnosticSleep: p.diagnosticSleep,
        diagnosticFocus: p.diagnosticFocus,
        diagnosticStress: p.diagnosticStress,
      };
    });

    if (ageGroupFilter) enriched = enriched.filter((p) => p.ageGroup === ageGroupFilter);

    res.json({ total, page: Number(page), limit: take, data: enriched });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Participants query failed" });
  }
});

// GET /api/admin/participants/:id  — full detail with sessions + trials
router.get("/participants/:id", async (req, res) => {
  try {
    const p = await prisma.participant.findUnique({
      where: { id: req.params.id },
      include: {
        sessions: {
          orderBy: { createdAt: "asc" },
          include: { trials: { orderBy: { trialIndex: "asc" } } },
        },
        checkIns: { orderBy: { createdAt: "asc" } },
        guided: { orderBy: { startedAt: "asc" } },
      },
    });
    if (!p) return res.status(404).json({ error: "Not found" });
    res.json({ ...p, ageGroup: ageGroup(p.age) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Participant lookup failed" });
  }
});

// GET /api/admin/analytics  — all chart data in one shot
router.get("/analytics", async (_req, res) => {
  try {
    const [participants, sessions, trials, checkins] = await Promise.all([
      prisma.participant.findMany({
        select: {
          id: true, age: true, company: true,
          diagnosticSleep: true, diagnosticFocus: true, diagnosticStress: true,
          studyArm: true, studyOptedIn: true,
        },
      }),
      prisma.testSession.findMany({
        where: { status: "completed" },
        select: {
          id: true, participantId: true, phase: true,
          medianRt: true, lapseCount: true, falseStartCount: true,
          validTrialCount: true, totalTrialCount: true,
        },
      }),
      prisma.testTrial.findMany({
        where: { isValid: true, reactionTimeMs: { not: null } },
        select: { reactionTimeMs: true },
      }),
      prisma.stateCheckIn.findMany({
        where: { source: "test" },
        select: { participantId: true, phase: true, value: true },
      }),
    ]);

    const checkinByP = new Map();
    for (const c of checkins) {
      if (!checkinByP.has(c.participantId)) checkinByP.set(c.participantId, {});
      checkinByP.get(c.participantId)[c.phase] = c.value;
    }
    const sessionsByP = new Map();
    for (const s of sessions) {
      if (!sessionsByP.has(s.participantId)) sessionsByP.set(s.participantId, []);
      sessionsByP.get(s.participantId).push(s);
    }

    // Age group analysis
    const ageBuckets = {};
    for (const p of participants) {
      const g = ageGroup(p.age);
      if (!ageBuckets[g]) ageBuckets[g] = { count: 0, rts: [], lapses: [], preRts: [], postRts: [], deltas: [], cdelta: [] };
      const b = ageBuckets[g];
      b.count++;
      const pSess = sessionsByP.get(p.id) || [];
      const pre = pSess.find((s) => s.phase === "pre");
      const post = pSess.find((s) => s.phase === "post");
      if (pre?.medianRt) { b.rts.push(pre.medianRt); b.preRts.push(pre.medianRt); b.lapses.push(pre.lapseCount); }
      if (post?.medianRt) b.postRts.push(post.medianRt);
      if (pre?.medianRt && post?.medianRt) b.deltas.push(pre.medianRt - post.medianRt);
      const ci = checkinByP.get(p.id);
      if (ci?.pre != null && ci?.post != null) b.cdelta.push(ci.post - ci.pre);
    }
    const AGE_ORDER = ["Under 25", "25–34", "35–44", "45–54", "55+", "Unknown"];
    const ageGroups = AGE_ORDER.filter((g) => ageBuckets[g]).map((g) => {
      const b = ageBuckets[g];
      return {
        group: g, count: b.count,
        avgMedianRt: avg(b.rts), avgLapseCount: avg(b.lapses),
        avgPreRt: avg(b.preRts), avgPostRt: avg(b.postRts),
        improvement: avg(b.deltas), avgCheckinDelta: avg(b.cdelta),
      };
    });

    // Company analysis
    const coMap = {};
    for (const p of participants) {
      const co = p.company || "Unknown";
      if (!coMap[co]) coMap[co] = { count: 0, rts: [], lapses: [] };
      const pSess = sessionsByP.get(p.id) || [];
      const pre = pSess.find((s) => s.phase === "pre");
      if (pre?.medianRt) { coMap[co].rts.push(pre.medianRt); coMap[co].lapses.push(pre.lapseCount); }
      coMap[co].count++;
    }
    const companies = Object.entries(coMap)
      .map(([company, b]) => ({ company, count: b.count, avgMedianRt: avg(b.rts), avgLapseCount: avg(b.lapses) }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15);

    // Arm A vs B
    const arms = { A: { count: 0, preRts: [], postRts: [], deltas: [], cdelta: [] }, B: { count: 0, preRts: [], postRts: [], deltas: [], cdelta: [] } };
    for (const p of participants) {
      if (!p.studyOptedIn || !p.studyArm || !arms[p.studyArm]) continue;
      const a = arms[p.studyArm];
      a.count++;
      const pSess = sessionsByP.get(p.id) || [];
      const pre = pSess.find((s) => s.phase === "pre");
      const post = pSess.find((s) => s.phase === "post");
      if (pre?.medianRt) a.preRts.push(pre.medianRt);
      if (post?.medianRt) a.postRts.push(post.medianRt);
      if (pre?.medianRt && post?.medianRt) a.deltas.push(pre.medianRt - post.medianRt);
      const ci = checkinByP.get(p.id);
      if (ci?.pre != null && ci?.post != null) a.cdelta.push(ci.post - ci.pre);
    }
    const armComparison = {};
    for (const arm of ["A", "B"]) {
      const a = arms[arm];
      armComparison[arm] = { count: a.count, avgPreRt: avg(a.preRts), avgPostRt: avg(a.postRts), avgImprovement: avg(a.deltas), avgCheckinDelta: avg(a.cdelta) };
    }

    // Diagnostic correlations
    const diagnosticFields = ["diagnosticSleep", "diagnosticFocus", "diagnosticStress"];
    const diagnostics = {};
    for (const field of diagnosticFields) {
      const bmap = {};
      for (const p of participants) {
        const val = p[field];
        if (!val) continue;
        if (!bmap[val]) bmap[val] = { count: 0, rts: [], lapses: [] };
        const pSess = sessionsByP.get(p.id) || [];
        const pre = pSess.find((s) => s.phase === "pre");
        if (pre?.medianRt) { bmap[val].rts.push(pre.medianRt); bmap[val].lapses.push(pre.lapseCount); }
        bmap[val].count++;
      }
      diagnostics[field] = Object.entries(bmap).map(([label, b]) => ({
        label, count: b.count, avgMedianRt: avg(b.rts), avgLapseCount: avg(b.lapses),
      }));
    }

    // RT distribution histogram (50ms buckets, 100–750ms)
    const rtBuckets = {};
    for (let b = 100; b <= 750; b += 50) rtBuckets[b] = 0;
    for (const t of trials) {
      const rt = t.reactionTimeMs;
      const bucket = Math.min(Math.floor(rt / 50) * 50, 750);
      if (bucket >= 100) rtBuckets[bucket] = (rtBuckets[bucket] || 0) + 1;
    }
    const rtDistribution = Object.entries(rtBuckets).map(([b, count]) => ({
      bucket: `${b}–${Number(b) + 49}`,
      bucketStart: Number(b),
      count,
    }));

    // Check-in delta distribution
    const deltaMap = {};
    for (const [, ci] of checkinByP) {
      if (ci.pre != null && ci.post != null) {
        const d = ci.post - ci.pre;
        deltaMap[d] = (deltaMap[d] || 0) + 1;
      }
    }
    const checkinDeltaDist = Object.entries(deltaMap)
      .map(([delta, count]) => ({ delta: Number(delta), count }))
      .sort((a, b) => a.delta - b.delta);

    res.json({ ageGroups, companies, armComparison, diagnostics, rtDistribution, checkinDeltaDistribution: checkinDeltaDist });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Analytics query failed" });
  }
});

// GET /api/admin/sessions
router.get("/sessions", async (req, res) => {
  try {
    const { page = "1", limit = "25", phase, context, from, to } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const take = Number(limit);

    const where = { status: "completed" };
    if (phase === "pre" || phase === "post") where.phase = phase;
    if (context === "talk" || context === "stall") where.context = context;
    if (from || to) {
      where.startedAt = {};
      if (from) where.startedAt.gte = new Date(from);
      if (to) where.startedAt.lte = new Date(to);
    }

    const [total, sessions] = await Promise.all([
      prisma.testSession.count({ where }),
      prisma.testSession.findMany({
        where, skip, take,
        orderBy: { startedAt: "desc" },
        include: {
          participant: {
            select: { name: true, email: true, company: true, age: true, studyArm: true },
          },
        },
      }),
    ]);

    res.json({ total, page: Number(page), limit: take, data: sessions });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Sessions query failed" });
  }
});

// GET /api/admin/sessions/:id  — with all trials
router.get("/sessions/:id", async (req, res) => {
  try {
    const session = await prisma.testSession.findUnique({
      where: { id: req.params.id },
      include: {
        trials: { orderBy: { trialIndex: "asc" } },
        participant: { select: { name: true, email: true, company: true, age: true, studyArm: true } },
      },
    });
    if (!session) return res.status(404).json({ error: "Not found" });
    res.json(session);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Session lookup failed" });
  }
});

export default router;
