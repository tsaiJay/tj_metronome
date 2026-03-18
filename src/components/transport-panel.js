import { BPM_MAX, BPM_MIN } from "../lib/constants.js";

function numberInput(value, min, max, step = 1) {
  const input = document.createElement("input");
  input.type = "number";
  input.value = String(value);
  input.min = String(min);
  input.max = String(max);
  input.step = String(step);
  return input;
}

export function createTransportPanel({ store, scheduler }) {
  const root = document.createElement("section");
  root.className = "panel transport-panel";
  root.innerHTML = `
    <h2>Transport</h2>
    <div class="transport-grid">
      <label class="field">
        <span>BPM</span>
        <div class="field-inline" data-id="bpm-wrap"></div>
      </label>
      <label class="field">
        <span>Count-in Bars</span>
        <select data-id="count-in">
          <option value="0">0</option>
          <option value="1">1</option>
          <option value="2">2</option>
        </select>
      </label>
      <label class="field checkbox">
        <input type="checkbox" data-id="ramp-enabled" />
        <span>Auto Ramp</span>
      </label>
      <label class="field">
        <span>Every Bars</span>
        <input data-id="ramp-every" type="number" min="1" max="64" step="1" value="4" />
      </label>
      <label class="field">
        <span>+ BPM</span>
        <input data-id="ramp-increment" type="number" min="1" max="50" step="1" value="2" />
      </label>
      <label class="field">
        <span>Max BPM</span>
        <input data-id="ramp-max" type="number" min="20" max="500" step="1" value="180" />
      </label>
    </div>
    <div class="transport-actions">
      <button data-id="start-stop" class="primary">Start</button>
      <button data-id="tap">Tap Tempo</button>
      <button data-id="minus">-1</button>
      <button data-id="plus">+1</button>
      <p class="tip">Hotkeys: Space / ArrowUp / ArrowDown / Shift+Arrow</p>
    </div>
  `;

  const bpmWrap = root.querySelector('[data-id="bpm-wrap"]');
  const bpmRange = document.createElement("input");
  bpmRange.type = "range";
  bpmRange.min = String(BPM_MIN);
  bpmRange.max = String(BPM_MAX);
  bpmRange.step = "1";
  bpmRange.value = "120";
  const bpmNumber = numberInput(120, BPM_MIN, BPM_MAX, 1);
  bpmWrap.append(bpmRange, bpmNumber);

  const nodes = {
    startStop: root.querySelector('[data-id="start-stop"]'),
    tap: root.querySelector('[data-id="tap"]'),
    minus: root.querySelector('[data-id="minus"]'),
    plus: root.querySelector('[data-id="plus"]'),
    countIn: root.querySelector('[data-id="count-in"]'),
    rampEnabled: root.querySelector('[data-id="ramp-enabled"]'),
    rampEvery: root.querySelector('[data-id="ramp-every"]'),
    rampIncrement: root.querySelector('[data-id="ramp-increment"]'),
    rampMax: root.querySelector('[data-id="ramp-max"]'),
  };

  function setBpm(value) {
    const bpm = Number.parseInt(value, 10);
    store.updateConfig({ bpm });
  }

  bpmRange.addEventListener("input", (event) => {
    const value = Number(event.target.value);
    bpmNumber.value = String(value);
    setBpm(value);
  });

  bpmNumber.addEventListener("change", (event) => {
    const value = Number(event.target.value);
    bpmRange.value = String(value);
    setBpm(value);
  });

  nodes.startStop.addEventListener("click", () => {
    scheduler.toggle();
  });

  nodes.tap.addEventListener("click", () => {
    const bpm = scheduler.registerTap();
    if (!bpm) return;
    bpmRange.value = String(bpm);
    bpmNumber.value = String(bpm);
    store.updateConfig({ bpm });
  });

  nodes.minus.addEventListener("click", () => {
    const current = store.getSnapshot().config.bpm;
    const next = Math.max(BPM_MIN, current - 1);
    bpmRange.value = String(next);
    bpmNumber.value = String(next);
    setBpm(next);
  });
  nodes.plus.addEventListener("click", () => {
    const current = store.getSnapshot().config.bpm;
    const next = Math.min(BPM_MAX, current + 1);
    bpmRange.value = String(next);
    bpmNumber.value = String(next);
    setBpm(next);
  });

  nodes.countIn.addEventListener("change", (event) => {
    store.updateConfig({ countInBars: Number(event.target.value) });
  });
  nodes.rampEnabled.addEventListener("change", (event) => {
    store.updateConfig({ autoRamp: { enabled: event.target.checked } });
  });
  nodes.rampEvery.addEventListener("change", (event) => {
    store.updateConfig({ autoRamp: { everyBars: Number(event.target.value) } });
  });
  nodes.rampIncrement.addEventListener("change", (event) => {
    store.updateConfig({ autoRamp: { incrementBpm: Number(event.target.value) } });
  });
  nodes.rampMax.addEventListener("change", (event) => {
    store.updateConfig({ autoRamp: { maxBpm: Number(event.target.value) } });
  });

  function registerHotkeys() {
    window.addEventListener("keydown", (event) => {
      if (event.code === "Space") {
        event.preventDefault();
        scheduler.toggle();
        return;
      }
      const current = store.getSnapshot().config.bpm;
      if (event.code === "ArrowUp") {
        event.preventDefault();
        const delta = event.shiftKey ? 5 : 1;
        const next = Math.min(BPM_MAX, current + delta);
        bpmRange.value = String(next);
        bpmNumber.value = String(next);
        setBpm(next);
      }
      if (event.code === "ArrowDown") {
        event.preventDefault();
        const delta = event.shiftKey ? 5 : 1;
        const next = Math.max(BPM_MIN, current - delta);
        bpmRange.value = String(next);
        bpmNumber.value = String(next);
        setBpm(next);
      }
    });
  }
  registerHotkeys();

  return {
    element: root,
    render(snapshot) {
      const { config, runtime } = snapshot;
      bpmRange.value = String(config.bpm);
      bpmNumber.value = String(config.bpm);
      nodes.startStop.textContent =
        runtime.state === "running" || runtime.state === "countIn" ? "Pause" : "Start";
      nodes.countIn.value = String(config.countInBars);
      nodes.rampEnabled.checked = config.autoRamp.enabled;
      nodes.rampEvery.value = String(config.autoRamp.everyBars);
      nodes.rampIncrement.value = String(config.autoRamp.incrementBpm);
      nodes.rampMax.value = String(config.autoRamp.maxBpm);
    },
  };
}
