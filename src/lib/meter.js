function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function getPulseDurationSeconds(config) {
  // BPM is quarter-note BPM; denominator scales the pulse unit.
  return (60 / config.bpm) * (4 / config.timeSigDenominator);
}

export function getPulsesPerBar(config) {
  const pulses = config.timeSigNumerator * (config.timeSigDenominator / 4);
  return Math.max(1, Math.round(pulses));
}

export function getMeterBeatIndexForPulse(config, pulseIndexOneBased) {
  const beatsPerPulse = 4 / config.timeSigDenominator;
  const rawIndex = Math.floor((pulseIndexOneBased - 1) * beatsPerPulse) + 1;
  return clamp(rawIndex, 1, config.timeSigNumerator);
}

export function isMeterBeatBoundaryPulse(config, pulseIndexOneBased) {
  if (pulseIndexOneBased <= 1) return true;
  const current = getMeterBeatIndexForPulse(config, pulseIndexOneBased);
  const previous = getMeterBeatIndexForPulse(config, pulseIndexOneBased - 1);
  return current !== previous;
}
