import { getNextGroupingBeat } from "../state/metronome-store.js";
import {
  getMeterBeatIndexForPulse,
  getPulseDurationSeconds,
  getPulsesPerBar,
  isMeterBeatBoundaryPulse,
} from "../lib/meter.js";
import { playClickVoice } from "./click-voices.js";

const LOOKAHEAD_MS = 25;
const SCHEDULE_AHEAD_SECONDS = 0.12;

function isStrongBeat(config, beatIndexOneBased) {
  return config.accentPattern[beatIndexOneBased - 1] === "strong";
}

function isMediumBeat(config, beatIndexOneBased) {
  return config.accentPattern[beatIndexOneBased - 1] === "medium";
}

export class AudioScheduler {
  constructor(store) {
    this.store = store;
    this.context = null;
    this.masterGain = null;
    this.timerId = null;
    this.nextNoteTime = 0;
    this.pulseIndex = 1;
    this.barIndex = 1;
    this.tapTimestamps = [];
    this.onScheduledBeat = null;
  }

  get isRunning() {
    return Boolean(this.timerId);
  }

  async ensureContext() {
    if (!this.context) {
      this.context = new AudioContext();
      this.masterGain = this.context.createGain();
      this.masterGain.gain.value = 0.95;
      this.masterGain.connect(this.context.destination);
    }
    if (this.context.state === "suspended") {
      await this.context.resume();
    }
  }

  async start() {
    await this.ensureContext();
    if (this.isRunning) return;

    this.pulseIndex = 1;
    this.barIndex = 1;
    this.nextNoteTime = this.context.currentTime + 0.05;
    this.store.updateRuntime({
      barIndex: this.barIndex,
      beatIndex: this.pulseIndex,
      meterBeatIndex: 1,
      groupedBeatIndex: 1,
      activeGroupIndex: 0,
    });

    this.store.setState("running");
    this.timerId = window.setInterval(() => this.#tick(), LOOKAHEAD_MS);
    this.#tick();
  }

  stop() {
    if (this.timerId) {
      window.clearInterval(this.timerId);
      this.timerId = null;
    }
    this.store.setState("paused");
    this.store.updateRuntime({
      barIndex: 1,
      beatIndex: 1,
      meterBeatIndex: 1,
      groupedBeatIndex: 1,
      activeGroupIndex: 0,
      currentBeatTime: 0,
      pendingConfig: null,
    });
  }

  pause() {
    if (this.timerId) {
      window.clearInterval(this.timerId);
      this.timerId = null;
    }
    this.store.setState("paused");
  }

  toggle() {
    const { runtime } = this.store.getSnapshot();
    if (runtime.state === "running") {
      this.pause();
    } else {
      this.start();
    }
  }

  registerTap() {
    const now = performance.now();
    this.tapTimestamps.push(now);
    if (this.tapTimestamps.length > 6) {
      this.tapTimestamps.shift();
    }
    if (this.tapTimestamps.length < 2) return null;
    const intervals = [];
    for (let i = 1; i < this.tapTimestamps.length; i += 1) {
      intervals.push(this.tapTimestamps[i] - this.tapTimestamps[i - 1]);
    }
    const avg = intervals.reduce((acc, v) => acc + v, 0) / intervals.length;
    if (avg <= 0) return null;
    const bpm = Math.round(60000 / avg);
    return bpm;
  }

  #tick() {
    if (!this.context) return;
    while (this.nextNoteTime < this.context.currentTime + SCHEDULE_AHEAD_SECONDS) {
      this.#scheduleBeat(this.nextNoteTime);
      this.#advanceBeat();
    }
  }

  #scheduleBeat(when) {
    const snapshot = this.store.getSnapshot();
    const { config } = snapshot;
    const meterBeatIndex = getMeterBeatIndexForPulse(config, this.pulseIndex);
    const isBoundaryPulse = isMeterBeatBoundaryPulse(config, this.pulseIndex);
    const strong = isBoundaryPulse && isStrongBeat(config, meterBeatIndex);
    const medium = isBoundaryPulse && isMediumBeat(config, meterBeatIndex);
    const layer = strong ? "accent" : medium ? "normal" : "ghost";

    playClickVoice(this.context, this.masterGain, {
      when,
      layer,
      soundSet: config.soundSet,
      volumeAccent: config.volumeAccent,
      volumeNormal: config.volumeNormal,
      volumeGhost: config.volumeGhost,
    });

    const groupingMeta = getNextGroupingBeat(config.grouping, meterBeatIndex);
    this.store.updateRuntime({
      beatIndex: this.pulseIndex,
      meterBeatIndex,
      barIndex: this.barIndex,
      groupedBeatIndex: groupingMeta.groupBeatIndex,
      activeGroupIndex: groupingMeta.groupIndex,
      currentBeatTime: when,
    });
    this.onScheduledBeat?.({
      beatIndex: this.pulseIndex,
      meterBeatIndex,
      barIndex: this.barIndex,
      when,
      groupingMeta,
    });
  }

  #advanceBeat() {
    const { config } = this.store.getSnapshot();
    const pulseDuration = getPulseDurationSeconds(config);
    const pulsesPerBar = getPulsesPerBar(config);
    this.nextNoteTime += pulseDuration;
    this.pulseIndex += 1;
    if (this.pulseIndex > pulsesPerBar) {
      this.pulseIndex = 1;
      this.barIndex += 1;
      this.#onBarBoundary();
    }
  }

  #onBarBoundary() {
    const snapshot = this.store.getSnapshot();
    if (snapshot.runtime.pendingConfig) {
      this.store.applyPendingConfig();
    }

    const config = this.store.getSnapshot().config;
    if (!config.autoRamp.enabled) return;
    if (this.barIndex % config.autoRamp.everyBars !== 0) return;
    const nextBpm = Math.min(config.bpm + config.autoRamp.incrementBpm, config.autoRamp.maxBpm);
    if (nextBpm !== config.bpm) {
      this.store.updateConfig({ bpm: nextBpm });
    }
  }
}
