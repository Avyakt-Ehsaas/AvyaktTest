import { useEffect, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, Cell,
} from "recharts";
import { adminApi } from "../adminApi";
import type { AnalyticsData, DiagnosticStat } from "../adminTypes";

const SAGE = "#5C7A5C";
const TEAL = "#4A7A8A";
const AMBER = "#C8A23C";
const MUTED = "#D9E0D4";

interface Props { onUnauth: () => void }

function nr(v: number | null, dec = 0) { return v != null ? v.toFixed(dec) : "—"; }

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="admin-section-title">{children}</h2>;
}

function ChartCard({ title, subtitle, height = 260, children }: { title: string; subtitle?: string; height?: number; children: React.ReactNode }) {
  return (
    <div className="admin-chart-card">
      <div className="admin-chart-title">{title}</div>
      {subtitle && <div className="admin-chart-subtitle">{subtitle}</div>}
      <div style={{ marginTop: subtitle ? 0 : 8 }}>
        <ResponsiveContainer width="100%" height={height}>
          {children as React.ReactElement}
        </ResponsiveContainer>
      </div>
    </div>
  );
}

const tooltipStyle = { borderRadius: 8, border: "1px solid #D9E0D4", fontSize: 12 };

function DiagnosticChart({ data, label }: { data: DiagnosticStat[]; label: string }) {
  if (!data.length) return <div className="admin-loading" style={{ minHeight: 120 }}>No data</div>;
  const sorted = [...data].sort((a, b) => (a.avgMedianRt ?? 999) - (b.avgMedianRt ?? 999));
  return (
    <div className="admin-chart-card">
      <div className="admin-chart-title">{label}</div>
      <div className="admin-chart-subtitle">Avg Median RT by response category</div>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={sorted} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E8EDE4" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#889" }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fontSize: 10, fill: "#889" }} unit="ms" tickLine={false} axisLine={false} domain={["auto", "auto"]} />
          <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`${Number(v).toFixed(0)} ms`, "Avg Median RT"]} />
          <Bar dataKey="avgMedianRt" name="Avg Median RT" radius={[4, 4, 0, 0]}>
            {sorted.map((_entry, i) => (
              <Cell key={i} fill={i === 0 ? SAGE : i === sorted.length - 1 ? "#B05030" : MUTED} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div style={{ fontSize: "0.78rem", color: "#889", marginTop: 8 }}>
        n per group: {sorted.map((d) => `${d.label}: ${d.count}`).join(" · ")}
      </div>
    </div>
  );
}

export function AnalyticsTab({ onUnauth }: Props) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function load() {
    setLoading(true);
    setError(null);
    adminApi.analytics()
      .then(setData)
      .catch((e) => { if (e.message === "UNAUTHORIZED") onUnauth(); else setError(e.message); })
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  if (loading) return <div className="admin-loading">Loading analytics…</div>;
  if (error) return <div className="admin-error"><span>{error}</span><button className="btn" style={{ width: "auto" }} onClick={load}>Retry</button></div>;
  if (!data) return null;

  const armA = data.armComparison.A;
  const armB = data.armComparison.B;
  const armChartData = [
    { metric: "Pre RT", A: armA.avgPreRt ? Math.round(armA.avgPreRt) : null, B: armB.avgPreRt ? Math.round(armB.avgPreRt) : null },
    { metric: "Post RT", A: armA.avgPostRt ? Math.round(armA.avgPostRt) : null, B: armB.avgPostRt ? Math.round(armB.avgPostRt) : null },
    { metric: "RT Drop (ms)", A: armA.avgImprovement ? Math.round(armA.avgImprovement) : null, B: armB.avgImprovement ? Math.round(armB.avgImprovement) : null },
    { metric: "Focus Delta", A: armA.avgCheckinDelta != null ? Number(armA.avgCheckinDelta.toFixed(1)) : null, B: armB.avgCheckinDelta != null ? Number(armB.avgCheckinDelta.toFixed(1)) : null },
  ];

  return (
    <div>
      {/* ── Age group analysis ── */}
      <SectionTitle>Performance by Age Group</SectionTitle>
      {data.ageGroups.length === 0
        ? <div className="admin-loading" style={{ minHeight: 80 }}>No age data collected yet — age is optional in the sign-up form</div>
        : (
          <>
            <div className="admin-chart-grid" style={{ marginBottom: 20 }}>
              <ChartCard title="Avg Median RT by Age Group" subtitle="Pre-session baseline (lower = faster)">
                <BarChart data={data.ageGroups} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E8EDE4" vertical={false} />
                  <XAxis dataKey="group" tick={{ fontSize: 11, fill: "#889" }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#889" }} unit="ms" tickLine={false} axisLine={false} domain={["auto", "auto"]} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`${v} ms`, ""]} />
                  <Bar dataKey="avgMedianRt" name="Pre RT" fill={SAGE} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="avgPostRt" name="Post RT" fill={TEAL} radius={[4, 4, 0, 0]} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                </BarChart>
              </ChartCard>

              <ChartCard title="RT Improvement by Age Group" subtitle="Pre minus post median RT (positive = improved)">
                <BarChart data={data.ageGroups} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E8EDE4" vertical={false} />
                  <XAxis dataKey="group" tick={{ fontSize: 11, fill: "#889" }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#889" }} unit="ms" tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`${Number(v).toFixed(1)} ms`, "Avg improvement"]} />
                  <Bar dataKey="improvement" name="Improvement" radius={[4, 4, 0, 0]}>
                    {data.ageGroups.map((entry, i) => (
                      <Cell key={i} fill={(entry.improvement ?? 0) >= 0 ? SAGE : "#B05030"} />
                    ))}
                  </Bar>
                </BarChart>
              </ChartCard>

              <ChartCard title="Avg Lapse Count by Age Group" subtitle="Lapses = RT ≥ 355 ms per 3-min run">
                <BarChart data={data.ageGroups} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E8EDE4" vertical={false} />
                  <XAxis dataKey="group" tick={{ fontSize: 11, fill: "#889" }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#889" }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v) => [Number(v).toFixed(1), "Avg lapses"]} />
                  <Bar dataKey="avgLapseCount" name="Avg lapses" fill={AMBER} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartCard>
 
              <ChartCard title="Avg Focus Check-in Delta by Age Group" subtitle="Post − pre check-in value (1–7 scale)">
                <BarChart data={data.ageGroups} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E8EDE4" vertical={false} />
                  <XAxis dataKey="group" tick={{ fontSize: 11, fill: "#889" }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#889" }} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v) => [Number(v).toFixed(2), "Avg check-in delta"]} />
                  <Bar dataKey="avgCheckinDelta" name="Avg check-in delta" radius={[4, 4, 0, 0]}>
                    {data.ageGroups.map((entry, i) => (
                      <Cell key={i} fill={(entry.avgCheckinDelta ?? 0) >= 0 ? TEAL : "#B05030"} />
                    ))}
                  </Bar>
                </BarChart>
              </ChartCard>
            </div>

            {/* Summary table */}
            <div className="admin-table-wrap" style={{ marginBottom: 32 }}>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Age Group</th><th>n</th><th>Avg Pre RT</th><th>Avg Post RT</th>
                    <th>Improvement</th><th>Avg Lapses</th><th>Focus Delta</th>
                  </tr>
                </thead>
                <tbody>
                  {data.ageGroups.map((g) => (
                    <tr key={g.group}>
                      <td><strong>{g.group}</strong></td>
                      <td>{g.count}</td>
                      <td>{nr(g.avgPreRt, 0)} ms</td>
                      <td>{nr(g.avgPostRt, 0)} ms</td>
                      <td className={(g.improvement ?? 0) > 0 ? "impr-pos" : (g.improvement ?? 0) < 0 ? "impr-neg" : "impr-zero"}>
                        {g.improvement != null ? (g.improvement > 0 ? "↓ " : "↑ ") : ""}{nr(g.improvement, 1)} ms
                      </td>
                      <td>{nr(g.avgLapseCount, 1)}</td>
                      <td className={(g.avgCheckinDelta ?? 0) > 0 ? "impr-pos" : (g.avgCheckinDelta ?? 0) < 0 ? "impr-neg" : "impr-zero"}>
                        {g.avgCheckinDelta != null ? (g.avgCheckinDelta > 0 ? "+" : "") : ""}{nr(g.avgCheckinDelta, 2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

      {/* ── Arm A vs B ── */}
      <SectionTitle>Arm A (Guided) vs Arm B (Quiet) — Study Comparison</SectionTitle>
      {armA.count === 0 && armB.count === 0
        ? <div className="admin-loading" style={{ minHeight: 80 }}>No study data yet — participants must opt in</div>
        : (
          <div className="admin-chart-grid" style={{ marginBottom: 32 }}>
            <ChartCard title="Pre / Post RT & Focus Delta" subtitle="Arm A = guided reset audio · Arm B = quiet rest">
              <BarChart data={armChartData} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E8EDE4" vertical={false} />
                <XAxis dataKey="metric" tick={{ fontSize: 11, fill: "#889" }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#889" }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="A" name="Arm A · Guided" fill={SAGE} radius={[4, 4, 0, 0]} />
                <Bar dataKey="B" name="Arm B · Quiet" fill={TEAL} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartCard>

            <div className="admin-chart-card">
              <div className="admin-chart-title">Summary Table</div>
              <table className="admin-table" style={{ marginTop: 12 }}>
                <thead>
                  <tr><th></th><th style={{ color: "#3d5a3d" }}>Arm A · Guided</th><th style={{ color: "#1a4d5a" }}>Arm B · Quiet</th></tr>
                </thead>
                <tbody>
                  {[
                    ["n", armA.count, armB.count],
                    ["Avg Pre RT", nr(armA.avgPreRt, 0) + " ms", nr(armB.avgPreRt, 0) + " ms"],
                    ["Avg Post RT", nr(armA.avgPostRt, 0) + " ms", nr(armB.avgPostRt, 0) + " ms"],
                    ["RT Improvement", nr(armA.avgImprovement, 1) + " ms", nr(armB.avgImprovement, 1) + " ms"],
                    ["Focus Delta", nr(armA.avgCheckinDelta, 2), nr(armB.avgCheckinDelta, 2)],
                  ].map(([label, a, b]) => (
                    <tr key={String(label)}>
                      <td style={{ color: "#667", fontSize: "0.82rem" }}>{label}</td>
                      <td style={{ fontWeight: 600 }}>{a}</td>
                      <td style={{ fontWeight: 600 }}>{b}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      {/* ── RT distribution ── */}
      <SectionTitle>Reaction Time Distribution</SectionTitle>
      <div className="admin-chart-card" style={{ marginBottom: 32 }}>
        <div className="admin-chart-title">All Valid Trials — RT Histogram (50 ms buckets)</div>
        <div className="admin-chart-subtitle">Lapse threshold at 355 ms · False-start threshold at 100 ms</div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data.rtDistribution} margin={{ top: 8, right: 8, left: -16, bottom: 0 }} barCategoryGap="8%">
            <CartesianGrid strokeDasharray="3 3" stroke="#E8EDE4" vertical={false} />
            <XAxis dataKey="bucket" tick={{ fontSize: 10, fill: "#889" }} tickLine={false} axisLine={false}
              interval={2} tickFormatter={(v) => v.split("–")[0]} />
            <YAxis tick={{ fontSize: 11, fill: "#889" }} allowDecimals={false} tickLine={false} axisLine={false} />
            <Tooltip contentStyle={tooltipStyle} formatter={(v) => [v, "trials"]} labelFormatter={(l) => `${l} ms`} />
            <Bar dataKey="count" name="trials" radius={[3, 3, 0, 0]}>
              {data.rtDistribution.map((entry) => (
                <Cell key={entry.bucketStart} fill={entry.bucketStart >= 355 ? "#B05030" : entry.bucketStart < 150 ? AMBER : SAGE} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div style={{ display: "flex", gap: 20, marginTop: 12, fontSize: "0.78rem", color: "#889" }}>
          <span><span style={{ color: AMBER }}>■</span> Fast (&lt;150 ms)</span>
          <span><span style={{ color: SAGE }}>■</span> Normal (150–354 ms)</span>
          <span><span style={{ color: "#B05030" }}>■</span> Lapse (≥355 ms)</span>
        </div>
      </div>

      {/* ── Check-in delta distribution ── */}
      <SectionTitle>Focus Check-in Distribution</SectionTitle>
      <div className="admin-chart-grid" style={{ marginBottom: 32 }}>
        <ChartCard title="Focus Improvement (Check-in Delta)" subtitle="post − pre on the 1–7 focused scale">
          <BarChart data={data.checkinDeltaDistribution} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E8EDE4" vertical={false} />
            <XAxis dataKey="delta" tick={{ fontSize: 11, fill: "#889" }} tickLine={false} axisLine={false} tickFormatter={(d) => d > 0 ? `+${d}` : d} />
            <YAxis tick={{ fontSize: 11, fill: "#889" }} allowDecimals={false} tickLine={false} axisLine={false} />
            <Tooltip contentStyle={tooltipStyle} formatter={(v) => [v, "participants"]} labelFormatter={(d) => `Delta: ${d > 0 ? "+" : ""}${d}`} />
            <Bar dataKey="count" name="participants" radius={[4, 4, 0, 0]}>
              {data.checkinDeltaDistribution.map((entry, i) => (
                <Cell key={i} fill={entry.delta > 0 ? SAGE : entry.delta < 0 ? "#B05030" : MUTED} />
              ))}
            </Bar>
          </BarChart>
        </ChartCard>

        {/* Company breakdown */}
        <ChartCard title="Participation by Company" subtitle="Top 15 companies · n participants" height={Math.max(200, data.companies.length * 28)}>
          <BarChart layout="vertical" data={data.companies} margin={{ top: 4, right: 24, left: 8, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E8EDE4" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 10, fill: "#889" }} allowDecimals={false} tickLine={false} axisLine={false} />
            <YAxis type="category" dataKey="company" tick={{ fontSize: 10, fill: "#556" }} tickLine={false} axisLine={false} width={100} />
            <Tooltip contentStyle={tooltipStyle} formatter={(v, n) => [v, n === "count" ? "participants" : n]} />
            <Bar dataKey="count" name="count" fill={SAGE} radius={[0, 4, 4, 0]} />
          </BarChart>
        </ChartCard>
      </div>

      {/* ── Diagnostic correlations ── */}
      <SectionTitle>Diagnostics vs Performance</SectionTitle>
      <div className="admin-chart-grid">
        <DiagnosticChart data={data.diagnostics.diagnosticSleep} label="Sleep Last Night vs RT" />
        <DiagnosticChart data={data.diagnostics.diagnosticFocus} label="Focus Difficulty vs RT" />
        <DiagnosticChart data={data.diagnostics.diagnosticStress} label="Stress Level vs RT" />
      </div>
    </div>
  );
}
