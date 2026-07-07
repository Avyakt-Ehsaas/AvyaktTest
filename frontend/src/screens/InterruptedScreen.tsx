import { useLocation, useNavigate } from "react-router-dom";
import type { Phase } from "../types";

// Screen 5a (PDF §3): shown when Page Visibility API caught a mid-test switch.
// Partial data is dropped (per §2.2) — full restart of just that leg.
export function InterruptedScreen() {
  const nav = useNavigate();
  const loc = useLocation() as { state?: { phase?: Phase } };
  const phase = loc.state?.phase === "post" ? "post" : "pre";
  return (
    <div className="page page-center">
      <div className="brand">Avyakt Ehsaas</div>
      <h1>Looks like the test got interrupted.</h1>
      <p className="text-muted">
        No worries — let's start that part again. A partial run wouldn't be
        useful, so we don't save it.
      </p>
      <button className="btn mt-24" onClick={() => nav(`/run/${phase}`)}>
        Restart test
      </button>
    </div>
  );
}
