import type {
  OverviewData,
  ParticipantListResponse,
  AnalyticsData,
  SessionListResponse,
  SessionDetail,
} from "./adminTypes";

const BASE = "/api/admin";

function getKey(): string {
  return sessionStorage.getItem("arp:adminKey") || "";
}

function hdrs(): HeadersInit {
  return { "Content-Type": "application/json", "x-admin-key": getKey() };
}

async function get<T>(path: string, params?: Record<string, string | undefined>): Promise<T> {
  const url = new URL(BASE + path, window.location.origin);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== "") url.searchParams.set(k, v);
    }
  }
  const resp = await fetch(url.toString(), { headers: hdrs() });
  if (resp.status === 401) throw new Error("UNAUTHORIZED");
  if (!resp.ok) {
    const body = await resp.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${resp.status}`);
  }
  return resp.json();
}

export const adminApi = {
  overview: () => get<OverviewData>("/overview"),

  participants: (params?: Record<string, string | undefined>) =>
    get<ParticipantListResponse>("/participants", params),

  participant: (id: string) => get<any>(`/participants/${id}`),

  analytics: () => get<AnalyticsData>("/analytics"),

  sessions: (params?: Record<string, string | undefined>) =>
    get<SessionListResponse>("/sessions", params),

  session: (id: string) => get<SessionDetail>(`/sessions/${id}`),
};
