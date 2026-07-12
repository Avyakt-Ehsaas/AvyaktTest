import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import type { PlaylistDetail } from "../types";
import { api } from "../api";
import { LockedPlayerModal } from "../components/LockedPlayerModal.tsx"

export function PlaylistDetailScreen() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [playlist, setPlaylist] = useState<PlaylistDetail | null>(null);
    const [selectedAudio, setSelectedAudio] = useState<string>("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [playerOpen, setPlayerOpen] = useState(false);
    const [audioCompleted, setAudioCompleted] = useState(false);
    const [holdProgress, setHoldProgress] = useState(0);
    const [holdTimer, setHoldTimer] = useState<number | null>(null);

    const openPlayer = (audioUrl: string) => {
        setSelectedAudio(audioUrl);
        setAudioCompleted(false);
        setPlayerOpen(true);
    };

    const closePlayer = () => {
        if (!audioCompleted) return;

        setPlayerOpen(false);
        setAudioCompleted(false);
        setHoldProgress(0);

        if (holdTimer) {
            window.clearInterval(holdTimer);
            setHoldTimer(null);
        }
    };

    const startHoldToExit = () => {
        if (holdTimer) return;
        let progress = 0;

        const timer = window.setInterval(() => {
            progress += 1;
            setHoldProgress(progress);

            if (progress >= 5) {
                window.clearInterval(timer);
                setHoldTimer(null);
                setHoldProgress(0);
                setAudioCompleted(false);
                setPlayerOpen(false);
            }
        }, 1000);

        setHoldTimer(timer);
    };

    const cancelHoldToExit = () => {
        if (holdTimer) {
            window.clearInterval(holdTimer);
        }

        setHoldTimer(null);
        setHoldProgress(0);
    };


    useEffect(() => {
        if (!playerOpen) return;

        window.history.pushState(null, "", window.location.href);

        const preventBack = () => {
            window.history.pushState(null, "", window.location.href);
        };

        window.addEventListener("popstate", preventBack);

        return () => {
            window.removeEventListener("popstate", preventBack);
        };
    }, [playerOpen]);

    useEffect(() => {
        const loadPlaylist = async () => {
            if (!id) return;

            try {
                setLoading(true);
                setError("");

                const data = await api.getPlaylist(id);
                setPlaylist(data);

                if (data.audios && data.audios.length > 0) {
                    setSelectedAudio(data.audios[0].audioUrl);
                }
            } catch (err) {
                setError(err instanceof Error ? err.message : "Failed to load playlist");
            } finally {
                setLoading(false);
            }
        };

        loadPlaylist();
    }, [id]);

    if (loading) {
        return (
            <main className="playlist-detail-page playlist-state">
                Loading playlist...
            </main>
        );
    }

    if (error || !playlist) {
        return (
            <main className="playlist-detail-page playlist-state">
                <div className="playlist-error-card">
                    <p>{error || "Playlist not found"}</p>
                    {!playerOpen && (
                        <button
                            className="back-btn"
                            onClick={() => navigate(-1)}
                        >
                            ← Back
                        </button>
                    )}
                </div>
            </main>
        );
    }

    const audios = playlist.audios ?? [];

    const currentAudio = audios.find(
        (audio) => audio.audioUrl === selectedAudio
    );

    return (
        <main className="playlist-detail-page">
            <section className="playlist-detail-container">

                {!playerOpen && (
                    <button className="back-btn" onClick={() => navigate(-1)}>
                        ← Back
                    </button>
                )}

                <div className="playlist-detail-hero">
                    <div>
                        <p className="playlist-kicker">Guided Session</p>
                        <h1 className="playlist-detail-title">{playlist.title}</h1>

                        {playlist.description && (
                            <p className="playlist-detail-subtitle">{playlist.description}</p>
                        )}
                    </div>

                    <div className="playlist-detail-icon">🎧</div>
                </div>

               
                    <div className="audio-layout only-list">
                        <div className="track-list-card">
                            <h2>Playlist Audios</h2>

                            {audios.length === 0 ? (
                                <p className="text-muted">No audios available in this playlist.</p>
                            ) : (
                                <div className="track-list">
                                    {audios.map((audio, index) => (
                                        <button
                                            key={audio.id}
                                            className={
                                                selectedAudio === audio.audioUrl
                                                    ? "track-item active"
                                                    : "track-item"
                                            }
                                            onClick={() => openPlayer(audio.audioUrl)}
                                        >
                                            <span className="track-number">{index + 1}</span>

                                            <span className="track-info">
                                                <strong>{audio.title}</strong>
                                                {audio.durationSeconds && (
                                                    <small>{Math.round(audio.durationSeconds / 60)} min</small>
                                                )}
                                            </span>

                                            <span className="track-play">▶</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                
            </section>

            {playerOpen && (
                <LockedPlayerModal
                    title={currentAudio?.title || "Meditation Audio"}
                    audioUrl={selectedAudio}
                    audioCompleted={audioCompleted}
                    holdProgress={holdProgress}
                    onAudioEnd={() => setAudioCompleted(true)}
                    onComplete={closePlayer}
                    onHoldStart={startHoldToExit}
                    onHoldCancel={cancelHoldToExit}
                />
            )}
        </main>
    );
}