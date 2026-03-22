import { buildPulseAngles } from "../audio/click-voices.js";
import { ACCENT_LEVELS, cycleAccentLevel } from "../lib/constants.js";
import {
  getMeterBeatIndexForPulse,
  getPulsesPerBar,
  isMeterBeatBoundaryPulse,
} from "../lib/meter.js";

const RING_RADIUS = 125;

function formatGrouping(grouping) {
  return grouping.join("+");
}

/** 1-based meter beat indices where a grouping segment starts (e.g. 3+3+2 → 1,4,7). */
function getGroupStartMeterBeats(grouping) {
  if (!grouping?.length) return [1];
  const starts = [1];
  let acc = 1;
  for (let i = 0; i < grouping.length - 1; i++) {
    acc += grouping[i];
    starts.push(acc);
  }
  return starts;
}

function isGroupStartPulse(config, pulseIndex) {
  if (!isMeterBeatBoundaryPulse(config, pulseIndex)) return false;
  const meterBeat = getMeterBeatIndexForPulse(config, pulseIndex);
  return getGroupStartMeterBeats(config.grouping).includes(meterBeat);
}

function buildRingPoints(config) {
  const pulsesPerBar = getPulsesPerBar(config);
  const angles = buildPulseAngles(pulsesPerBar);
  return angles.map((angle, idx) => {
    const pulseIndex = idx + 1;
    const isBoundaryPulse = isMeterBeatBoundaryPulse(config, pulseIndex);
    return {
      angle,
      pulseIndex,
      isSubdivision: !isBoundaryPulse,
      isGroupStart: isGroupStartPulse(config, pulseIndex),
    };
  });
}

export function createBeatVisualizer({ store }) {
  const root = document.createElement("section");
  root.className = "panel visualizer-panel";
  root.innerHTML = `
    <div class="stats-top">
      <div>
        <p class="label">BPM</p>
        <p class="value" data-id="bpm">120</p>
      </div>
      <div>
        <p class="label">Time Signature</p>
        <p class="value" data-id="time-sig">4/4</p>
      </div>
      <div>
        <p class="label">Grouping</p>
        <p class="value" data-id="grouping">4</p>
      </div>
      <div>
        <p class="label">State</p>
        <p class="value value--state">
          <span data-id="state">paused</span><span class="state-pending-dot" data-id="state-pending" hidden title="設定將在下個小節開頭套用" aria-label="設定將在下個小節開頭套用"></span>
        </p>
      </div>
    </div>
    <div class="pulse-ring" data-id="ring"></div>
    <div class="bar-progress" data-id="bar-progress"></div>
    <div class="runtime-counters">
      <p>Bar <span data-id="bar">1</span></p>
      <p>Beat <span data-id="beat">1</span></p>
    </div>
  `;

  const nodes = {
    bpm: root.querySelector('[data-id="bpm"]'),
    timeSig: root.querySelector('[data-id="time-sig"]'),
    grouping: root.querySelector('[data-id="grouping"]'),
    state: root.querySelector('[data-id="state"]'),
    statePending: root.querySelector('[data-id="state-pending"]'),
    ring: root.querySelector('[data-id="ring"]'),
    barProgress: root.querySelector('[data-id="bar-progress"]'),
    bar: root.querySelector('[data-id="bar"]'),
    beat: root.querySelector('[data-id="beat"]'),
  };

  function renderRing(config, runtime) {
    const points = buildRingPoints(config);
    nodes.ring.innerHTML = "";
    points.forEach((point) => {
      const dot = document.createElement("div");
      dot.className = point.isSubdivision ? "pulse-dot subdivision" : "pulse-dot";
      if (!point.isSubdivision) {
        dot.classList.add("meter-accent");
        const meterBeat = getMeterBeatIndexForPulse(config, point.pulseIndex);
        const accentIdx = meterBeat - 1;
        const level = config.accentPattern[accentIdx] ?? ACCENT_LEVELS.weak;
        dot.classList.add(`accent-${level}`);
        dot.title = "點擊循環正拍重音：強 → 中 → 弱";
        if (point.isGroupStart) dot.classList.add("group-start");
        dot.addEventListener("click", (event) => {
          event.stopPropagation();
          const snap = store.getSnapshot();
          const next = [...snap.config.accentPattern];
          next[accentIdx] = cycleAccentLevel(next[accentIdx]);
          store.updateConfig({ accentPattern: next });
        });
      }
      const x = Math.cos(point.angle) * RING_RADIUS;
      const y = Math.sin(point.angle) * RING_RADIUS;
      dot.style.transform = `translate(${x}px, ${y}px)`;
      if (
        point.pulseIndex === runtime.beatIndex &&
        runtime.state === "running"
      ) {
        dot.classList.add("active");
        dot.style.opacity = String(Math.max(config.flashIntensity, 0.25));
      }
      nodes.ring.appendChild(dot);
    });
  }

  function renderBarProgress(config, runtime) {
    nodes.barProgress.innerHTML = "";
    const meterBeatIndex = runtime.meterBeatIndex ?? runtime.beatIndex;
    let beatCursor = 1;
    config.grouping.forEach((groupSize, groupIndex) => {
      const item = document.createElement("div");
      item.className = "group-block";
      item.style.flex = String(groupSize);
      item.textContent = `${groupSize}`;
      const beatEnd = beatCursor + groupSize - 1;
      if (
        runtime.state === "running" &&
        meterBeatIndex >= beatCursor &&
        meterBeatIndex <= beatEnd &&
        runtime.activeGroupIndex === groupIndex
      ) {
        item.classList.add("active");
      }
      beatCursor += groupSize;
      nodes.barProgress.appendChild(item);
    });
  }

  return {
    element: root,
    render(snapshot) {
      const { config, runtime } = snapshot;
      nodes.bpm.textContent = String(config.bpm);
      nodes.timeSig.textContent = `${config.timeSigNumerator}/${config.timeSigDenominator}`;
      nodes.grouping.textContent = formatGrouping(config.grouping);
      nodes.state.textContent = runtime.state;
      nodes.statePending.hidden = !runtime.pendingConfig;
      nodes.bar.textContent = String(runtime.barIndex);
      nodes.beat.textContent = String(runtime.beatIndex);
      renderRing(config, runtime);
      renderBarProgress(config, runtime);
    },
  };
}
