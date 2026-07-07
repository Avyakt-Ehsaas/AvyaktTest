// Button-group choice input for the 3 diagnostic questions (PDF §3 Screen 2)

interface Props {
  options: string[];
  value?: string;
  onChange: (v: string) => void;
}

export function ButtonGroup({ options, value, onChange }: Props) {
  return (
    <div className="button-group">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          className={value === opt ? "selected" : ""}
          onClick={() => onChange(opt)}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}
