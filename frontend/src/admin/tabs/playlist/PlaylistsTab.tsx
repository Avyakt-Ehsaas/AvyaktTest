import { useEffect, useMemo, useState } from "react";
import { adminApi } from "../../adminApi";
import type { PlaylistRow } from "../../adminTypes";
import { useNavigate } from "react-router-dom";
import "./playlist.css";

interface Props {
  onUnauth: () => void;
}

export function PlaylistsTab({ onUnauth }: Props) {
  const [playlists, setPlaylists] = useState<PlaylistRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showAddAudioModal, setShowAddAudioModal] = useState(false);

  const [selectedPlaylist, setSelectedPlaylist] =
    useState<PlaylistRow | null>(null);

  const [showEditOptions, setShowEditOptions] = useState(false);

  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");

  const [showAddModal, setShowAddModal] = useState(false);


  function handleViewAudios(playlistId: string) {
    navigate(`/admin/playlists/${playlistId}`);
  }

  function handleEditPlaylist(playlist: PlaylistRow) {
    setSelectedPlaylist(playlist);
    setShowEditOptions(true);
  }

  function handleAddAudio(playlist: PlaylistRow) {
    setSelectedPlaylist(playlist);
    setShowEditOptions(false);
    setShowAddAudioModal(true);
  }

  function loadPlaylists() {
    setLoading(true);
    setError(null);

    adminApi
      .playlists()
      .then((response) => {
        setPlaylists(response.data);
      })
      .catch((err: Error) => {
        if (err.message === "UNAUTHORIZED") {
          onUnauth();
          return;
        }

        setError(err.message);
      })
      .finally(() => {
        setLoading(false);
      });
  }

  useEffect(() => {
    loadPlaylists();
  }, []);

  const filteredPlaylists = useMemo(() => {
    const query = search.trim().toLowerCase();

    return playlists.filter((playlist) => {
      const matchesSearch =
        !query ||
        playlist.title.toLowerCase().includes(query) ||
        playlist.description?.toLowerCase().includes(query);

      const matchesStatus =
        status === "all" ||
        (status === "active" && playlist.isActive) ||
        (status === "inactive" && !playlist.isActive);

      return matchesSearch && matchesStatus;
    });
  }, [playlists, search, status]);

  if (loading) {
    return <div className="admin-loading">Loading playlists…</div>;
  }

  if (error) {
    return (
      <div className="admin-error">
        <span>{error}</span>

        <button
          className="btn"
          style={{ width: "auto" }}
          onClick={loadPlaylists}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Page header */}
      <div className="playlist-admin-header">
        <div>
          <h2
            className="admin-section-title"
            style={{
              margin: 0,
              borderBottom: "none",
              paddingBottom: 0,
            }}
          >
            Playlists
          </h2>

          <p className="playlist-admin-subtitle">
            Manage playlists and the audio tracks available to participants.
          </p>
        </div>

        <button
          type="button"
          className="btn playlist-add-btn"
          onClick={() => setShowAddModal(true)}
        >
          <span className="playlist-add-icon">+</span>
          Add Playlist
        </button>
      </div>

      {/* KPI cards */}
      <div className="playlist-kpi-grid">
        <div className="admin-kpi-card">
          <div className="admin-kpi-value">{playlists.length}</div>
          <div className="admin-kpi-label">Total Playlists</div>
        </div>

        <div className="admin-kpi-card">
          <div className="admin-kpi-value">
            {playlists.filter((playlist) => playlist.isActive).length}
          </div>
          <div className="admin-kpi-label">Active Playlists</div>
        </div>

        <div className="admin-kpi-card">
          <div className="admin-kpi-value">
            {playlists.reduce(
              (total, playlist) => total + playlist.totalAudios,
              0,
            )}
          </div>
          <div className="admin-kpi-label">Total Audios</div>
        </div>
      </div>

      {/* Search and filters */}
      <div className="admin-filter-bar">
        <input
          type="search"
          className="admin-filter-input"
          placeholder="Search playlists..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />

        <select
          className="admin-filter-select"
          value={status}
          onChange={(event) => setStatus(event.target.value)}
        >
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>

        <span className="playlist-result-count">
          {filteredPlaylists.length} playlist
          {filteredPlaylists.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Empty state */}
      {filteredPlaylists.length === 0 ? (
        <div className="playlist-empty-state">
          <div className="playlist-empty-icon">♫</div>

          <h3>
            {playlists.length === 0
              ? "No playlists created yet"
              : "No matching playlists"}
          </h3>

          <p>
            {playlists.length === 0
              ? "Create your first playlist and add audio tracks to it."
              : "Try changing the search text or status filter."}
          </p>

          {playlists.length === 0 && (
            <button
              type="button"
              className="btn playlist-empty-btn"
              onClick={() => setShowAddModal(true)}
            >
              + Create Playlist
            </button>
          )}
        </div>
      ) : (
        <div className="playlist-admin-grid">
          {filteredPlaylists.map((playlist) => (
            <PlaylistCard
              key={playlist.id}
              playlist={playlist}
              onViewAudios={handleViewAudios}
              onEdit={handleEditPlaylist}
            />
          ))}
        </div>
      )}

      {/* Add playlist modal */}
      {showAddModal && (
        <AddPlaylistModal
          onClose={() => setShowAddModal(false)}
          onCreated={() => {
            setShowAddModal(false);
            loadPlaylists();
          }}
          onUnauth={onUnauth}
        />
      )}

      {showEditOptions && selectedPlaylist && (
        <PlaylistEditOptionsModal
          playlist={selectedPlaylist}
          onAddAudio={() => handleAddAudio(selectedPlaylist)}
          onClose={() => {
            setShowEditOptions(false);
            setSelectedPlaylist(null);
          }}
          onDeleted={() => {
            setShowEditOptions(false);
            setSelectedPlaylist(null);
            loadPlaylists();
          }}
          onUnauth={onUnauth}
        />
      )}

      {showAddAudioModal && selectedPlaylist && (
        <AddAudioModal
          playlist={selectedPlaylist}
          onClose={() => {
            setShowAddAudioModal(false);
            setSelectedPlaylist(null);
          }}
          onCreated={() => {
            setShowAddAudioModal(false);
            setSelectedPlaylist(null);
            loadPlaylists();
          }}
          onUnauth={onUnauth}
        />
      )}
    </div>
  );
}
interface PlaylistCardProps {
  playlist: PlaylistRow;
  onViewAudios: (playlistId: string) => void;
  onEdit: (playlist: PlaylistRow) => void;
}

