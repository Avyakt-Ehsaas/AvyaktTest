import { useNavigate } from "react-router-dom";
import { useFlow } from "../store";

// Screen 9a (PDF §3): pre vs post comparison — describe, do not claim
// significance (§1.4 framing discipline).
export function PostResultsScreen() {
  const nav = useNavigate();
  const { preSession, postSession, preCheckin, postCheckin } = useFlow();

  if (!preSession || !postSession) {
    return (
      <div className="page page-center">
        <p className="text-muted">Result missing.</p>
        <button className="btn mt-16" onClick={() => nav("/")}>Home</button>
      </div>
    );
  }

  const preMed = preSession.medianRt != null ? Math.round(preSession.medianRt) : null;
  const postMed = postSession.medianRt != null ? Math.round(postSession.medianRt) : null;

  const rtDelta =
    preMed != null && postMed != null ? preMed - postMed : null;
  const lapseDelta = preSession.lapseCount - postSession.lapseCount;
  const stateDelta =
    preCheckin != null && postCheckin != null ? postCheckin - preCheckin : null;

  return (
    <div className="page">
      <div className="brand">Avyakt Ehsaas</div>
      <h1>Before &amp; after</h1>

      <div className="compare">
        <div className="card">
          <div className="tag">Before</div>
          <div className="result-num mt-16">{preMed ?? "—"}</div>
          <div className="result-label">Median ms</div>
          <div className="text-muted mt-16">
            {preSession.lapseCount} {preSession.lapseCount === 1 ? "lapse" : "lapses"}
          </div>
        </div>
        <div className="card">
          <div className="tag">After</div>
          <div className="result-num mt-16">{postMed ?? "—"}</div>
          <div className="result-label">Median ms</div>
          <div className="text-muted mt-16">
            {postSession.lapseCount} {postSession.lapseCount === 1 ? "lapse" : "lapses"}
          </div>
        </div>
      </div>

      {stateDelta != null && (
        <div className="card">
          <p style={{ margin: 0 }}>
            <strong>How your mind felt: </strong>
            {preCheckin} → {postCheckin}{" "}
            <span className="text-muted">
              ({stateDelta > 0 ? "+" : ""}
              {stateDelta})
            </span>
          </p>
        </div>
      )}

      <p className="text-muted mt-16">
        {lapseDelta > 0
          ? `Your lapses went from ${preSession.lapseCount} to ${postSession.lapseCount}. That's a real shift — well done staying with it.`
          : rtDelta != null && rtDelta > 0
          ? `Your median reaction time dropped by ${rtDelta}ms. Small numbers, real changes.`
          : "Practice effects vary. This is your snapshot from today, not a diagnosis."}
      </p>

      <button className="btn mt-24" onClick={() => nav("/done")}>
        Continue
      </button>
    </div>
  );
}
