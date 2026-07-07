// Aggregate metric helpers for a PVT session.
// Spec (PDF §1.3, §11.1):
//   - false start: rt < 100ms (or response with no stimulus)
//   - lapse:       rt >= 355ms (PVT-B validated cutoff)
//   - valid trial: 100 <= rt < 355 and not a false start

export function classifyTrial(rt) {
  if (rt == null) return { isFalseStart: false, isLapse: false, isValid: false };
  if (rt < 100) return { isFalseStart: true, isLapse: false, isValid: false };
  if (rt >= 355) return { isFalseStart: false, isLapse: true, isValid: false };
  return { isFalseStart: false, isLapse: false, isValid: true };
}

function median(sorted) {
  const n = sorted.length;
  if (n === 0) return null;
  const mid = Math.floor(n / 2);
  return n % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

export function aggregate(trials) {
  const validRts = trials
    .filter((t) => t.isValid && t.reactionTimeMs != null)
    .map((t) => t.reactionTimeMs);

  const sorted = [...validRts].sort((a, b) => a - b);
  const n = validRts.length;
  const mean = n ? validRts.reduce((a, b) => a + b, 0) / n : null;
  const med = median(sorted);

  let cv = null;
  if (n > 1 && mean != null) {
    const variance =
      validRts.reduce((s, x) => s + (x - mean) ** 2, 0) / (n - 1);
    const sd = Math.sqrt(variance);
    cv = mean === 0 ? null : sd / mean;
  }

  return {
    medianRt: med,
    meanRt: mean,
    cv,
    lapseCount: trials.filter((t) => t.isLapse).length,
    falseStartCount: trials.filter((t) => t.isFalseStart).length,
    validTrialCount: n,
    totalTrialCount: trials.length,
  };
}
