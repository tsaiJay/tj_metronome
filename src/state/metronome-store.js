import {
  ACCENT_LEVELS,
  BPM_MAX,
  BPM_MIN,
  BUILTIN_PROFILES,
  DEFAULT_CONFIG,
  MAX_NUMERATOR,
  TIME_SIG_DENOMINATOR_OPTIONS,
} from "../lib/constants.js";

const STORAGE_KEY = "metronome.profiles.v1";
const LAST_PROFILE_KEY = "metronome.lastProfile.v1";

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function ensureGrouping(grouping, numerator) {
  if (!Array.isArray(grouping) || grouping.length === 0) {
    return [numerator];
  }
  const cleaned = grouping
    .map((value) => Number.parseInt(value, 10))
    .filter((value) => Number.isFinite(value) && value > 0);
  const sum = cleaned.reduce((acc, value) => acc + value, 0);
  if (sum === numerator) return cleaned;
  if (sum < numerator) return [...cleaned, numerator - sum];
  return [numerator];
}

function buildAccentPattern(numerator, grouping, currentPattern = []) {
  const pattern = new Array(numerator).fill(ACCENT_LEVELS.weak);
  let idx = 0;
  for (const size of grouping) {
    pattern[idx] = ACCENT_LEVELS.strong;
    idx += size;
    if (idx >= numerator) break;
  }
  for (let i = 0; i < numerator; i += 1) {
    if (currentPattern[i] === ACCENT_LEVELS.medium) pattern[i] = ACCENT_LEVELS.medium;
  }
  pattern[0] = ACCENT_LEVELS.strong;
  return pattern;
}

export function normalizeConfig(input = {}) {
  const bpm = clamp(Number(input.bpm ?? DEFAULT_CONFIG.bpm), BPM_MIN, BPM_MAX);
  const timeSigNumerator = clamp(
    Number.parseInt(input.timeSigNumerator ?? DEFAULT_CONFIG.timeSigNumerator, 10),
    1,
    MAX_NUMERATOR
  );
  const denominatorCandidate = Number.parseInt(
    input.timeSigDenominator ?? DEFAULT_CONFIG.timeSigDenominator,
    10
  );
  const timeSigDenominator = TIME_SIG_DENOMINATOR_OPTIONS.includes(denominatorCandidate)
    ? denominatorCandidate
    : DEFAULT_CONFIG.timeSigDenominator;
  const grouping = ensureGrouping(input.grouping ?? DEFAULT_CONFIG.grouping, timeSigNumerator);
  const accentPattern = buildAccentPattern(
    timeSigNumerator,
    grouping,
    input.accentPattern ?? DEFAULT_CONFIG.accentPattern
  );
  return {
    ...DEFAULT_CONFIG,
    ...input,
    bpm,
    timeSigNumerator,
    timeSigDenominator,
    grouping,
    accentPattern,
    volumeAccent: clamp(Number(input.volumeAccent ?? DEFAULT_CONFIG.volumeAccent), 0, 1),
    volumeNormal: clamp(Number(input.volumeNormal ?? DEFAULT_CONFIG.volumeNormal), 0, 1),
    volumeGhost: clamp(Number(input.volumeGhost ?? DEFAULT_CONFIG.volumeGhost), 0, 1),
    flashIntensity: clamp(Number(input.flashIntensity ?? DEFAULT_CONFIG.flashIntensity), 0, 1),
    countInBars: clamp(Number.parseInt(input.countInBars ?? DEFAULT_CONFIG.countInBars, 10), 0, 2),
    autoRamp: {
      ...DEFAULT_CONFIG.autoRamp,
      ...(input.autoRamp ?? {}),
      everyBars: clamp(Number.parseInt(input.autoRamp?.everyBars ?? DEFAULT_CONFIG.autoRamp.everyBars, 10), 1, 64),
      incrementBpm: clamp(
        Number.parseInt(input.autoRamp?.incrementBpm ?? DEFAULT_CONFIG.autoRamp.incrementBpm, 10),
        1,
        50
      ),
      maxBpm: clamp(Number.parseInt(input.autoRamp?.maxBpm ?? DEFAULT_CONFIG.autoRamp.maxBpm, 10), BPM_MIN, BPM_MAX),
    },
  };
}

function makeId() {
  return `profile-${Math.random().toString(36).slice(2, 10)}`;
}

function parseStoredProfiles(raw) {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((profile) => profile && typeof profile.name === "string")
      .map((profile) => ({
        id: String(profile.id ?? makeId()),
        name: profile.name.trim() || "Untitled",
        config: normalizeConfig(profile.config ?? {}),
        updatedAt: Number(profile.updatedAt ?? Date.now()),
      }));
  } catch {
    return [];
  }
}

