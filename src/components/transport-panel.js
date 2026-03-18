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
  bpmRange.className = "transport-bpm-slider";
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
    },
  };
}