function PlaylistCard({
  playlist,
  onViewAudios,
  onEdit,
}: PlaylistCardProps) {
  const duration =
    playlist.estimatedDurationMinutes > 0
      ? `${playlist.estimatedDurationMinutes} min`
      : "Duration not set";

  return (
    <article className="playlist-admin-card">
      <div className="playlist-cover-wrap">
        {playlist.coverImageUrl ? (
          <img
            src={playlist.coverImageUrl}
            alt={playlist.title}
            className="playlist-cover-image"
          />
        ) : (
          <div className="playlist-cover-placeholder">
            <span>♫</span>
          </div>
        )}

        <span
          className={`playlist-status-badge ${playlist.isActive
            ? "playlist-status-active"
            : "playlist-status-inactive"
            }`}
        >
          {playlist.isActive ? "Active" : "Inactive"}
        </span>
      </div>

      <div className="playlist-card-body">
        <h3 className="playlist-card-title">{playlist.title}</h3>

        <p className="playlist-card-description">
          {playlist.description || "No description added."}
        </p>

        <div className="playlist-card-meta">
          <div className="playlist-meta-item">
            <span className="playlist-meta-value">
              {playlist.totalAudios}
            </span>
            <span className="playlist-meta-label">Audios</span>
          </div>

          <div className="playlist-meta-divider" />

          <div className="playlist-meta-item">
            <span className="playlist-meta-value">{duration}</span>
            <span className="playlist-meta-label">Duration</span>
          </div>
        </div>

        <div className="playlist-card-actions">
          <button
            type="button"
            className="playlist-action-btn"
            onClick={() => onViewAudios(playlist.id)}
          >
            View Audios
          </button>

          <button
            type="button"
            className="playlist-action-btn playlist-action-edit"
            onClick={() => onEdit(playlist)}
          >
            Edit
          </button>
        </div>
      </div>
    </article>
  );
}

