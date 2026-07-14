import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useFlow } from "../store";
import { api } from "../api";

// Screen 6 (PDF §3): pre-results. Talk context → straight to done.
// Stall context → offer study opt-in.
export function PreResultsScreen() {
  const nav = useNavigate();
  const { preSession, context, participantId, setParticipant } = useFlow();
  const [busy, setBusy] = useState(false);

  if (!preSession) {
    return (
      <div className="page page-center">
        <p className="text-muted">No result yet.</p>
        <button className="btn mt-16" onClick={() => nav("/")}>Go home</button>
      </div>
    );
  }

  const percentile = preSession.percentile ?? null;
  const median = preSession.medianRt != null
    ? Math.round(preSession.medianRt)
    : null;
  const duration = `${preSession.durationSeconds} seconds`;

  async function optIn() {
    if (!participantId) return;
    setBusy(true);
    try {
      const p = await api.optIn(participantId);
      setParticipant(p);
      nav("/guided");
    } catch {
      // fall through — still allow continuing to guided as arm B fallback
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page">
      <div className="brand">Avyakt Ehsaas</div>
      <h1>Here's what just happened.</h1>

      <div className="result-grid">
        <div className="card">
          <div className="result-num">{median ?? "—"}</div>
          <div className="result-label">Median RT (ms)</div>
        </div>
        <div className="card">
          <div className="result-num">{preSession.lapseCount}</div>
          <div className="result-label">Lapses</div>
        </div>
        <div className="card">
          <div className="result-num">{percentile ?? "—"}</div>
          <div className="result-label">Percentile</div>
        </div>
      </div>

      <p className="text-muted">
        Your median reaction time was <strong>{median ?? "—"}ms</strong>.
        You had <strong>{preSession.lapseCount}</strong>{" "}
        {preSession.lapseCount === 1 ? "lapse" : "lapses"} in {duration}.
        {percentile != null
          ? ` That's more consistent than ${percentile}% of people here today.`
          : ""}
      </p>

      {context === "stall" ? (
        <div className="card mt-24">
          <h2>Want to see what 3 minutes of practice actually does?</h2>
          <p className="text-muted">
            We'll retest you afterwards and show you the difference on the same
            device. Takes about 8 minutes total.
          </p>
          <button className="btn mt-16" disabled={busy} onClick={optIn}>
            Yes, I'm in
          </button>
          <button
            className="btn btn-secondary mt-16"
            onClick={() => nav("/done")}
          >
            No thanks, I'm done
          </button>
        </div>
      ) : (
        <button className="btn mt-24" onClick={() => nav("/done")}>
          Done, thanks!
        </button>
      )}
    </div>
  );
}
