export const BPM_MIN = 20;
export const BPM_MAX = 500;

export const TIME_SIG_DENOMINATOR_OPTIONS = [4, 8, 16, 32];
export const MAX_NUMERATOR = 16;

export const ACCENT_LEVELS = {
  strong: "strong",
  medium: "medium",
  weak: "weak",
};

export const SOUND_SETS = {
  classic: "classic",
  woodblock: "woodblock",
};

export const STATE = {
  idle: "idle",
  countIn: "countIn",
  running: "running",
  paused: "paused",
};

export const DEFAULT_CONFIG = {
  bpm: 120,
  timeSigNumerator: 4,
  timeSigDenominator: 4,
  grouping: [4],
  accentPattern: ["strong", "weak", "weak", "weak"],
  soundSet: SOUND_SETS.classic,
  volumeAccent: 0.9,
  volumeNormal: 0.7,
  volumeGhost: 0.5,
  flashIntensity: 1,
  countInBars: 1,
  autoRamp: {
    enabled: false,
    everyBars: 4,
    incrementBpm: 2,
    maxBpm: 180,
  },
};

export const BUILTIN_PROFILES = [
  {
    id: "builtin-warmup-4-4",
    name: "Warmup 4/4 @ 80",
    config: {
      ...DEFAULT_CONFIG,
      bpm: 80,
      timeSigNumerator: 4,
      timeSigDenominator: 4,
      grouping: [4],
      accentPattern: ["strong", "weak", "weak", "weak"],
    },
  },
  {
    id: "builtin-odd-7-8",
    name: "Odd 7/8 (2+2+3) @ 90",
    config: {
      ...DEFAULT_CONFIG,
      bpm: 90,
      timeSigNumerator: 7,
      timeSigDenominator: 8,
      grouping: [2, 2, 3],
      accentPattern: ["strong", "weak", "strong", "weak", "strong", "weak", "weak"],
    },
  },
  {
    id: "builtin-odd-5-4",
    name: "Odd 5/4 (3+2) @ 72",
    config: {
      ...DEFAULT_CONFIG,
      bpm: 72,
      timeSigNumerator: 5,
      timeSigDenominator: 4,
      grouping: [3, 2],
      accentPattern: ["strong", "weak", "weak", "strong", "weak"],
    },
  },
];

export const ODD_METER_PRESETS = [
  { label: "5/4 (3+2)", numerator: 5, denominator: 4, grouping: [3, 2] },
  { label: "7/8 (2+2+3)", numerator: 7, denominator: 8, grouping: [2, 2, 3] },
  { label: "9/8 (2+2+2+3)", numerator: 9, denominator: 8, grouping: [2, 2, 2, 3] },
  { label: "11/8 (3+3+3+2)", numerator: 11, denominator: 8, grouping: [3, 3, 3, 2] },
];
