import { useCallback, useEffect, useState } from "react";
import { adminApi } from "../adminApi";
import type { ParticipantRow } from "../adminTypes";

interface Props { onUnauth: () => void }

const AGE_GROUPS = ["Under 25", "25–34", "35–44", "45–54", "55+", "Unknown"];
const PAGE_SIZE = 25;

function nr(v: number | null, dec = 0, unit = "") {
  return v != null ? `${v.toFixed(dec)}${unit}` : "—";
}

function Badge({ label, type }: { label: string; type: string }) {
  return <span className={`admin-badge admin-badge-${type}`}>{label}</span>;
}

function ImprovementCell({ v }: { v: number | null }) {
  if (v == null) return <span className="null-val">—</span>;
  const cls = v > 0 ? "impr-pos" : v < 0 ? "impr-neg" : "impr-zero";
  return <span className={cls}>{v > 0 ? "↓ " : "↑ "}{Math.abs(v).toFixed(0)} ms</span>;
}

function DetailPanel({ id, onClose }: { id: string; onClose: () => void }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi.participant(id).then(setData).finally(() => setLoading(false));
  }, [id]);

  return (
    <>
      <div className="admin-detail-overlay" onClick={onClose} />
      <div className="admin-detail-panel">
        <div className="admin-detail-header">
          <div>
            <h2 style={{ margin: 0, fontSize: "1.1rem", color: "#3A4A3A" }}>{loading ? "Loading…" : data?.name}</h2>
            {data && <div style={{ fontSize: "0.82rem", color: "#889", marginTop: 4 }}>{data.email} · {data.company}</div>}
          </div>
          <button className="admin-detail-close" onClick={onClose}>✕</button>
        </div>

        {loading && <div className="admin-loading">Loading participant…</div>}
        {!loading && data && (
          <div className="admin-detail-body">
            {/* Profile */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 20 }}>
              {[
                ["Age", data.age ?? "—"],
                ["Age Group", data.ageGroup],
                ["Context", data.context],
                ["Study Arm", data.studyArm ?? "Not opted in"],
                ["Sleep", data.diagnosticSleep ?? "—"],
                ["Focus", data.diagnosticFocus ?? "—"],
                ["Stress", data.diagnosticStress ?? "—"],
                ["Joined", new Date(data.createdAt).toLocaleDateString()],
              ].map(([k, v]) => (
                <div key={k} style={{ padding: "8px 12px", background: "#f8f9f7", borderRadius: 8 }}>
                  <div style={{ fontSize: "0.72rem", color: "#889", textTransform: "uppercase", letterSpacing: "0.04em" }}>{k}</div>
                  <div style={{ fontSize: "0.9rem", fontWeight: 600, color: "#3A4A3A", marginTop: 2 }}>{String(v)}</div>
                </div>
              ))}
            </div>

            {/* Sessions */}
            {data.sessions.map((s: any) => {
              const preRt = s.medianRt != null ? `${Math.round(s.medianRt)} ms` : "—";
              return (
                <div key={s.id} style={{ marginBottom: 24 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                    <Badge label={s.phase.toUpperCase()} type={s.phase} />
                    <Badge label={s.context} type={s.context} />
                    <span style={{ fontSize: "0.8rem", color: "#889", marginLeft: "auto" }}>{new Date(s.startedAt).toLocaleString()}</span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 10 }}>
                    {[
                      ["Median RT", preRt],
                      ["Mean RT", s.meanRt ? `${Math.round(s.meanRt)} ms` : "—"],
                      ["Lapses", s.lapseCount],
                      ["False Starts", s.falseStartCount],
                      ["Valid Trials", s.validTrialCount],
                      ["Total Trials", s.totalTrialCount],
                      ["CV", s.cv ? s.cv.toFixed(3) : "—"],
                    ].map(([k, v]) => (
                      <div key={k} style={{ padding: "6px 10px", background: "#f0f4ee", borderRadius: 6, textAlign: "center" }}>
                        <div style={{ fontSize: "0.68rem", color: "#889", textTransform: "uppercase" }}>{k}</div>
                        <div style={{ fontSize: "1rem", fontWeight: 700, color: "#3A4A3A" }}>{String(v)}</div>
                      </div>
                    ))}
                  </div>

                  {/* Trial table */}
                  <div style={{ maxHeight: 220, overflowY: "auto", border: "1px solid #E8EDE4", borderRadius: 8 }}>
                    <table className="trial-table">
                      <thead>
                        <tr><th>#</th><th>ISI</th><th>RT</th><th>Type</th></tr>
                      </thead>
                      <tbody>
                        {s.trials.map((t: any) => (
                          <tr key={t.id} className={t.isLapse ? "trial-lapse" : t.isFalseStart ? "trial-false" : ""}>
                            <td>{t.trialIndex + 1}</td>
                            <td>{t.isiMs} ms</td>
                            <td style={{ fontVariantNumeric: "tabular-nums" }}>
                              {t.reactionTimeMs != null ? `${Math.round(t.reactionTimeMs)} ms` : "—"}
                            </td>
                            <td>
                              {t.isFalseStart
                                ? <Badge label="False" type="false" />
                                : t.isLapse
                                  ? <Badge label="Lapse" type="lapse" />
                                  : <Badge label="Valid" type="valid" />}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}

            {/* Check-ins */}
            {data.checkIns.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "#556", textTransform: "uppercase", marginBottom: 8 }}>Check-ins</div>
                <div style={{ display: "flex", gap: 12 }}>
                  {data.checkIns.map((c: any) => (
                    <div key={c.id} style={{ padding: "10px 16px", background: "#f0f4ee", borderRadius: 8, textAlign: "center" }}>
                      <Badge label={c.phase.toUpperCase()} type={c.phase} />
                      <div style={{ fontSize: "1.6rem", fontWeight: 700, color: "#3A4A3A", marginTop: 4 }}>{c.value}</div>
                      <div style={{ fontSize: "0.72rem", color: "#889" }}>/ 7</div>
                    </div>
                  ))}
                  {data.checkIns.length === 2 && (
                    <div style={{ padding: "10px 16px", background: "#e4f0e4", borderRadius: 8, textAlign: "center" }}>
                      <div style={{ fontSize: "0.72rem", color: "#889", textTransform: "uppercase" }}>Delta</div>
                      <div style={{ fontSize: "1.6rem", fontWeight: 700, color: data.checkIns[1].value - data.checkIns[0].value >= 0 ? "#3d7a3d" : "#8a2a1a", marginTop: 4 }}>
                        {data.checkIns[1].value - data.checkIns[0].value >= 0 ? "+" : ""}
                        {data.checkIns[1].value - data.checkIns[0].value}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}

export function ParticipantsTab({ onUnauth }: Props) {
  const [rows, setRows] = useState<ParticipantRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  const [filters, setFilters] = useState({ q: "", company: "", ageGroup: "", context: "", arm: "" });

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    adminApi.participants({
      page: String(page),
      limit: String(PAGE_SIZE),
      q: filters.q || undefined,
      company: filters.company || undefined,
      ageGroup: filters.ageGroup || undefined,
      context: filters.context || undefined,
      arm: filters.arm || undefined,
    })
      .then((r) => { setRows(r.data); setTotal(r.total); })
      .catch((e) => { if (e.message === "UNAUTHORIZED") onUnauth(); else setError(e.message); })
      .finally(() => setLoading(false));
  }, [page, filters, onUnauth]);

  useEffect(() => { load(); }, [load]);

  function setFilter(k: keyof typeof filters, v: string) {
    setFilters((f) => ({ ...f, [k]: v }));
    setPage(1);
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div>
      {selected && <DetailPanel id={selected} onClose={() => setSelected(null)} />}

      {/* Filters */}
      <div className="admin-filter-bar">
        <input
          className="admin-filter-input"
          placeholder="Search name or email…"
          value={filters.q}
          onChange={(e) => setFilter("q", e.target.value)}
        />
        <input
          className="admin-filter-input"
          placeholder="Company…"
          value={filters.company}
          style={{ minWidth: 160 }}
          onChange={(e) => setFilter("company", e.target.value)}
        />
        <select className="admin-filter-select" value={filters.ageGroup} onChange={(e) => setFilter("ageGroup", e.target.value)}>
          <option value="">All age groups</option>
          {AGE_GROUPS.map((g) => <option key={g} value={g}>{g}</option>)}
        </select>
        <select className="admin-filter-select" value={filters.context} onChange={(e) => setFilter("context", e.target.value)}>
          <option value="">All contexts</option>
          <option value="stall">Stall (180s)</option>
          <option value="talk">Talk (90s)</option>
        </select>
        <select className="admin-filter-select" value={filters.arm} onChange={(e) => setFilter("arm", e.target.value)}>
          <option value="">All arms</option>
          <option value="A">Arm A · Guided</option>
          <option value="B">Arm B · Quiet</option>
        </select>
        <span style={{ fontSize: "0.85rem", color: "#889", marginLeft: "auto" }}>{total} total</span>
      </div>

      {loading && <div className="admin-loading">Loading…</div>}
      {error && <div className="admin-error"><span>{error}</span><button className="btn" style={{ width: "auto" }} onClick={load}>Retry</button></div>}
      {!loading && !error && (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Name</th><th>Company</th><th>Age</th><th>Group</th>
                <th>Context</th><th>Arm</th>
                <th>Pre RT</th><th>Post RT</th><th>Improvement</th>
                <th>Lapses</th><th>Focus Δ</th><th>Joined</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} onClick={() => setSelected(r.id)}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{r.name}</div>
                    <div style={{ fontSize: "0.78rem", color: "#889" }}>{r.email}</div>
                  </td>
                  <td>{r.company}</td>
                  <td>{r.age ?? <span className="null-val">—</span>}</td>
                  <td>{r.ageGroup}</td>
                  <td><Badge label={r.context} type={r.context} /></td>
                  <td>{r.studyArm ? <Badge label={`Arm ${r.studyArm}`} type={r.studyArm} /> : <span className="null-val">—</span>}</td>
                  <td style={{ fontVariantNumeric: "tabular-nums" }}>{nr(r.preRt, 0, " ms")}</td>
                  <td style={{ fontVariantNumeric: "tabular-nums" }}>{nr(r.postRt, 0, " ms")}</td>
                  <td><ImprovementCell v={r.improvement} /></td>
                  <td>{r.lapseCount ?? <span className="null-val">—</span>}</td>
                  <td className={r.checkinDelta != null ? (r.checkinDelta > 0 ? "impr-pos" : r.checkinDelta < 0 ? "impr-neg" : "") : ""}>
                    {r.checkinDelta != null ? (r.checkinDelta > 0 ? "+" : "") + r.checkinDelta : <span className="null-val">—</span>}
                  </td>
                  <td style={{ fontSize: "0.8rem", color: "#889" }}>{new Date(r.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={12} style={{ textAlign: "center", color: "#889", padding: 32 }}>No participants match the current filters</td></tr>
              )}
            </tbody>
          </table>

          <div className="admin-pagination">
            <button disabled={page === 1} onClick={() => setPage(1)}>«</button>
            <button disabled={page === 1} onClick={() => setPage((p) => p - 1)}>‹</button>
            <span>Page {page} of {totalPages || 1}</span>
            <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>›</button>
            <button disabled={page >= totalPages} onClick={() => setPage(totalPages)}>»</button>
          </div>
        </div>
      )}
    </div>
  );
}
