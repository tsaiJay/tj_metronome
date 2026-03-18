import { AudioScheduler } from "./audio/scheduler.js";
import { createBeatVisualizer } from "./components/beat-visualizer.js";
import { createGroupingEditor } from "./components/grouping-editor.js";
import { createProfileList } from "./components/profile-list.js";
import { createTransportPanel } from "./components/transport-panel.js";
import { MetronomeStore } from "./state/metronome-store.js";

const app = document.querySelector("#app");
const store = new MetronomeStore();
const scheduler = new AudioScheduler(store);

const profilePanel = createProfileList({ store });
const visualizer = createBeatVisualizer();
const transportPanel = createTransportPanel({ store, scheduler });
const groupingPanel = createGroupingEditor({ store });

const shell = document.createElement("main");
shell.className = "app-shell";
shell.innerHTML = `
  <header class="app-header">
    <h1>Practice Metronome</h1>
    <p>Stable timing, odd meters, and reusable training profiles.</p>
  </header>
  <section class="layout-desktop">
    <aside class="left-col"></aside>
    <section class="center-col"></section>
    <aside class="right-col"></aside>
  </section>
`;

app.appendChild(shell);

const leftCol = shell.querySelector(".left-col");
const centerCol = shell.querySelector(".center-col");
const rightCol = shell.querySelector(".right-col");

leftCol.appendChild(profilePanel.element);
const mobileStatus = document.createElement("section");
mobileStatus.className = "panel mobile-summary";
mobileStatus.innerHTML = `
  <h2>Current Setup</h2>
  <p data-id="summary"></p>
`;
centerCol.appendChild(mobileStatus);
centerCol.appendChild(visualizer.element);
centerCol.appendChild(transportPanel.element);
rightCol.appendChild(groupingPanel.element);

function renderMobileSummary(snapshot) {
  const node = mobileStatus.querySelector('[data-id="summary"]');
  const { config } = snapshot;
  node.textContent = `${config.bpm} BPM | ${config.timeSigNumerator}/${config.timeSigDenominator} | ${config.grouping.join(
    "+"
  )}`;
}

function render(snapshot) {
  profilePanel.render(snapshot);
  visualizer.render(snapshot);
  transportPanel.render(snapshot);
  groupingPanel.render(snapshot);
  renderMobileSummary(snapshot);
}

store.subscribe(render);
render(store.getSnapshot());
