import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ProgressRing } from "../components/ProgressRing";
import { useFlow } from "../store";
import { api } from "../api";
import { guidedDurationSeconds } from "../types";
import type { PlaylistAudio } from "../types";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5001";

function resolveAudioUrl(audioUrl: string) {
  if (!audioUrl) return "";
  if (audioUrl.startsWith("http://") || audioUrl.startsWith("https://")) return audioUrl;
  return `${BACKEND_URL}${audioUrl}`;
}

// Screens 7a / 7b (PDF §3): guided session (Arm A) or quiet timer (Arm B).
// Arm A plays the first audio from the active playlist; Arm B is a quiet timer.
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

  // Active playlist state for Arm A
  const [activeAudio, setActiveAudio] = useState<PlaylistAudio | null>(null);
  const [playlistLoadError, setPlaylistLoadError] = useState(false);
  const progressTrackedRef = useRef(false);

  // Fetch active playlist for Arm A
  useEffect(() => {
    if (arm !== "A") return;
    api.getActivePlaylist()
      .then((playlist) => {
        const firstAudio = playlist?.audios?.find((a) => a.isActive);
        if (firstAudio) setActiveAudio(firstAudio);
        else setPlaylistLoadError(true);
      })
      .catch(() => setPlaylistLoadError(true));
  }, [arm]);

  // Create the guided session record on mount.
  useEffect(() => {
    if (!participantId || guidedSessionId) return;
    api
      .startGuided({ participantId, studyArm: arm, durationSeconds: durationSec })
      .then((r) => setGuidedSessionId(r.id))
      .catch(() => setError("Couldn't reach server — session runs locally."));
  }, [participantId, arm, guidedSessionId, setGuidedSessionId]);

  // Track audio play start (for Arm A playlist progress)
  function trackStart() {
    if (!activeAudio || !participantId || progressTrackedRef.current) return;
    const sessionId = `guided-${participantId}`;
    api.updatePlaylistProgress({
      sessionId,
      userId: participantId,
      playlistId: activeAudio.playlistId,
      audioId: activeAudio.id,
      playedDurationSeconds: 0,
      completionPercentage: 0,
    }).catch(() => {});
  }

  // Track audio completion (for Arm A playlist progress)
  function trackCompletion(playedSec: number) {
    if (!activeAudio || !participantId) return;
    const sessionId = `guided-${participantId}`;
    const totalSec = activeAudio.durationSeconds || durationSec;
    const pct = Math.min(100, Math.round((playedSec / totalSec) * 100));
    api.updatePlaylistProgress({
      sessionId,
      userId: participantId,
      playlistId: activeAudio.playlistId,
      audioId: activeAudio.id,
      playedDurationSeconds: playedSec,
      completionPercentage: pct,
    }).catch(() => {});
  }

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
        // Track partial/full completion when timer ends
        if (arm === "A" && !progressTrackedRef.current) {
          progressTrackedRef.current = true;
          const playedSec = audioRef.current?.currentTime ?? e;
          trackCompletion(Math.round(playedSec));
        }
        nav("/checkin/post");
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [durationSec, guidedSessionId, nav]);

  function togglePlay() {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) {
      a.play()
        .then(() => {
          setAudioStarted(true);
          trackStart();
        })
        .catch(() => setError("Audio couldn't play. Try again."));
    } else {
      a.pause();
    }
  }

  function handleAudioEnded() {
    if (!progressTrackedRef.current) {
      progressTrackedRef.current = true;
      trackCompletion(activeAudio?.durationSeconds ?? durationSec);
    }
  }

  const remainingSec = Math.max(0, Math.ceil(durationSec - elapsed));
  const label = `${String(Math.floor(remainingSec / 60))}:${String(
    remainingSec % 60
  ).padStart(2, "0")}`;

  const audioSrc = arm === "A"
    ? (activeAudio ? resolveAudioUrl(activeAudio.audioUrl) : "")
    : "";

  return (
    <div className="page page-center">
      <div className="brand">Avyakt Ehsaas</div>
      {arm === "A" ? (
        <>
          <h1>3 minutes of guided reset</h1>
          <p className="text-muted">
            {activeAudio ? activeAudio.title : "Find a comfortable position. Headphones help."}
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
          {playlistLoadError && (
            <p className="text-muted" style={{ fontSize: "0.85rem" }}>
              No active playlist found — timer-only mode.
            </p>
          )}
          {audioSrc && (
            <>
              <audio
                ref={audioRef}
                preload="auto"
                src={audioSrc}
                onEnded={handleAudioEnded}
              />
              <button className="btn mt-16" onClick={togglePlay}>
                {audioStarted && !audioRef.current?.paused ? "Pause" : "Play"}
              </button>
            </>
          )}
        </>
      )}

      {error && <div className="err mt-16">{error}</div>}
    </div>
  );
}
