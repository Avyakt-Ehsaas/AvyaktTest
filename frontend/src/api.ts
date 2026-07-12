import type {
  Context,
  Participant,
  ParticipantForm,
  Phase,
  SessionResult,
  StudyArm,
  Trial,
  Playlist,
  PlaylistDetail,
  ApiResponse,

} from "./types";

const API = "/api";

async function req<T>(path: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(API + path, {
    ...opts,
    headers: { "Content-Type": "application/json", ...(opts?.headers || {}) },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

export const api = {
  createParticipant(form: ParticipantForm): Promise<Participant> {
    return req<Participant>("/participants", {
      method: "POST",
      body: JSON.stringify(form),
    });
  },

  getParticipant(id: string): Promise<Participant> {
    return req<Participant>(`/participants/${id}`);
  },

  optIn(id: string): Promise<Participant> {
    return req<Participant>(`/participants/${id}/opt-in`, { method: "POST" });
  },

  submitSession(payload: {
    participantId: string;
    phase: Phase;
    context: Context;
    durationSeconds: number;
    status?: "completed" | "interrupted";
    trials: Trial[];
  }): Promise<SessionResult> {
    return req<SessionResult>("/sessions", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  submitCheckIn(payload: {
    participantId: string;
    phase: Phase;
    source?: "test" | "meditation";
    value: number;
  }): Promise<{ id: string; value: number }> {
    return req("/checkins", { method: "POST", body: JSON.stringify(payload) });
  },

  startGuided(payload: {
    participantId: string;
    studyArm: StudyArm;
    durationSeconds: number;
  }) {
    return req<{ id: string }>("/guided", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  completeGuided(id: string) {
    return req(`/guided/${id}/complete`, { method: "PATCH" });
  },

 getPlaylists(): Promise<Playlist[]> {
  return req<ApiResponse<Playlist[]>>("/playlists").then(
    (res) => res.data
  );
},

getPlaylist(id: string): Promise<PlaylistDetail> {
  return req<ApiResponse<PlaylistDetail>>(`/playlists/${id}`).then(
    (res) => res.data
  );
},


};

// Offline-safe submission wrapper (PDF §2.2 last row):
// store locally, attempt submission, retry with backoff.
export async function submitSessionOfflineSafe(
  payload: Parameters<typeof api.submitSession>[0]
): Promise<SessionResult> {
  const key = `pending-session-${Date.now()}`;
  localStorage.setItem(key, JSON.stringify(payload));
  const delays = [0, 500, 1500, 4000];
  let lastErr: unknown = null;
  for (const d of delays) {
    if (d) await new Promise((r) => setTimeout(r, d));
    try {
      const result = await api.submitSession(payload);
      localStorage.removeItem(key);
      return result;
    } catch (e) {
      lastErr = e;
    }
  }
  // Still failed — keep in localStorage; caller shows local estimate.
  throw lastErr instanceof Error ? lastErr : new Error("Submit failed");
}
