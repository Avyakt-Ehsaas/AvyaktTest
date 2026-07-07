import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { StateSlider } from "../components/StateSlider";
import { useFlow } from "../store";
import { api } from "../api";
import type { Phase } from "../types";

// Screen 3 / 8 (PDF §3): identical 1-7 slider used pre and post.
export function CheckInScreen() {
  const { phase } = useParams<{ phase: Phase }>();
  const nav = useNavigate();
  const { participantId, setPreCheckin, setPostCheckin } = useFlow();
  const [v, setV] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  const p: Phase = phase === "post" ? "post" : "pre";

  async function onContinue() {
    if (v == null || !participantId) return;
    setBusy(true);
    try {
      await api.submitCheckIn({ participantId, phase: p, value: v });
      if (p === "pre") setPreCheckin(v);
      else setPostCheckin(v);
      nav(p === "pre" ? "/instructions" : "/run/post");
    } catch {
      // Non-blocking: still advance. Value is captured in local store.
      if (p === "pre") setPreCheckin(v);
      else setPostCheckin(v);
      nav(p === "pre" ? "/instructions" : "/run/post");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page">
      <div className="brand">Avyakt Ehsaas</div>
      <h1>Right now, my mind feels…</h1>
      <StateSlider value={v} onChange={setV} />
      <div style={{ flex: 1 }} />
      <button className="btn mt-24" disabled={v == null || busy} onClick={onContinue}>
        Continue
      </button>
    </div>
  );
}
