// 1-7 scattered → focused slider (PDF §3 Screen 3, reused in §8 Screen 4)

interface Props {
  value: number | null;
  onChange: (v: number) => void;
  leftLabel?: string;
  rightLabel?: string;
}

export function StateSlider({
  value,
  onChange,
  leftLabel = "Scattered",
  rightLabel = "Focused",
}: Props) {
  return (
    <div>
      <div className="state-slider">
        {[1, 2, 3, 4, 5, 6, 7].map((n) => (
          <button
            key={n}
            type="button"
            className={value === n ? "selected" : ""}
            onClick={() => onChange(n)}
          >
            {n}
          </button>
        ))}
      </div>
      <div className="state-slider-labels">
        <span>{leftLabel}</span>
        <span>{rightLabel}</span>
      </div>
    </div>
  );
}
