import { MAX_NUMERATOR, ODD_METER_PRESETS, TIME_SIG_DENOMINATOR_OPTIONS } from "../lib/constants.js";
import { createAccentPatternByGrouping } from "../state/metronome-store.js";

function parseGrouping(raw, fallbackNumerator) {
  const numbers = raw
    .split("+")
    .map((item) => Number.parseInt(item.trim(), 10))
    .filter((item) => Number.isFinite(item) && item > 0);
  if (numbers.length === 0) return [fallbackNumerator];
  return numbers;
}

export function createGroupingEditor({ store }) {
  const root = document.createElement("section");
  root.className = "panel grouping-panel";
  root.innerHTML = `
    <h2>Meter & Grouping</h2>
    <div class="grouping-layout">
      <div class="grouping-left">
        <div class="field-grid meter-grid">
          <label class="field">
            <span>Numerator</span>
            <input data-id="numerator" type="number" min="1" max="${MAX_NUMERATOR}" />
          </label>
          <label class="field">
            <span>Denominator</span>
            <select data-id="denominator"></select>
          </label>
          <label class="field full">
            <span>Grouping (use +)</span>
            <input data-id="grouping" type="text" placeholder="2+2+3" />
          </label>
        </div>
        <div class="preset-list" data-id="presets"></div>
      </div>
      <div class="grouping-right">
        <div class="field">
          <span>Sound Set</span>
          <select data-id="sound-set">
            <option value="classic">Classic Click</option>
            <option value="woodblock">Woodblock</option>
          </select>
        </div>
        <div class="field-grid mix-grid">
          <label class="field">
            <span>Accent Vol</span>
            <input data-id="vol-accent" type="range" min="0" max="1" step="0.01" />
          </label>
          <label class="field">
            <span>Normal Vol</span>
            <input data-id="vol-normal" type="range" min="0" max="1" step="0.01" />
          </label>
          <label class="field">
            <span>Ghost Vol</span>
            <input data-id="vol-ghost" type="range" min="0" max="1" step="0.01" />
          </label>
        </div>
      </div>
    </div>
  `;

  const nodes = {
    numerator: root.querySelector('[data-id="numerator"]'),
    denominator: root.querySelector('[data-id="denominator"]'),
    grouping: root.querySelector('[data-id="grouping"]'),
    presets: root.querySelector('[data-id="presets"]'),
    soundSet: root.querySelector('[data-id="sound-set"]'),
    volAccent: root.querySelector('[data-id="vol-accent"]'),
    volNormal: root.querySelector('[data-id="vol-normal"]'),
    volGhost: root.querySelector('[data-id="vol-ghost"]'),
  };

  TIME_SIG_DENOMINATOR_OPTIONS.forEach((value) => {
    const option = document.createElement("option");
    option.value = String(value);
    option.textContent = String(value);
    nodes.denominator.appendChild(option);
  });

  function pushMeterUpdate() {
    const snapshot = store.getSnapshot();
    const numerator = Number.parseInt(nodes.numerator.value, 10);
    const denominator = Number.parseInt(nodes.denominator.value, 10);
    const grouping = parseGrouping(nodes.grouping.value, numerator);
    const accentPattern = createAccentPatternByGrouping(grouping, numerator);
    const patch = {
      timeSigNumerator: numerator,
      timeSigDenominator: denominator,
      grouping,
      accentPattern,
    };
    if (snapshot.runtime.state === "running") {
      store.queueConfigForNextBar(patch);
      return;
    }
    store.updateConfig(patch);
  }

  nodes.numerator.addEventListener("change", pushMeterUpdate);
  nodes.denominator.addEventListener("change", pushMeterUpdate);
  nodes.grouping.addEventListener("change", pushMeterUpdate);

  nodes.soundSet.addEventListener("change", (event) => {
    store.updateConfig({ soundSet: event.target.value });
  });
  nodes.volAccent.addEventListener("input", (event) => {
    store.updateConfig({ volumeAccent: Number(event.target.value) });
  });
  nodes.volNormal.addEventListener("input", (event) => {
    store.updateConfig({ volumeNormal: Number(event.target.value) });
  });
  nodes.volGhost.addEventListener("input", (event) => {
    store.updateConfig({ volumeGhost: Number(event.target.value) });
  });

  ODD_METER_PRESETS.forEach((preset) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "preset-chip";
    button.textContent = preset.label;
    button.addEventListener("click", () => {
      const accentPattern = createAccentPatternByGrouping(preset.grouping, preset.numerator);
      const patch = {
        timeSigNumerator: preset.numerator,
        timeSigDenominator: preset.denominator,
        grouping: preset.grouping,
        accentPattern,
      };
      const snapshot = store.getSnapshot();
      if (snapshot.runtime.state === "running") {
        store.queueConfigForNextBar(patch);
      } else {
        store.updateConfig(patch);
      }
    });
    nodes.presets.appendChild(button);
  });

  return {
    element: root,
    render(snapshot) {
      const { config } = snapshot;
      nodes.numerator.value = String(config.timeSigNumerator);
      nodes.denominator.value = String(config.timeSigDenominator);
      nodes.grouping.value = config.grouping.join("+");
      nodes.soundSet.value = config.soundSet;
      nodes.volAccent.value = String(config.volumeAccent);
      nodes.volNormal.value = String(config.volumeNormal);
      nodes.volGhost.value = String(config.volumeGhost);
    },
  };
}
