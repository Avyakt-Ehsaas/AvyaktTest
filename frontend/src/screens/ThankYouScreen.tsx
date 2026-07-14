import { useNavigate } from "react-router-dom";
import { useFlow } from "../store";

// Screen 10 (PDF §3): one primary CTA (beginner course), one soft link.
// No retreats, no extra CTAs — single-CTA discipline (§7.4).
export function ThankYouScreen() {
  const nav = useNavigate();
  const { reset } = useFlow();
  return (
    <div className="page page-center">
      <div className="brand">Avyakt Ehsaas</div>
      <h1>Thanks for being part of this.</h1>
      <p className="text-muted">
        If you want to build on what you just felt, here's where to start.
      </p>
      <button className="btn mt-24" onClick={() => nav("/playlists")}>
        Join the Beginner Course
      </button>
      <button className="btn-link mt-16" onClick={() => nav("/playlists")}>
        Try our short meditations
      </button>
      <button
        className="btn-link mt-32"
        onClick={() => {
          reset();
          nav("/");
        }}
      >
        Reset this device (start fresh)
      </button>
    </div>
  );
}
