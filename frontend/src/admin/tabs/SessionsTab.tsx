import { useCallback, useEffect, useState } from "react";
import { adminApi } from "../adminApi";
import type { SessionRow, SessionDetail } from "../adminTypes";

interface Props { onUnauth: () => void }

const PAGE_SIZE = 25;

function Badge({ label, type }: { label: string; type: string }) {
  return <span className={`admin-badge admin-badge-${type}`}>{label}</span>;
}

function TrialDetailPanel({ id, onClose }: { id: string; onClose: () => void }) {
  const [data, setData] = useState<SessionDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi.session(id).then(setData).finally(() => setLoading(false));
  }, [id]);

  const lapseRt = data?.trials.filter((t) => t.isLapse).map((t) => t.reactionTimeMs!).filter(Boolean) ?? [];
  const validRt = data?.trials.filter((t) => t.isValid).map((t) => t.reactionTimeMs!).filter(Boolean) ?? [];
  const avgLapseRt = lapseRt.length ? lapseRt.reduce((a, b) => a + b, 0) / lapseRt.length : null;
  const avgValidRt = validRt.length ? validRt.reduce((a, b) => a + b, 0) / validRt.length : null;

  return (
    <>
      <div className="admin-detail-overlay" onClick={onClose} />
      <div className="admin-detail-panel">
        <div className="admin-detail-header">
          <div>
            <h2 style={{ margin: 0, fontSize: "1.05rem", color: "#3A4A3A" }}>
              {loading ? "Loading…" : data ? `${data.participant.name} — ${data.phase.toUpperCase()} Session` : "Session Detail"}
            </h2>
            {data && (
              <div style={{ fontSize: "0.82rem", color: "#889", marginTop: 4 }}>
                {data.participant.company} · {new Date(data.startedAt).toLocaleString()}
              </div>
            )}
          </div>
          <button className="admin-detail-close" onClick={onClose}>✕</button>
        </div>

        {loading && <div className="admin-loading">Loading session…</div>}
        {!loading && data && (
          <div className="admin-detail-body">
            {/* Aggregate metrics */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 20 }}>
              {[
                ["Median RT", data.medianRt ? `${Math.round(data.medianRt)} ms` : "—"],
                ["Mean RT", data.meanRt ? `${Math.round(data.meanRt)} ms` : "—"],
                ["CV", data.cv ? data.cv.toFixed(3) : "—"],
                ["Lapses", data.lapseCount],
                ["False Starts", data.falseStartCount],
                ["Valid Trials", data.validTrialCount],
                ["Total Trials", data.totalTrialCount],
                ["Lapse Rate", data.totalTrialCount ? `${Math.round((data.lapseCount / data.totalTrialCount) * 100)}%` : "—"],
              ].map(([k, v]) => (
                <div key={k} style={{ padding: "8px 10px", background: "#f0f4ee", borderRadius: 8, textAlign: "center" }}>
                  <div style={{ fontSize: "0.68rem", color: "#889", textTransform: "uppercase" }}>{k}</div>
                  <div style={{ fontSize: "1.05rem", fontWeight: 700, color: "#3A4A3A", marginTop: 2 }}>{String(v)}</div>
                </div>
              ))}
            </div>

            {/* Trial analysis summary */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
              <div style={{ padding: "12px 16px", background: "#f8f9f7", borderRadius: 8 }}>
                <div style={{ fontSize: "0.72rem", color: "#889", textTransform: "uppercase" }}>Avg Valid RT</div>
                <div style={{ fontSize: "1.3rem", fontWeight: 700, color: "#3A4A3A", marginTop: 2 }}>
                  {avgValidRt ? `${Math.round(avgValidRt)} ms` : "—"}
                </div>
              </div>
              <div style={{ padding: "12px 16px", background: "#fff8f6", borderRadius: 8 }}>
                <div style={{ fontSize: "0.72rem", color: "#889", textTransform: "uppercase" }}>Avg Lapse RT</div>
                <div style={{ fontSize: "1.3rem", fontWeight: 700, color: "#B05030", marginTop: 2 }}>
                  {avgLapseRt ? `${Math.round(avgLapseRt)} ms` : "—"}
                </div>
              </div>
            </div>

            {/* Trial-by-trial table */}
            <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "#556", textTransform: "uppercase", marginBottom: 8 }}>
              Trial-by-Trial ({data.trials.length} trials)
            </div>
            <div style={{ maxHeight: 380, overflowY: "auto", border: "1px solid #E8EDE4", borderRadius: 8 }}>
              <table className="trial-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>ISI</th>
                    <th>Stimulus (ms)</th>
                    <th>Response (ms)</th>
                    <th>RT</th>
                    <th>Type</th>
                  </tr>
                </thead>
                <tbody>
                  {data.trials.map((t) => (
                    <tr
                      key={t.id}
                      className={t.isLapse ? "trial-lapse" : t.isFalseStart ? "trial-false" : ""}
                    >
                      <td>{t.trialIndex + 1}</td>
                      <td>{t.isiMs}</td>
                      <td style={{ fontVariantNumeric: "tabular-nums" }}>
                        {(t as any).stimulusOnsetMs != null ? Math.round((t as any).stimulusOnsetMs) : "—"}
                      </td>
                      <td style={{ fontVariantNumeric: "tabular-nums" }}>
                        {(t as any).responseMs != null ? Math.round((t as any).responseMs) : "—"}
                      </td>
                      <td style={{ fontVariantNumeric: "tabular-nums", fontWeight: t.isLapse || t.isFalseStart ? 600 : 400 }}>
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
        )}
      </div>
    </>
  );
}

