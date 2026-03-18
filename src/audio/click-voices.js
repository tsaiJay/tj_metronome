const PI2 = Math.PI * 2;

function createEnvelope(context, gainNode, when, attack = 0.001, decay = 0.08, peak = 1) {
  gainNode.gain.cancelScheduledValues(when);
  gainNode.gain.setValueAtTime(0.0001, when);
  gainNode.gain.exponentialRampToValueAtTime(peak, when + attack);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, when + decay);
}

function renderClassicClick(context, destination, when, frequency, gainValue, duration = 0.08) {
  const osc = context.createOscillator();
  const gain = context.createGain();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(frequency, when);
  gain.gain.setValueAtTime(0.0001, when);
  createEnvelope(context, gain, when, 0.001, duration, gainValue);
  osc.connect(gain).connect(destination);
  osc.start(when);
  osc.stop(when + duration + 0.03);
}

function renderWoodblockClick(context, destination, when, frequency, gainValue) {
  const osc = context.createOscillator();
  const filter = context.createBiquadFilter();
  const gain = context.createGain();
  osc.type = "square";
  osc.frequency.setValueAtTime(frequency, when);
  filter.type = "bandpass";
  filter.frequency.setValueAtTime(frequency * 1.6, when);
  filter.Q.setValueAtTime(8, when);
  createEnvelope(context, gain, when, 0.0008, 0.05, gainValue);
  osc.connect(filter).connect(gain).connect(destination);
  osc.start(when);
  osc.stop(when + 0.07);
}

export function playClickVoice(context, masterGain, options) {
  const { when, layer, soundSet, volumeAccent, volumeNormal, volumeGhost } = options;
  const layerVolumeMap = {
    accent: volumeAccent,
    normal: volumeNormal,
    ghost: volumeGhost,
  };
  const volume = Math.max(0.0001, layerVolumeMap[layer] ?? volumeNormal);

  if (soundSet === "woodblock") {
    const freq = layer === "accent" ? 1600 : layer === "normal" ? 1050 : 700;
    renderWoodblockClick(context, masterGain, when, freq, volume);
    return;
  }

  const freq = layer === "accent" ? 1800 : layer === "normal" ? 1100 : 750;
  const duration = layer === "accent" ? 0.09 : 0.07;
  renderClassicClick(context, masterGain, when, freq, volume, duration);
}

export function buildPulseAngles(totalBeats) {
  const step = PI2 / Math.max(totalBeats, 1);
  return Array.from({ length: totalBeats }, (_, idx) => idx * step - Math.PI / 2);
}
