import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useFlow } from "../store";
import type { Context } from "../types";

// Screen 0 + 0a (PDF §3): landing / returning-visitor check.
export function LandingScreen() {
  const [params] = useSearchParams();
  const nav = useNavigate();
  const {
    participantId,
    participant,
    preSession,
    postSession,
    setContext,
    clearParticipant,
  } = useFlow();
  const [returning, setReturning] = useState<boolean | null>(null);

  useEffect(() => {
    const ctxParam = params.get("ctx");
    if (ctxParam === "talk" || ctxParam === "stall") {
      setContext(ctxParam as Context);
    }
  }, [params, setContext]);

  useEffect(() => {
    // A "returning" visit only counts if we have both a stored participant
    // and at least one completed pre session — otherwise let them keep going.
    setReturning(Boolean(participantId && preSession));
  }, [participantId, preSession]);

  if (returning === null) return null;

  if (returning) {
    return (
      <div className="page page-center">
        <div className="brand">Avyakt Ehsaas</div>
        <h1>Welcome back{participant?.name ? `, ${participant.name.split(" ")[0]}` : ""}.</h1>
        <p className="text-muted mb-16">
          You've already done this today. Want to see your last result, or start fresh?
        </p>
        <button
          className="btn"
          onClick={() => nav(postSession ? "/results/post" : "/results/pre")}
        >
          See my result
        </button>
        <button
          className="btn btn-secondary mt-16"
          onClick={() => {
            clearParticipant();
            nav("/consent");
          }}
        >
          This isn't me / Start fresh
        </button>
      </div>
    );
  }

  return (
    <div className="page page-center">
      <div className="brand">Avyakt Ehsaas</div>
      <h1>Attention Reset Protocol</h1>
      <p className="text-muted mb-16">
        A 90-second check on your attention, right now.
      </p>
      <button className="btn" onClick={() => nav("/consent")}>
        Start
      </button>
    </div>
  );
}
