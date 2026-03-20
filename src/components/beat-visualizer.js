import { buildPulseAngles } from "../audio/click-voices.js";
import { getPulsesPerBar, isMeterBeatBoundaryPulse } from "../lib/meter.js";

const RING_RADIUS = 125;

function formatGrouping(grouping) {
  return grouping.join("+");
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
    };
  });
}

export function createBeatVisualizer() {
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
        <p class="value" data-id="state">idle</p>
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
      const x = Math.cos(point.angle) * RING_RADIUS;
      const y = Math.sin(point.angle) * RING_RADIUS;
      dot.style.transform = `translate(${x}px, ${y}px)`;
      if (
        point.pulseIndex === runtime.beatIndex &&
        (runtime.state === "running" || runtime.state === "countIn")
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
        runtime.state !== "idle" &&
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
      nodes.state.textContent = runtime.pendingConfig ? `${runtime.state} (pending next bar)` : runtime.state;
      nodes.bar.textContent = String(runtime.barIndex);
      nodes.beat.textContent = String(runtime.beatIndex);
      renderRing(config, runtime);
      renderBarProgress(config, runtime);
    },
  };
}
