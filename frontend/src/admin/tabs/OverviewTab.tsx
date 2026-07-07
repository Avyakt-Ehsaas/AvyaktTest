import { useEffect, useState } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";
import { adminApi } from "../adminApi";
import type { OverviewData } from "../adminTypes";

const SAGE = "#5C7A5C";
const TEAL = "#4A7A8A";
const SAGE_LIGHT = "#EEF2EA";

interface Props { onUnauth: () => void }

function rt(v: number | null) { return v != null ? `${Math.round(v)} ms` : "—"; }
function pct(a: number, b: number) { return b ? Math.round((a / b) * 100) : 0; }

export function OverviewTab({ onUnauth }: Props) {
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function load() {
    setLoading(true);
    setError(null);
    adminApi.overview()
      .then(setData)
      .catch((e) => { if (e.message === "UNAUTHORIZED") onUnauth(); else setError(e.message); })
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  if (loading) return <div className="admin-loading">Loading overview…</div>;
  if (error) return <div className="admin-error"><span>{error}</span><button className="btn" style={{ width: "auto" }} onClick={load}>Retry</button></div>;
  if (!data) return null;

  const delta = data.avgCheckinDelta;
  const deltaStr = delta != null ? (delta > 0 ? `+${delta.toFixed(1)}` : delta.toFixed(1)) : "—";

  const kpis = [
    { label: "Participants", value: data.totalParticipants, sub: "registered" },
    { label: "Sessions done", value: data.completedSessions, sub: "completed" },
    { label: "Total trials", value: data.totalTrials.toLocaleString(), sub: "PVT taps" },
    { label: "Avg Median RT", value: rt(data.avgMedianRt), sub: "across all sessions" },
    { label: "Avg Lapses / Run", value: data.avgLapseCount != null ? data.avgLapseCount.toFixed(1) : "—", sub: "≥355 ms" },
    { label: "Focus Improvement", value: deltaStr, sub: "avg check-in delta", delta: delta },
  ];

  const pieData = [
    { name: "Stall (180s)", value: data.contextBreakdown.stall, color: SAGE },
    { name: "Talk (90s)", value: data.contextBreakdown.talk, color: "#8FA88F" },
  ];

  return (
    <div>
      {/* KPI row */}
      <div className="admin-kpi-grid">
        {kpis.map((k) => (
          <div key={k.label} className="admin-kpi-card">
            <div className="admin-kpi-value">{k.value}</div>
            <div className="admin-kpi-label">{k.label}</div>
            <div className="admin-kpi-sub">{k.sub}</div>
            {k.delta != null && k.delta > 0 && <div className="admin-kpi-delta-pos">↑ improving</div>}
            {k.delta != null && k.delta < 0 && <div className="admin-kpi-delta-neg">↓ declining</div>}
          </div>
        ))}
      </div>

      {/* Activity area chart */}
      <div className="admin-chart-card" style={{ marginBottom: 20 }}>
        <div className="admin-chart-title">Sessions Over Time — Last 30 Days</div>
        <div className="admin-chart-subtitle">Completed sessions and unique participants per day</div>
        {data.activityByDay.length === 0
          ? <div className="admin-loading" style={{ minHeight: 120 }}>No session data yet</div>
          : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={data.activityByDay} margin={{ top: 8, right: 16, left: -16, bottom: 0 }}>
                <defs>
                  <linearGradient id="gSess" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={SAGE} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={SAGE} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gPart" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={TEAL} stopOpacity={0.2} />
                    <stop offset="95%" stopColor={TEAL} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E8EDE4" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#889" }} tickFormatter={(d) => d.slice(5)} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#889" }} allowDecimals={false} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #D9E0D4", fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area type="monotone" dataKey="sessions" stroke={SAGE} fill="url(#gSess)" strokeWidth={2} dot={false} name="Sessions" />
                <Area type="monotone" dataKey="participants" stroke={TEAL} fill="url(#gPart)" strokeWidth={2} dot={false} name="Participants" />
              </AreaChart>
            </ResponsiveContainer>
          )}
      </div>

      <div className="admin-chart-grid">
        {/* Context split */}
        <div className="admin-chart-card">
          <div className="admin-chart-title">Context Split</div>
          <div className="admin-chart-subtitle">Talk (90s demo) vs Stall (180s full study)</div>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={78} paddingAngle={3} dataKey="value">
                {pieData.map((e, i) => <Cell key={i} fill={e.color} />)}
              </Pie>
              <Tooltip formatter={(v) => [v, "sessions"]} contentStyle={{ borderRadius: 8, border: "1px solid #D9E0D4", fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Study arm summary */}
        <div className="admin-chart-card">
          <div className="admin-chart-title">Study Arms</div>
          <div className="admin-chart-subtitle">{data.studyOptedIn} of {data.totalParticipants} opted into full study ({pct(data.studyOptedIn, data.totalParticipants)}%)</div>
          <div style={{ display: "flex", gap: 16, padding: "28px 0 16px" }}>
            <div style={{ flex: 1, background: "#e4ede4", borderRadius: 12, padding: "24px 16px", textAlign: "center" }}>
              <div className="admin-kpi-value">{data.armACount}</div>
              <div className="admin-kpi-label" style={{ marginTop: 6 }}>Arm A · Guided</div>
              <div style={{ fontSize: "0.8rem", color: "#667", marginTop: 4 }}>3 min audio reset</div>
            </div>
            <div style={{ flex: 1, background: "#e0ecf0", borderRadius: 12, padding: "24px 16px", textAlign: "center" }}>
              <div className="admin-kpi-value">{data.armBCount}</div>
              <div className="admin-kpi-label" style={{ marginTop: 6 }}>Arm B · Quiet</div>
              <div style={{ fontSize: "0.8rem", color: "#667", marginTop: 4 }}>3 min quiet rest</div>
            </div>
          </div>
        </div>

        {/* RT trend */}
        {data.rtTrend.length > 0 && (
          <div className="admin-chart-card">
            <div className="admin-chart-title">Median RT — Weekly Average</div>
            <div className="admin-chart-subtitle">Lower = faster. Last 90 days.</div>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={data.rtTrend} margin={{ top: 8, right: 16, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E8EDE4" vertical={false} />
                <XAxis dataKey="week" tick={{ fontSize: 11, fill: "#889" }} tickFormatter={(d) => d.slice(5)} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#889" }} domain={["auto", "auto"]} tickLine={false} axisLine={false} unit="ms" />
                <Tooltip formatter={(v) => [`${v} ms`, "Avg Median RT"]} contentStyle={{ borderRadius: 8, border: "1px solid #D9E0D4", fontSize: 12 }} />
                <Area type="monotone" dataKey="avgRt" stroke={SAGE} fill={SAGE_LIGHT} strokeWidth={2} dot={false} name="Avg Median RT" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Quick stats card */}
        <div className="admin-chart-card">
          <div className="admin-chart-title">Quick Facts</div>
          <div className="admin-chart-subtitle">Aggregate snapshot</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14, paddingTop: 12 }}>
            {[
              ["Avg Median RT", rt(data.avgMedianRt)],
              ["Avg Lapses / Run", data.avgLapseCount != null ? data.avgLapseCount.toFixed(2) : "—"],
              ["Study opt-in rate", `${pct(data.studyOptedIn, data.totalParticipants)}%`],
              ["Avg focus delta", deltaStr],
              ["Total trials recorded", data.totalTrials.toLocaleString()],
            ].map(([label, val]) => (
              <div key={label} style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #f0f2ee", paddingBottom: 10 }}>
                <span style={{ fontSize: "0.875rem", color: "#556" }}>{label}</span>
                <span style={{ fontSize: "0.9rem", fontWeight: 600, color: "#3A4A3A" }}>{val}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