interface PlaylistEditOptionsModalProps {
  playlist: PlaylistRow;
  onClose: () => void;
  onDeleted: () => void;
  onAddAudio: () => void;
  onUnauth: () => void;
}

function PlaylistEditOptionsModal({
  playlist,
  onClose,
  onDeleted,
  onAddAudio,
  onUnauth,
}: PlaylistEditOptionsModalProps) {
  
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleAddAudio() {
    onAddAudio();
  }

  async function handleDeletePlaylist() {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${playlist.title}"?`,
    );

    if (!confirmed) return;

    try {
      setDeleting(true);
      setError(null);

      await adminApi.deletePlaylist(playlist.id);

      onDeleted();
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Failed to delete playlist.";

      if (message === "UNAUTHORIZED") {
        onUnauth();
        return;
      }

      setError(message);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <div
        className="admin-detail-overlay"
        onClick={onClose}
      />

      <div className="playlist-edit-options-modal">
        <div className="admin-detail-header">
          <div>
            <h2 className="playlist-modal-title">
              Manage Playlist
            </h2>

            <p className="playlist-modal-subtitle">
              {playlist.title}
            </p>
          </div>

          <button
            type="button"
            className="admin-detail-close"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="playlist-edit-options-body">
          <button
            type="button"
            className="playlist-option-card"
            onClick={handleAddAudio}
          >
            <span className="playlist-option-icon">＋</span>

            <span>
              <strong>Add Audio</strong>
              <small>Add a new audio track to this playlist.</small>
            </span>
          </button>

          <button
            type="button"
            className="playlist-option-card playlist-delete-option"
            onClick={handleDeletePlaylist}
            disabled={deleting}
          >
            <span className="playlist-option-icon">🗑</span>

            <span>
              <strong>
                {deleting ? "Deleting..." : "Delete Playlist"}
              </strong>

              <small>
                Permanently remove this playlist and its audios.
              </small>
            </span>
          </button>

          {error && <div className="err">{error}</div>}
        </div>
      </div>
    </>
  );
}




interface AddPlaylistModalProps {
  onClose: () => void;
  onCreated: () => void;
  onUnauth: () => void;
}

function AddPlaylistModal({
  onClose,
  onCreated,
  onUnauth,
}: AddPlaylistModalProps) {
  const [form, setForm] = useState({
    title: "",
    description: "",
    coverImageUrl: "",
    estimatedDurationMinutes: "",
    isActive: true,
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.title.trim()) {
      setError("Playlist title is required.");
      return;
    }

    setSubmitting(true);
    setError(null);

    adminApi
      .createPlaylist({
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        coverImageUrl: form.coverImageUrl.trim() || undefined,
        estimatedDurationMinutes:
          Number(form.estimatedDurationMinutes) || 0,
        isActive: form.isActive,
      })
      .then(onCreated)
      .catch((err: Error) => {
        if (err.message === "UNAUTHORIZED") {
          onUnauth();
          return;
        }

        setError(err.message);
      })
      .finally(() => {
        setSubmitting(false);
      });
  }

  return (
    <>
      <div
        className="admin-detail-overlay"
        onClick={onClose}
      />

      <div className="playlist-modal">
        <div className="admin-detail-header">
          <div>
            <h2 className="playlist-modal-title">
              Add Playlist
            </h2>

            <p className="playlist-modal-subtitle">
              Create a new playlist for guided sessions.
            </p>
          </div>

          <button
            type="button"
            className="admin-detail-close"
            onClick={onClose}
            aria-label="Close modal"
          >
            ×
          </button>
        </div>

        <form
          className="playlist-modal-body"
          onSubmit={handleSubmit}
        >
          <div className="playlist-form-group">
            <label htmlFor="playlist-title">
              Playlist title <span>*</span>
            </label>

            <input
              id="playlist-title"
              className="admin-input"
              placeholder="Corporate Mindfulness Playlist"
              value={form.title}
              autoFocus
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  title: event.target.value,
                }))
              }
            />
          </div>

          <div className="playlist-form-group">
            <label htmlFor="playlist-description">
              Description
            </label>

            <textarea
              id="playlist-description"
              className="admin-input playlist-textarea"
              placeholder="Short description about this playlist..."
              value={form.description}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  description: event.target.value,
                }))
              }
            />
          </div>

          <div className="playlist-form-group">
            <label htmlFor="playlist-image">
              Cover image URL
            </label>

            <input
              id="playlist-image"
              className="admin-input"
              placeholder="https://example.com/cover.jpg"
              value={form.coverImageUrl}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  coverImageUrl: event.target.value,
                }))
              }
            />
          </div>

          <div className="playlist-form-group">
            <label htmlFor="playlist-duration">
              Estimated duration
            </label>

            <input
              id="playlist-duration"
              type="number"
              min="0"
              className="admin-input"
              placeholder="39"
              value={form.estimatedDurationMinutes}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  estimatedDurationMinutes:
                    event.target.value,
                }))
              }
            />

            <small>Duration in minutes</small>
          </div>

          <label className="playlist-checkbox-row">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  isActive: event.target.checked,
                }))
              }
            />

            <span>
              <strong>Active playlist</strong>
              <small>
                Active playlists will be visible to participants.
              </small>
            </span>
          </label>

          {error && <div className="err">{error}</div>}

          <div className="playlist-modal-actions">
            <button
              type="button"
              className="playlist-cancel-btn"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="btn playlist-submit-btn"
              disabled={submitting || !form.title.trim()}
            >
              {submitting ? "Creating…" : "Create Playlist"}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
