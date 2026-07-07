import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useFlow } from "../store";

// Screen 1 (PDF §3): consent + context. Context is set from ?ctx= URL param
// (already handled in Landing). All required checkboxes must be ticked;
// the 4th (future contact) stays opt-in and visually distinct.
export function ConsentScreen() {
  const nav = useNavigate();
  const { context } = useFlow();
  const [c, setC] = useState({
    consentDataUse: false,
    consentScoreDisplay: false,
    consentAnonAggregate: false,
    consentFutureContact: false,
  });

  const requiredAll =
    c.consentDataUse && c.consentScoreDisplay && c.consentAnonAggregate;

  return (
    <div className="page">
      <div className="brand">Avyakt Ehsaas</div>
      <h1>Before we start, a few quick things.</h1>

      <label className="consent-row">
        <input
          type="checkbox"
          checked={c.consentDataUse}
          onChange={(e) => setC({ ...c, consentDataUse: e.target.checked })}
        />
        <span className="txt">
          I understand my reaction-time and self-report data will be recorded
          and used to analyze how a brief practice session affects attention.
        </span>
      </label>

      <label className="consent-row">
        <input
          type="checkbox"
          checked={c.consentScoreDisplay}
          onChange={(e) => setC({ ...c, consentScoreDisplay: e.target.checked })}
        />
        <span className="txt">
          My personal score can be shown to me on-screen at the end of the session.
        </span>
      </label>

      <label className="consent-row">
        <input
          type="checkbox"
          checked={c.consentAnonAggregate}
          onChange={(e) =>
            setC({ ...c, consentAnonAggregate: e.target.checked })
          }
        />
        <span className="txt">
          My anonymized results can be included in the aggregate shown live
          on-stage / at the stall today.
        </span>
      </label>

      <div className="consent-divider" />
      <div className="optional-tag">Optional</div>
      <label className="consent-row">
        <input
          type="checkbox"
          checked={c.consentFutureContact}
          onChange={(e) =>
            setC({ ...c, consentFutureContact: e.target.checked })
          }
        />
        <span className="txt">
          You can contact me later about follow-up research or programs.
        </span>
      </label>

      <div style={{ flex: 1 }} />
      <button
        className="btn mt-24"
        disabled={!requiredAll}
        onClick={() => nav("/self-report", { state: { consent: c, context } })}
      >
        Start
      </button>
      {!requiredAll && (
        <div className="err mt-16">
          Please check the three required boxes to start.
        </div>
      )}
    </div>
  );
}
