// Consistent progress ring used by guided/quiet timer (PDF §9.3)

interface Props {
  progress: number; // 0..1
  label: string;
}

export function ProgressRing({ progress, label }: Props) {
  const r = 100;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(1, progress));
  const offset = c * (1 - clamped);
  return (
    <div className="ring-wrap">
      <svg className="ring" viewBox="0 0 220 220" aria-label={label}>
        <circle cx="110" cy="110" r={r} className="track" />
        <circle
          cx="110"
          cy="110"
          r={r}
          className="prog"
          strokeDasharray={c}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="ring-label">{label}</div>
    </div>
  );
}
