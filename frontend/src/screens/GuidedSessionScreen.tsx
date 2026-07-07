import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ProgressRing } from "../components/ProgressRing";
import { useFlow } from "../store";
import { api } from "../api";
import { guidedDurationSeconds } from "../types";

// Screens 7a / 7b (PDF §3): guided session (Arm A) or quiet timer (Arm B).
// Both have identical visual polish (§3 Screen 7b) so control-arm participants
// don't perceive it as less legitimate — that would bias engagement.
export function GuidedSessionScreen() {
  const nav = useNavigate();
  const {
    participant,
    participantId,
    setGuidedSessionId,
    guidedSessionId,
  } = useFlow();
  const arm = participant?.studyArm ?? "B";
  const durationSec = guidedDurationSeconds();
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [audioStarted, setAudioStarted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Create the guided session record on mount.
  useEffect(() => {
    if (!participantId || guidedSessionId) return;
    api
      .startGuided({ participantId, studyArm: arm, durationSeconds: durationSec })
      .then((r) => setGuidedSessionId(r.id))
      .catch(() => setError("Couldn't reach server — session runs locally."));
  }, [participantId, arm, guidedSessionId, setGuidedSessionId]);

  // Ticker
  useEffect(() => {
    startRef.current = performance.now();
    let raf = 0;
    const tick = () => {
      if (startRef.current == null) return;
      const e = (performance.now() - startRef.current) / 1000;
      setElapsed(e);
      if (e >= durationSec) {
        if (guidedSessionId) {
          api.completeGuided(guidedSessionId).catch(() => {});
        }
        nav("/checkin/post");
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [durationSec, guidedSessionId, nav]);

  function togglePlay() {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) {
      a.play()
        .then(() => setAudioStarted(true))
        .catch(() => setError("Audio couldn't play. Try again."));
    } else {
      a.pause();
    }
  }

  const remainingSec = Math.max(0, Math.ceil(durationSec - elapsed));
  const label = `${String(Math.floor(remainingSec / 60))}:${String(
    remainingSec % 60
  ).padStart(2, "0")}`;

  return (
    <div className="page page-center">
      <div className="brand">Avyakt Ehsaas</div>
      {arm === "A" ? (
        <>
          <h1>3 minutes of guided reset</h1>
          <p className="text-muted">
            Find a comfortable position. Headphones help.
          </p>
        </>
      ) : (
        <>
          <h1>Just sit quietly for the next 3 minutes.</h1>
          <p className="text-muted">No instructions, just wait.</p>
        </>
      )}

      <ProgressRing progress={elapsed / durationSec} label={label} />

      {arm === "A" && (
        <>
          <audio
            ref={audioRef}
            preload="auto"
            // Placeholder — record & host per PDF §6.1 (Pre-Meeting Reset).
            src="/audio/guided-reset.mp3"
          />
          <button className="btn mt-16" onClick={togglePlay}>
            {audioStarted && !audioRef.current?.paused ? "Pause" : "Play"}
          </button>
        </>
      )}

      {error && <div className="err mt-16">{error}</div>}
    </div>
  );
}
