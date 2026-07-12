import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Playlist } from "../types";
import { api } from "../api";

export function PlaylistScreen() {
  const navigate = useNavigate();

  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadPlaylists = async () => {
      try {
        setLoading(true);
        setError("");

        const data = await api.getPlaylists();
        setPlaylists(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load playlists");
      } finally {
        setLoading(false);
      }
    };

    loadPlaylists();
  }, []);

  if (loading) {
    return (
      <main className="playlist-page playlist-state">
        <p>Loading playlists...</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="playlist-page playlist-state">
        <div className="playlist-error-card">
          <p>{error}</p>
          <button className="btn" onClick={() => window.location.reload()}>
            Retry
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="playlist-page">
      <section className="playlist-container">
        <div className="playlist-hero">
          <p className="playlist-kicker">Meditation Library</p>
          <h1 className="playlist-title">Discover the Perfect Meditation</h1>
          <p className="playlist-subtitle">
            Relax your mind with carefully curated guided meditation playlists.
          </p>
        </div>

        <div className="playlist-header-row">
          <div>
            <h2 className="playlist-section-title">Featured Playlists</h2>
            <p className="text-muted">Start your wellness journey today.</p>
          </div>

          <div className="playlist-count">{playlists.length} Playlists</div>
        </div>

        {playlists.length === 0 ? (
          <div className="playlist-empty">
            <div className="playlist-empty-icon">🎵</div>
            <h3>No playlists available yet</h3>
            <p>Meditation playlists will appear here.</p>
          </div>
        ) : (
          <div className="playlist-grid">
            {playlists.map((playlist) => (
              <button
                key={playlist.id}
                onClick={() => navigate(`/playlists/${playlist.id}`)}
                className="playlist-card"
              >
                <div className="playlist-cover">
                  <div className="playlist-icon">🎧</div>
                  <div className="playlist-badge">Guided Session</div>
                </div>

                <div className="playlist-body">
                  <h3 className="playlist-card-title">{playlist.title}</h3>

                  {playlist.description && (
                    <p className="playlist-desc">{playlist.description}</p>
                  )}

                  <div className="playlist-action">
                    <span className="playlist-action-text">Start Meditation</span>
                    <span className="playlist-arrow">→</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}