export class MetronomeStore {
  constructor() {
    this.config = normalizeConfig(DEFAULT_CONFIG);
    this.subscribers = new Set();
    this.profiles = this.#loadProfiles();
    this.activeProfileId = this.#loadLastProfileId();
    this.runtime = {
      state: "idle",
      barIndex: 1,
      beatIndex: 1,
      groupedBeatIndex: 1,
      activeGroupIndex: 0,
      currentBeatTime: 0,
      pendingConfig: null,
    };
  }

  #loadProfiles() {
    const local = parseStoredProfiles(localStorage.getItem(STORAGE_KEY));
    const builtins = BUILTIN_PROFILES.map((profile) => ({
      ...profile,
      builtIn: true,
      updatedAt: Date.now(),
      config: normalizeConfig(profile.config),
    }));
    return [...builtins, ...local];
  }

  #loadLastProfileId() {
    const stored = localStorage.getItem(LAST_PROFILE_KEY);
    if (stored && this.profiles.some((profile) => profile.id === stored)) {
      return stored;
    }
    return this.profiles[0]?.id ?? null;
  }

  #persistProfiles() {
    const editable = this.profiles.filter((profile) => !profile.builtIn);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(editable));
    if (this.activeProfileId) {
      localStorage.setItem(LAST_PROFILE_KEY, this.activeProfileId);
    }
  }

  subscribe(listener) {
    this.subscribers.add(listener);
    return () => this.subscribers.delete(listener);
  }

  emit() {
    const snapshot = this.getSnapshot();
    for (const listener of this.subscribers) listener(snapshot);
  }

  getSnapshot() {
    return {
      config: this.config,
      runtime: this.runtime,
      profiles: this.profiles,
      activeProfileId: this.activeProfileId,
    };
  }

  updateConfig(patch) {
    const nextConfig = normalizeConfig({
      ...this.config,
      ...patch,
      autoRamp: {
        ...this.config.autoRamp,
        ...(patch.autoRamp ?? {}),
      },
    });
    this.config = nextConfig;
    this.emit();
  }

  queueConfigForNextBar(patch) {
    this.runtime.pendingConfig = normalizeConfig({
      ...this.config,
      ...patch,
      autoRamp: {
        ...this.config.autoRamp,
        ...(patch.autoRamp ?? {}),
      },
    });
    this.emit();
  }

  applyPendingConfig() {
    if (!this.runtime.pendingConfig) return;
    this.config = this.runtime.pendingConfig;
    this.runtime.pendingConfig = null;
    this.emit();
  }

  updateRuntime(patch) {
    this.runtime = { ...this.runtime, ...patch };
    this.emit();
  }

  setState(nextState) {
    this.runtime = { ...this.runtime, state: nextState };
    this.emit();
  }

  saveProfile(name, config = this.config) {
    const profile = {
      id: makeId(),
      name: name.trim() || "Untitled",
      config: normalizeConfig(config),
      updatedAt: Date.now(),
    };
    this.profiles = [...this.profiles, profile];
    this.activeProfileId = profile.id;
    this.#persistProfiles();
    this.emit();
    return profile.id;
  }

  duplicateProfile(id) {
    const source = this.profiles.find((profile) => profile.id === id);
    if (!source) return null;
    return this.saveProfile(`${source.name} Copy`, source.config);
  }

  renameProfile(id, newName) {
    this.profiles = this.profiles.map((profile) =>
      profile.id === id ? { ...profile, name: newName.trim() || profile.name, updatedAt: Date.now() } : profile
    );
    this.#persistProfiles();
    this.emit();
  }

  deleteProfile(id) {
    const target = this.profiles.find((profile) => profile.id === id);
    if (!target || target.builtIn) return false;
    this.profiles = this.profiles.filter((profile) => profile.id !== id);
    if (this.activeProfileId === id) {
      this.activeProfileId = this.profiles[0]?.id ?? null;
    }
    this.#persistProfiles();
    this.emit();
    return true;
  }

  applyProfile(id) {
    const profile = this.profiles.find((item) => item.id === id);
    if (!profile) return false;
    const nextConfig = normalizeConfig(profile.config);
    if (this.runtime.state === "running" || this.runtime.state === "countIn") {
      this.runtime.pendingConfig = nextConfig;
    } else {
      this.config = nextConfig;
    }
    this.activeProfileId = id;
    localStorage.setItem(LAST_PROFILE_KEY, id);
    this.emit();
    return true;
  }
}

export function getNextGroupingBeat(grouping, beatIndexOneBased) {
  let cursor = 0;
  for (let i = 0; i < grouping.length; i += 1) {
    const groupSize = grouping[i];
    if (beatIndexOneBased <= cursor + groupSize) {
      return {
        groupIndex: i,
        groupBeatIndex: beatIndexOneBased - cursor,
      };
    }
    cursor += groupSize;
  }
  return { groupIndex: grouping.length - 1, groupBeatIndex: 1 };
}

export function createAccentPatternByGrouping(grouping, numerator) {
  return buildAccentPattern(numerator, grouping);
}
