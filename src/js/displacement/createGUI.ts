import GUI from 'three/examples/jsm/libs/lil-gui.module.min.js';

import { createDisplacement } from './createDisplacement';

export function createGUI(
  settings: ReturnType<typeof createDisplacement>['settings'],
  gui?: GUI,
) {
  if (!gui) {
    return;
  }

  const displacementGUI = gui.addFolder('Displacement');

  const radiusController = displacementGUI
    .add(settings.radius, 'value', 0, 5)
    .name('Radius')
    .step(0.001);

  const amplitudeController = displacementGUI
    .add(settings.amplitude, 'value', -5, 5)
    .name('Amplitude')
    .step(0.001);

  const decayController = displacementGUI
    .add(settings.decay, 'value')
    .name('Decay');

  const speedController = displacementGUI
    .add(settings.speed, 'value', 250, 5000)
    .name('Lifetime')
    .step(1);

  const mouseController = displacementGUI
    .add(settings.mouse, 'value')
    .name('Mouse');

  const noiseController = displacementGUI
    .add(settings.noise, 'value')
    .name('Noise');

  const noiseScaleController = displacementGUI
    .add(settings.noiseScale, 'value', 0.1, 3)
    .name('Noise scale')
    .step(0.01);

  const noiseSpeedController = displacementGUI
    .add(settings.noiseSpeed, 'value', 0, 5)
    .name('Noise speed')
    .step(0.001);

  const noiseIntensityController = displacementGUI
    .add(settings.noiseIntensity, 'value', 0, 0.2)
    .name('Noise intensity')
    .step(0.0001);

  const updateGUI = () => [
    radiusController.updateDisplay(),
    amplitudeController.updateDisplay(),
    decayController.updateDisplay(),
    speedController.updateDisplay(),
    mouseController.updateDisplay(),
    noiseController.updateDisplay(),
    noiseScaleController.updateDisplay(),
    noiseSpeedController.updateDisplay(),
    noiseIntensityController.updateDisplay(),
  ];

  return {
    updateGUI,
  };
}
