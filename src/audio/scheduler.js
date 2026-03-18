import { getNextGroupingBeat } from "../state/metronome-store.js";
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
    this.beatIndex = 1;
    this.barIndex = 1;
    this.countInRemainingBars = 0;
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

    const { config, runtime } = this.store.getSnapshot();
    this.beatIndex = 1;
    this.barIndex = 1;
    this.nextNoteTime = this.context.currentTime + 0.05;
    this.countInRemainingBars = runtime.state === "paused" ? 0 : config.countInBars;
    this.store.updateRuntime({
      barIndex: this.barIndex,
      beatIndex: this.beatIndex,
      groupedBeatIndex: 1,
      activeGroupIndex: 0,
    });

    this.store.setState(this.countInRemainingBars > 0 ? "countIn" : "running");
    this.timerId = window.setInterval(() => this.#tick(), LOOKAHEAD_MS);
    this.#tick();
  }

  stop() {
    if (this.timerId) {
      window.clearInterval(this.timerId);
      this.timerId = null;
    }
    this.store.setState("idle");
    this.store.updateRuntime({
      barIndex: 1,
      beatIndex: 1,
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
    if (runtime.state === "running" || runtime.state === "countIn") {
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
    const { config, runtime } = snapshot;
    const isCountIn = runtime.state === "countIn";
    const strong = this.beatIndex === 1 || isStrongBeat(config, this.beatIndex);
    const medium = isMediumBeat(config, this.beatIndex);
    const layer = strong ? "accent" : medium ? "normal" : "ghost";

    playClickVoice(this.context, this.masterGain, {
      when,
      layer,
      soundSet: config.soundSet,
      volumeAccent: config.volumeAccent,
      volumeNormal: config.volumeNormal,
      volumeGhost: config.volumeGhost,
    });

    const groupingMeta = getNextGroupingBeat(config.grouping, this.beatIndex);
    this.store.updateRuntime({
      beatIndex: this.beatIndex,
      barIndex: this.barIndex,
      groupedBeatIndex: groupingMeta.groupBeatIndex,
      activeGroupIndex: groupingMeta.groupIndex,
      currentBeatTime: when,
    });
    this.onScheduledBeat?.({
      beatIndex: this.beatIndex,
      barIndex: this.barIndex,
      when,
      isCountIn,
      groupingMeta,
    });
  }

  #advanceBeat() {
    const { config } = this.store.getSnapshot();
    const beatDuration = 60 / config.bpm;
    this.nextNoteTime += beatDuration;
    this.beatIndex += 1;
    if (this.beatIndex > config.timeSigNumerator) {
      this.beatIndex = 1;
      this.barIndex += 1;
      this.#onBarBoundary();
    }
  }

  #onBarBoundary() {
    const snapshot = this.store.getSnapshot();
    if (snapshot.runtime.pendingConfig) {
      this.store.applyPendingConfig();
    }

    if (snapshot.runtime.state === "countIn" && this.countInRemainingBars > 0) {
      this.countInRemainingBars -= 1;
      if (this.countInRemainingBars <= 0) {
        this.store.setState("running");
      }
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