export function SessionsTab({ onUnauth }: Props) {
  const [rows, setRows] = useState<SessionRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [filters, setFilters] = useState({ phase: "", context: "", from: "", to: "" });

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    adminApi.sessions({
      page: String(page),
      limit: String(PAGE_SIZE),
      phase: filters.phase || undefined,
      context: filters.context || undefined,
      from: filters.from || undefined,
      to: filters.to || undefined,
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
      {selected && <TrialDetailPanel id={selected} onClose={() => setSelected(null)} />}

      <div className="admin-filter-bar">
        <select className="admin-filter-select" value={filters.phase} onChange={(e) => setFilter("phase", e.target.value)}>
          <option value="">All phases</option>
          <option value="pre">Pre-session</option>
          <option value="post">Post-session</option>
        </select>
        <select className="admin-filter-select" value={filters.context} onChange={(e) => setFilter("context", e.target.value)}>
          <option value="">All contexts</option>
          <option value="stall">Stall (180s)</option>
          <option value="talk">Talk (90s)</option>
        </select>
        <label style={{ fontSize: "0.85rem", color: "#667", display: "flex", alignItems: "center", gap: 6 }}>
          From
          <input type="date" className="admin-filter-select" value={filters.from} onChange={(e) => setFilter("from", e.target.value)} style={{ minWidth: 140 }} />
        </label>
        <label style={{ fontSize: "0.85rem", color: "#667", display: "flex", alignItems: "center", gap: 6 }}>
          To
          <input type="date" className="admin-filter-select" value={filters.to} onChange={(e) => setFilter("to", e.target.value)} style={{ minWidth: 140 }} />
        </label>
        <span style={{ fontSize: "0.85rem", color: "#889", marginLeft: "auto" }}>{total} sessions</span>
      </div>

      {loading && <div className="admin-loading">Loading sessions…</div>}
      {error && <div className="admin-error"><span>{error}</span><button className="btn" style={{ width: "auto" }} onClick={load}>Retry</button></div>}
      {!loading && !error && (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Participant</th><th>Phase</th><th>Context</th><th>Arm</th>
                <th>Median RT</th><th>Mean RT</th><th>CV</th>
                <th>Lapses</th><th>False Starts</th><th>Valid / Total</th>
                <th>Started</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} onClick={() => setSelected(r.id)} title="Click to view trial detail">
                  <td>
                    <div style={{ fontWeight: 600 }}>{r.participant.name}</div>
                    <div style={{ fontSize: "0.75rem", color: "#889" }}>{r.participant.company}</div>
                  </td>
                  <td><Badge label={r.phase.toUpperCase()} type={r.phase} /></td>
                  <td><Badge label={r.context} type={r.context} /></td>
                  <td>{r.participant.studyArm ? <Badge label={`A/${r.participant.studyArm}`} type={r.participant.studyArm} /> : <span className="null-val">—</span>}</td>
                  <td style={{ fontVariantNumeric: "tabular-nums", fontWeight: 600 }}>
                    {r.medianRt != null ? `${Math.round(r.medianRt)} ms` : <span className="null-val">—</span>}
                  </td>
                  <td style={{ fontVariantNumeric: "tabular-nums" }}>
                    {r.meanRt != null ? `${Math.round(r.meanRt)} ms` : <span className="null-val">—</span>}
                  </td>
                  <td style={{ fontVariantNumeric: "tabular-nums" }}>
                    {r.cv != null ? r.cv.toFixed(3) : <span className="null-val">—</span>}
                  </td>
                  <td>
                    {r.lapseCount > 0
                      ? <span style={{ color: "#B05030", fontWeight: 600 }}>{r.lapseCount}</span>
                      : <span style={{ color: "#3d7a3d" }}>0</span>}
                  </td>
                  <td>
                    {r.falseStartCount > 0
                      ? <span style={{ color: "#C8A23C", fontWeight: 600 }}>{r.falseStartCount}</span>
                      : <span style={{ color: "#889" }}>0</span>}
                  </td>
                  <td style={{ fontVariantNumeric: "tabular-nums" }}>{r.validTrialCount} / {r.totalTrialCount}</td>
                  <td style={{ fontSize: "0.8rem", color: "#889" }}>{new Date(r.startedAt).toLocaleString()}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={11} style={{ textAlign: "center", color: "#889", padding: 32 }}>No sessions match the current filters</td></tr>
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
