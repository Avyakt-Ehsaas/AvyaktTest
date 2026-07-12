import type {
  OverviewData,
  ParticipantListResponse,
  AnalyticsData,
  SessionListResponse,
  SessionDetail,
  PlaylistListResponse,
  PlaylistRow,
  CreatePlaylistPayload,
  AddAudioPayload,
} from "./adminTypes";

const ADMIN_BASE = "/api/admin";
const PLAYLIST_BASE = "/api/playlists";

function getKey(): string {
  return sessionStorage.getItem("arp:adminKey") || "";
}

function hdrs(): HeadersInit {
  return {
    "Content-Type": "application/json",
    "x-admin-key": getKey(),
  };
}

async function get<T>(
  path: string,
  params?: Record<string, string | undefined>,
): Promise<T> {
  const url = new URL(ADMIN_BASE + path, window.location.origin);

  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== "") {
        url.searchParams.set(key, value);
      }
    }
  }

  const response = await fetch(url.toString(), {
    headers: hdrs(),
  });

  if (response.status === 401) {
    throw new Error("UNAUTHORIZED");
  }

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));

    throw new Error(
      body.error ||
      body.message ||
      `Request failed: ${response.status}`,
    );
  }

  return response.json();
}

/* Playlist GET request */
async function getPlaylists(): Promise<PlaylistListResponse> {
  const response = await fetch(PLAYLIST_BASE, {
    headers: hdrs(),
  });

  if (response.status === 401) {
    throw new Error("UNAUTHORIZED");
  }

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));

    throw new Error(
      body.error ||
      body.message ||
      `Request failed: ${response.status}`,
    );
  }

  return response.json();
}


async function del<T>(path: string): Promise<T> {
const response = await fetch(`${PLAYLIST_BASE}${path}`, {
    method: "DELETE",
    headers: hdrs(),
  });

  if (response.status === 401) {
    throw new Error("UNAUTHORIZED");
  }

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));

    throw new Error(
      body.error || `Request failed: ${response.status}`,
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}


/* Playlist POST request */
async function createPlaylist(
  payload: CreatePlaylistPayload,
): Promise<PlaylistRow> {
  const response = await fetch(PLAYLIST_BASE, {
    method: "POST",
    headers: hdrs(),
    body: JSON.stringify(payload),
  });

  if (response.status === 401) {
    throw new Error("UNAUTHORIZED");
  }

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));

    throw new Error(
      body.error ||
      body.message ||
      `Request failed: ${response.status}`,
    );
  }

  const result = await response.json();

  return result.data ?? result;
}

async function addAudioToPlaylist(
  playlistId: string,
  payload: AddAudioPayload,
) {
  const formData = new FormData();

  formData.append("audio", payload.audioFile);
  formData.append("title", payload.title);
  formData.append(
    "durationSeconds",
    String(payload.durationSeconds),
  );
  formData.append(
    "audioOrder",
    String(payload.audioOrder),
  );

  if (payload.description) {
    formData.append("description", payload.description);
  }

  if (payload.thumbnailUrl) {
    formData.append("thumbnailUrl", payload.thumbnailUrl);
  }

  formData.append(
  "isActive",
  String(payload.isActive ?? true),
);

  const response = await fetch(
    `${PLAYLIST_BASE}/${playlistId}/audios`,
    {
      method: "POST",
      headers: {
        "x-admin-key": getKey(),
      },
      body: formData,
    },
  );

  if (response.status === 401) {
    throw new Error("UNAUTHORIZED");
  }

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));

    throw new Error(
      body.error ||
        body.message ||
        `Request failed: ${response.status}`,
    );
  }

  const result = await response.json();

  return result.data ?? result;
}

export const adminApi = {
  overview: () => get<OverviewData>("/overview"),

  participants: (
    params?: Record<string, string | undefined>,
  ) => get<ParticipantListResponse>("/participants", params),

  participant: (id: string) =>
    get<any>(`/participants/${id}`),

  analytics: () =>
    get<AnalyticsData>("/analytics"),

  sessions: (
    params?: Record<string, string | undefined>,
  ) => get<SessionListResponse>("/sessions", params),

  session: (id: string) =>
    get<SessionDetail>(`/sessions/${id}`),

  playlists: getPlaylists,

  createPlaylist,

  addAudioToPlaylist,

  deletePlaylist(id: string): Promise<void> {
  return del<void>(`/${id}`);
},
};

