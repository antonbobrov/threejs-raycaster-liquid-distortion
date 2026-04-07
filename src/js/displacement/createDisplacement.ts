import GUI from 'three/examples/jsm/libs/lil-gui.module.min.js';
import {
  clamp,
  cross,
  distance,
  dot,
  float,
  Fn,
  Loop,
  max,
  normalLocal,
  normalize,
  oneMinus,
  positionLocal,
  smoothstep,
  texture,
  varying,
  vec2,
  vec3,
  abs,
  negate,
  transformNormalToView,
  select,
  mx_noise_vec3,
  time,
  uniform,
} from 'three/tsl';
import { TextureNode } from 'three/webgpu';

import { createGUI } from './createGUI';
import { defaultSettings } from './defaults';
import { createWaves } from './waves/createWaves';

export function createDisplacement(waveTexture: TextureNode, gui?: GUI) {
  const settings = {
    radius: uniform(defaultSettings.radius),
    amplitude: uniform(defaultSettings.amplitude),
    decay: uniform(defaultSettings.decay),
    speed: uniform(defaultSettings.speed),
    mouse: uniform(defaultSettings.mouse),
    noise: uniform(defaultSettings.noise),
    noiseScale: uniform(defaultSettings.noiseScale),
    noiseSpeed: uniform(defaultSettings.noiseSpeed),
    noiseIntensity: uniform(defaultSettings.noiseIntensity),
    perPixelNormal: uniform(defaultSettings.perPixelNormal),
  };

  const { count, wavesStorage, releaseWave, updateWaves } = createWaves(
    settings.speed,
  );

  const vNormal = varying(vec3(), 'vNormal');

  const computeOffset = Fn(([position]: [any]) => {
    const result = float(0.0);

    Loop(count, ({ i }: any) => {
      const wave = wavesStorage.element(i);
      const currentRadius = float(settings.radius).mul(wave.w);

      const center = vec3(wave.xyz);
      const local = position.sub(center);
      const dist = distance(position, center);

      const n = normalize(center);

      const up = vec3(0, 1, 0);
      const tangent = normalize(cross(up, n));
      const bitangent = cross(n, tangent);

      const u = dot(local, tangent).div(currentRadius).mul(0.5).add(0.5);
      const v = dot(local, bitangent).div(currentRadius).mul(0.5).add(0.5);

      const uvCircle = clamp(vec2(u, v));

      const circle = oneMinus(smoothstep(0, currentRadius, dist));

      const tex = texture(waveTexture, uvCircle);
      const brightness = tex.a.mul(circle);

      const localAmplitude = select(settings.decay, oneMinus(wave.w), wave.w);
      const dynamicCircle = brightness.mul(wave.w);

      result.assign(max(result, dynamicCircle.mul(localAmplitude)));
    });

    return result.mul(-1);
  });

  const updatePosition = Fn(([position]: [any]) => {
    const normal = vec3(normalLocal);
    const offset = computeOffset(position);

    const noiseTime = time.mul(settings.noiseSpeed);
    const noiseCoord = position.mul(settings.noiseScale).add(noiseTime);

    const noiseOffset = select(
      settings.noise,
      mx_noise_vec3(noiseCoord).mul(settings.noiseIntensity),
      vec3(0.0),
    );

    const withNormal = normal
      .mul(offset)
      .mul(negate(settings.amplitude))
      .add(noiseOffset);

    return position.add(withNormal);
  });

  const orthogonal = Fn(() => {
    const pos = normalLocal;

    const a = normalize(vec3(negate(pos.y), pos.x, 0.0));
    const b = normalize(vec3(0.0, negate(pos.z), pos.y));

    return abs(pos.x).greaterThan(abs(pos.z)).select(a, b);
  });

  const computeNormal = Fn(([position, normal]: [any, any]) => {
    const theta = float(0.001);

    const updatedPos = updatePosition(position);

    const vecTangent = orthogonal();
    const vecBiTangent = normalize(cross(normal, vecTangent));

    const neighbour1 = position.add(vecTangent.mul(theta));
    const neighbour2 = position.add(vecBiTangent.mul(theta));

    const displacedNeighbour1 = updatePosition(neighbour1);
    const displacedNeighbour2 = updatePosition(neighbour2);

    const displacedTangent = displacedNeighbour1.sub(updatedPos);
    const displacedBitangent = displacedNeighbour2.sub(updatedPos);

    const newNormal = normalize(cross(displacedTangent, displacedBitangent));

    const displacedNormal = newNormal
      .dot(normal)
      .lessThan(0.0)
      .select(newNormal.negate(), newNormal);

    return displacedNormal;
  });

  const positionNode = Fn(() => {
    const pos = positionLocal;

    const updatedPos = updatePosition(pos);

    const displacedNormal = computeNormal(pos, normalLocal);
    vNormal.assign(displacedNormal);

    return updatedPos;
  })();

  const normalNode = Fn(() => {
    const perPixel = computeNormal(positionLocal, normalLocal);
    const selected = select(settings.perPixelNormal, perPixel, vNormal);

    return transformNormalToView(selected);
  })();

  const localGUI = createGUI(settings, gui);

  return {
    ...localGUI,
    settings,
    positionNode,
    normalNode,
    releaseWave,
    updateWaves,
  };
}
