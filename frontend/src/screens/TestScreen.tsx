import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useFlow } from "../store";
import { usePvt } from "../pvt/usePvt";
import { submitSessionOfflineSafe } from "../api";
import {
  STALL_DURATION_S,
  TALK_DURATION_S,
  testDurationSeconds,
  type Phase,
  type Trial,
} from "../types";

// Screens 5 & 9 (PDF §3): the actual PVT run — pre and post.
// No RT feedback during the run; interrupt on tab background (§4.4).
export function TestScreen() {
  const { phase } = useParams<{ phase: Phase }>();
  const p: Phase = phase === "post" ? "post" : "pre";
  const nav = useNavigate();
  const {
    context,
    participantId,
    setPreSession,
    setPostSession,
  } = useFlow();

  const durationSec = testDurationSeconds(
    context === "talk" ? TALK_DURATION_S : STALL_DURATION_S
  );
  const durationMs = durationSec * 1000;

  const trialsRef = useRef<Trial[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const finish = useCallback(async () => {
    if (!participantId) return;
    setBusy(true);
    try {
      const session = await submitSessionOfflineSafe({
        participantId,
        phase: p,
        context,
        durationSeconds: durationSec,
        status: "completed",
        trials: trialsRef.current,
      });
      if (p === "pre") setPreSession(session);
      else setPostSession(session);
      nav(p === "pre" ? "/results/pre" : "/results/post");
    } catch (e) {
      setErr(
        e instanceof Error
          ? e.message
          : "Couldn't submit — your result is stored locally."
      );
    } finally {
      setBusy(false);
    }
  }, [
    participantId,
    p,
    context,
    durationSec,
    nav,
    setPreSession,
    setPostSession,
  ]);

  const pvt = usePvt({
    durationMs,
    maxTrials: null,
    handlers: {
      onTrial: (t) => trialsRef.current.push(t),
      onFinish: () => void finish(),
    },
    showTapAck: true,
  });

  // Start on mount
  useEffect(() => {
    trialsRef.current = [];
    pvt.start();
    return () => pvt.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Page Visibility interruption detection (PDF §4.4)
  useEffect(() => {
    function onVis() {
      if (document.hidden && pvt.running) {
        pvt.stop();
        nav("/interrupted", { state: { phase: p } });
      }
    }
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [pvt, nav, p]);

  const totalSec = durationSec;
  const remainingSec = Math.max(
    0,
    Math.ceil(totalSec - pvt.elapsedMs / 1000)
  );

  if (busy) {
    return (
      <div className="page page-center">
        <p className="text-muted">Saving your result…</p>
      </div>
    );
  }

  if (err) {
    return (
      <div className="page page-center">
        <h1>Almost there</h1>
        <p className="text-muted">{err}</p>
        <button
          className="btn mt-24"
          onClick={() => nav(p === "pre" ? "/results/pre" : "/results/post")}
        >
          Continue
        </button>
      </div>
    );
  }

  return (
    <div
      className="test-stage"
      onPointerDown={(e) => {
        e.preventDefault();
        pvt.handlePointerDown(e);
      }}
    >
      <div className="test-timer-dot">
        {String(Math.floor(remainingSec / 60)).padStart(1, "0")}:
        {String(remainingSec % 60).padStart(2, "0")}
      </div>
      {pvt.stimulusVisible && <div className="stimulus" />}
    </div>
  );
}
