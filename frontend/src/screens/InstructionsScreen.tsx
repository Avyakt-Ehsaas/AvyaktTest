import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useFlow } from "../store";
import { usePvt } from "../pvt/usePvt";
import {
  PRACTICE_TRIALS,
  STALL_DURATION_S,
  TALK_DURATION_S,
  type Trial,
} from "../types";

// Screen 4 (PDF §3): instructions + embedded 3-trial practice round.
// Practice is the *only* place the person sees their RT number — the real
// test intentionally gives no feedback (§1.2, §3 Screen 5).
export function InstructionsScreen() {
  const nav = useNavigate();
  const { context, isPracticeDone, markPracticeDone } = useFlow();
  const [phase, setPhase] = useState<"intro" | "practice" | "ready">("intro");
  const [lastRt, setLastRt] = useState<number | null>(null);
  const [completed, setCompleted] = useState(0);

  const durationSec = context === "talk" ? TALK_DURATION_S : STALL_DURATION_S;
  const alreadyDone = isPracticeDone();

  const pvt = usePvt({
    durationMs: null,
    maxTrials: PRACTICE_TRIALS,
    handlers: {
      onTrial: (t: Trial) => {
        if (t.isFalseStart) {
          setLastRt(-1);
        } else {
          setLastRt(t.reactionTimeMs);
        }
        setCompleted((n) => n + 1);
      },
      onFinish: () => setPhase("ready"),
    },
    showTapAck: true,
  });

  useEffect(() => {
    if (phase === "practice") pvt.start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  if (phase === "practice") {
    return (
      <div
        className="test-stage"
        onPointerDown={(e) => {
          e.preventDefault();
          pvt.handlePointerDown(e);
        }}
      >
        <div className="test-timer-dot">Practice {completed}/{PRACTICE_TRIALS}</div>
        {lastRt != null && !pvt.stimulusVisible && (
          <div className="practice-feedback">
            {lastRt < 0 ? "Too early — wait for it" : `${Math.round(lastRt)}ms`}
          </div>
        )}
        {pvt.stimulusVisible && <div className="stimulus" />}
        {!pvt.stimulusVisible && lastRt == null && (
          <div className="test-message">Wait for the dot, then tap.</div>
        )}
      </div>
    );
  }

  if (phase === "ready") {
    return (
      <div className="page page-center">
        <div className="brand">Avyakt Ehsaas</div>
        <h1>Ready for the real one?</h1>
        <p className="text-muted">
          It takes {durationSec === TALK_DURATION_S ? "90 seconds" : "3 minutes"}.
          Same rules — but no feedback until the end.
        </p>
        <button
          className="btn mt-24"
          onClick={() => {
            markPracticeDone();
            nav("/run/pre");
          }}
        >
          Start test
        </button>
      </div>
    );
  }

  // Intro (with option to skip practice on same-day retest, per PDF §2.2).
  return (
    <div className="page">
      <div className="brand">Avyakt Ehsaas</div>
      <h1>How this works</h1>
      <p>
        A dot will appear on the screen at a random moment. Tap it the instant
        you see it.
      </p>
      <p>
        Don't tap before it appears — that counts against you.
      </p>
      <p className="text-muted mb-16">
        Let's try 3 practice rounds first. You'll see your reaction time after
        each one — that's only during practice.
      </p>
      <button className="btn mt-16" onClick={() => setPhase("practice")}>
        Start 3 practice taps
      </button>
      {alreadyDone && (
        <button
          className="btn btn-secondary mt-16"
          onClick={() => {
            markPracticeDone();
            nav("/run/pre");
          }}
        >
          Skip practice (already done today)
        </button>
      )}
    </div>
  );
}
