import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ButtonGroup } from "../components/ButtonGroup";
import { api } from "../api";
import { useFlow } from "../store";

interface Consent {
  consentDataUse: boolean;
  consentScoreDisplay: boolean;
  consentAnonAggregate: boolean;
  consentFutureContact: boolean;
}

// Screen 2 (PDF §3): self-report form.
export function SelfReportScreen() {
  const nav = useNavigate();
  const loc = useLocation() as { state?: { consent?: Consent } };
  const { context, setParticipant } = useFlow();
  const consent: Consent = loc.state?.consent ?? {
    consentDataUse: true,
    consentScoreDisplay: true,
    consentAnonAggregate: true,
    consentFutureContact: false,
  };

  const [form, setForm] = useState({
    name: "",
    email: "",
    whatsapp: "",
    company: "",
    role: "",
    age: "",
    diagnosticSleep: "",
    diagnosticFocus: "",
    diagnosticStress: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email);
  const canSubmit =
    form.name.trim() &&
    validEmail &&
    form.whatsapp.trim() &&
    form.company.trim() &&
    form.diagnosticSleep &&
    form.diagnosticFocus &&
    form.diagnosticStress;

  async function onSubmit() {
    setErr(null);
    setSubmitting(true);
    try {
      const p = await api.createParticipant({
        context,
        ...consent,
        name: form.name.trim(),
        email: form.email.trim(),
        whatsapp: form.whatsapp.trim(),
        company: form.company.trim(),
        role: form.role.trim() || undefined,
        age: form.age ? Number(form.age) : undefined,
        diagnosticSleep: form.diagnosticSleep,
        diagnosticFocus: form.diagnosticFocus,
        diagnosticStress: form.diagnosticStress,
      });
      setParticipant(p);
      nav("/checkin/pre");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page">
      <div className="brand">Avyakt Ehsaas</div>
      <h1>Just a few quick details.</h1>
      <p className="text-muted mb-16">
        This helps us show you something useful at the end.
      </p>

      <label className="field">
        <span className="lbl">Name</span>
        <input
          type="text"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="Full name"
        />
      </label>

      <label className="field">
        <span className="lbl">Work email</span>
        <input
          type="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          placeholder="you@company.com"
        />
        {form.email && !validEmail && <div className="err">Enter a valid email</div>}
      </label>

      <label className="field">
        <span className="lbl">WhatsApp number</span>
        <input
          type="tel"
          value={form.whatsapp}
          onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
          placeholder="+91…"
        />
      </label>

      <label className="field">
        <span className="lbl">Company</span>
        <input
          type="text"
          value={form.company}
          onChange={(e) => setForm({ ...form, company: e.target.value })}
        />
      </label>

      <label className="field">
        <span className="lbl">Role (optional)</span>
        <input
          type="text"
          value={form.role}
          onChange={(e) => setForm({ ...form, role: e.target.value })}
        />
      </label>

      <label className="field">
        <span className="lbl">Age (optional)</span>
        <input
          type="number"
          value={form.age}
          onChange={(e) => setForm({ ...form, age: e.target.value })}
          placeholder="e.g. 32"
          min="16"
          max="100"
          style={{ maxWidth: 120 }}
        />
      </label>

      <div className="field">
        <span className="lbl">How much sleep did you get last night?</span>
        <ButtonGroup
          options={["< 5h", "5-6h", "6-7h", "7-8h", "> 8h"]}
          value={form.diagnosticSleep}
          onChange={(v) => setForm({ ...form, diagnosticSleep: v })}
        />
      </div>

      <div className="field">
        <span className="lbl">How often do you struggle to focus at work?</span>
        <ButtonGroup
          options={["Rarely", "Sometimes", "Often", "Constantly"]}
          value={form.diagnosticFocus}
          onChange={(v) => setForm({ ...form, diagnosticFocus: v })}
        />
      </div>

      <div className="field">
        <span className="lbl">Current stress level today?</span>
        <ButtonGroup
          options={["Low", "Moderate", "High", "Very high"]}
          value={form.diagnosticStress}
          onChange={(v) => setForm({ ...form, diagnosticStress: v })}
        />
      </div>

      {err && <div className="err mb-16">{err}</div>}

      <button
        className="btn mt-16"
        disabled={!canSubmit || submitting}
        onClick={onSubmit}
      >
        {submitting ? "…" : "Continue"}
      </button>
    </div>
  );
}
