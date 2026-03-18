export function createAdvancePanel({ store }) {
  const root = document.createElement("section");
  root.className = "panel advance-panel";
  root.innerHTML = `
    <h2>Advance (beta)</h2>
    <div class="field-grid">
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
      <label class="field full">
        <span>Max BPM</span>
        <input data-id="ramp-max" type="number" min="20" max="500" step="1" value="180" />
      </label>
    </div>
  `;

  const nodes = {
    countIn: root.querySelector('[data-id="count-in"]'),
    rampEnabled: root.querySelector('[data-id="ramp-enabled"]'),
    rampEvery: root.querySelector('[data-id="ramp-every"]'),
    rampIncrement: root.querySelector('[data-id="ramp-increment"]'),
    rampMax: root.querySelector('[data-id="ramp-max"]'),
  };

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

  return {
    element: root,
    render(snapshot) {
      const { config } = snapshot;
      nodes.countIn.value = String(config.countInBars);
      nodes.rampEnabled.checked = config.autoRamp.enabled;
      nodes.rampEvery.value = String(config.autoRamp.everyBars);
      nodes.rampIncrement.value = String(config.autoRamp.incrementBpm);
      nodes.rampMax.value = String(config.autoRamp.maxBpm);
    },
  };
}
