import { useState } from "react";
import { OverviewTab } from "./tabs/OverviewTab";
import { AnalyticsTab } from "./tabs/AnalyticsTab";
import { ParticipantsTab } from "./tabs/ParticipantsTab";
import { SessionsTab } from "./tabs/SessionsTab";

type Tab = "overview" | "analytics" | "participants" | "sessions";

const TABS: { id: Tab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "analytics", label: "Analytics" },
  { id: "participants", label: "Participants" },
  { id: "sessions", label: "Sessions" },
];

export function AdminDashboard() {
  const [key, setKey] = useState<string>(() => sessionStorage.getItem("arp:adminKey") || "");
  const [input, setInput] = useState("");
  const [loginErr, setLoginErr] = useState(false);
  const [tab, setTab] = useState<Tab>("overview");

  function doLogin() {
    if (!input.trim()) return;
    sessionStorage.setItem("arp:adminKey", input.trim());
    setKey(input.trim());
    setLoginErr(false);
  }

  if (!key) {
    return (
      <div className="admin-login">
        <div className="admin-login-card">
          <div className="brand" style={{ marginBottom: 8 }}>Avyakt Ehsaas</div>
          <h1 style={{ fontSize: "1.4rem" }}>Admin Dashboard</h1>
          <p className="text-muted" style={{ marginBottom: 20 }}>
            Enter your admin key to access analytics.
          </p>
          <input
            type="password"
            className="admin-input"
            placeholder="Admin key"
            value={input}
            autoFocus
            onChange={(e) => { setInput(e.target.value); setLoginErr(false); }}
            onKeyDown={(e) => e.key === "Enter" && doLogin()}
          />
          {loginErr && <div className="err mt-16">Invalid key — check your .env ADMIN_KEY</div>}
          <button className="btn mt-16" disabled={!input.trim()} onClick={doLogin}>
            Enter dashboard
          </button>
        </div>
      </div>
    );
  }

  function signOut() {
    sessionStorage.removeItem("arp:adminKey");
    setKey("");
    setInput("");
  }

  return (
    <div className="admin-layout">
      <header className="admin-header">
        <div className="admin-header-inner">
          <div className="admin-brand">
            <span className="brand">Avyakt Ehsaas</span>
            <span className="admin-badge-label">Admin</span>
          </div>
          <nav className="admin-tabs">
            {TABS.map((t) => (
              <button
                key={t.id}
                className={`admin-tab${tab === t.id ? " active" : ""}`}
                onClick={() => setTab(t.id)}
              >
                {t.label}
              </button>
            ))}
          </nav>
          <button className="admin-signout" onClick={signOut}>
            Sign out
          </button>
        </div>
      </header>

      <main className="admin-content">
        {tab === "overview"      && <OverviewTab onUnauth={() => { signOut(); setLoginErr(true); }} />}
        {tab === "analytics"     && <AnalyticsTab onUnauth={signOut} />}
        {tab === "participants"  && <ParticipantsTab onUnauth={signOut} />}
        {tab === "sessions"      && <SessionsTab onUnauth={signOut} />}
      </main>
    </div>
  );
}