interface AddAudioModalProps {
  playlist: PlaylistRow;
  onClose: () => void;
  onCreated: () => void;
  onUnauth: () => void;
}

function AddAudioModal({
  playlist,
  onClose,
  onCreated,
  onUnauth,
}: AddAudioModalProps) {
  const [form, setForm] = useState({
    title: "",
    description: "",
    thumbnailUrl: "",
    durationMinutes: "",
    durationSeconds: "",
    audioOrder: String(playlist.totalAudios + 1),
    isActive: true,
  });

  const [audioFile, setAudioFile] = useState<File | null>(
    null,
  );

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateForm(
    field: keyof typeof form,
    value: string | boolean,
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!form.title.trim()) {
      setError("Audio title is required.");
      return;
    }

    if (!audioFile) {
      setError("Please select an audio file.");
      return;
    }

    const allowedTypes = [
      "audio/mpeg",
      "audio/mp3",
      "audio/wav",
      "audio/x-wav",
      "audio/ogg",
      "audio/mp4",
      "audio/x-m4a",
    ];

    if (
      audioFile.type &&
      !allowedTypes.includes(audioFile.type)
    ) {
      setError(
        "Please select a valid MP3, WAV, OGG or M4A audio file.",
      );
      return;
    }

    const maxFileSize = 100 * 1024 * 1024;

    if (audioFile.size > maxFileSize) {
      setError("Audio file must be smaller than 100 MB.");
      return;
    }

    const minutes = Number(form.durationMinutes) || 0;
    const seconds = Number(form.durationSeconds) || 0;

    if (
      minutes < 0 ||
      seconds < 0 ||
      seconds > 59
    ) {
      setError("Please enter a valid audio duration.");
      return;
    }

    const totalDurationSeconds =
      minutes * 60 + seconds;

    if (totalDurationSeconds <= 0) {
      setError("Audio duration must be greater than zero.");
      return;
    }

    const parsedOrder =
      Number(form.audioOrder) ||
      playlist.totalAudios + 1;

    if (!Number.isInteger(parsedOrder) || parsedOrder <= 0) {
      setError("Audio order must be a positive number.");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      await adminApi.addAudioToPlaylist(playlist.id, {
        title: form.title.trim(),
        description:
          form.description.trim() || undefined,
        audioFile,
        thumbnailUrl:
          form.thumbnailUrl.trim() || undefined,
        durationSeconds: totalDurationSeconds,
        audioOrder: parsedOrder,
        isActive: form.isActive,
      });

      onCreated();
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Failed to upload audio.";

      if (message === "UNAUTHORIZED") {
        onUnauth();
        return;
      }

      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <div
        className="admin-detail-overlay"
        onClick={submitting ? undefined : onClose}
      />

      <div className="playlist-modal add-audio-modal">
        <div className="admin-detail-header">
          <div>
            <h2 className="playlist-modal-title">
              Add Audio
            </h2>

            <p className="playlist-modal-subtitle">
              Add a new audio to{" "}
              <strong>{playlist.title}</strong>
            </p>
          </div>

          <button
            type="button"
            className="admin-detail-close"
            onClick={onClose}
            disabled={submitting}
            aria-label="Close modal"
          >
            ×
          </button>
        </div>

        <form
          className="playlist-modal-body"
          onSubmit={handleSubmit}
        >
          <div className="playlist-form-group">
            <label htmlFor="audio-title">
              Audio title <span>*</span>
            </label>

            <input
              id="audio-title"
              type="text"
              className="admin-input"
              placeholder="Morning Mindfulness"
              value={form.title}
              autoFocus
              disabled={submitting}
              onChange={(event) =>
                updateForm("title", event.target.value)
              }
            />
          </div>

          <div className="playlist-form-group">
            <label htmlFor="audio-description">
              Description
            </label>

            <textarea
              id="audio-description"
              className="admin-input playlist-textarea"
              placeholder="Enter a short description..."
              value={form.description}
              disabled={submitting}
              onChange={(event) =>
                updateForm(
                  "description",
                  event.target.value,
                )
              }
            />
          </div>

          <div className="playlist-form-group">
            <label htmlFor="audio-file">
              Audio file <span>*</span>
            </label>

            <input
              id="audio-file"
              type="file"
              className="admin-input"
              accept=".mp3,.wav,.ogg,.m4a,audio/*"
              disabled={submitting}
              onChange={(event) => {
                const selectedFile =
                  event.target.files?.[0] || null;

                setAudioFile(selectedFile);
                setError(null);
              }}
            />

            {audioFile ? (
              <div className="selected-audio-file">
                <strong>{audioFile.name}</strong>

                <small>
                  {(
                    audioFile.size /
                    1024 /
                    1024
                  ).toFixed(2)}{" "}
                  MB
                </small>
              </div>
            ) : (
              <small>
                Select an MP3, WAV, OGG or M4A audio
                file.
              </small>
            )}
          </div>

          <div className="playlist-form-group">
            <label htmlFor="audio-thumbnail">
              Thumbnail URL
            </label>

            <input
              id="audio-thumbnail"
              type="url"
              className="admin-input"
              placeholder="https://example.com/thumbnail.jpg"
              value={form.thumbnailUrl}
              disabled={submitting}
              onChange={(event) =>
                updateForm(
                  "thumbnailUrl",
                  event.target.value,
                )
              }
            />
          </div>

          <div className="audio-form-row">
            <div className="playlist-form-group">
              <label htmlFor="audio-minutes">
                Minutes
              </label>

              <input
                id="audio-minutes"
                type="number"
                min="0"
                className="admin-input"
                placeholder="5"
                value={form.durationMinutes}
                disabled={submitting}
                onChange={(event) =>
                  updateForm(
                    "durationMinutes",
                    event.target.value,
                  )
                }
              />
            </div>

            <div className="playlist-form-group">
              <label htmlFor="audio-seconds">
                Seconds
              </label>

              <input
                id="audio-seconds"
                type="number"
                min="0"
                max="59"
                className="admin-input"
                placeholder="30"
                value={form.durationSeconds}
                disabled={submitting}
                onChange={(event) =>
                  updateForm(
                    "durationSeconds",
                    event.target.value,
                  )
                }
              />
            </div>

            <div className="playlist-form-group">
              <label htmlFor="audio-order">
                Audio order
              </label>

              <input
                id="audio-order"
                type="number"
                min="1"
                className="admin-input"
                value={form.audioOrder}
                disabled={submitting}
                onChange={(event) =>
                  updateForm(
                    "audioOrder",
                    event.target.value,
                  )
                }
              />
            </div>
          </div>

          <label className="playlist-checkbox-row">
            <input
              type="checkbox"
              checked={form.isActive}
              disabled={submitting}
              onChange={(event) =>
                updateForm(
                  "isActive",
                  event.target.checked,
                )
              }
            />

            <span>
              <strong>Active audio</strong>

              <small>
                Active audio will be visible to
                participants.
              </small>
            </span>
          </label>

          {error && <div className="err">{error}</div>}

          <div className="playlist-modal-actions">
            <button
              type="button"
              className="playlist-cancel-btn"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="btn playlist-submit-btn"
              disabled={
                submitting ||
                !form.title.trim() ||
                !audioFile
              }
            >
              {submitting
                ? "Uploading…"
                : "Upload Audio"}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}