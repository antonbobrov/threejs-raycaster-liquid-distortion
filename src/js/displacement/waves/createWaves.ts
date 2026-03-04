import { storage } from 'three/tsl';
import { StorageBufferAttribute, UniformNode, Vector3 } from 'three/webgpu';

import { Wave } from './Wave';

const COUNT = 100;

export function createWaves(speed: UniformNode<'float', number>) {
  const waves: Wave[] = [];
  let currentWaveIndex = 0;

  for (let i = 0; i < COUNT; i += 1) {
    waves.push(new Wave(speed));
  }

  const wavesAttribute = new StorageBufferAttribute(
    new Float32Array(COUNT * 4),
    4,
  );

  const wavesStorage = storage(wavesAttribute, 'vec4', COUNT);

  function releaseWave(coord: Vector3) {
    waves[currentWaveIndex].update(coord);

    currentWaveIndex = (currentWaveIndex + 1) % COUNT;
  }

  function updateWaves() {
    waves.forEach((wave, index) => {
      const vIdx = index * 4;
      wavesAttribute.array[vIdx] = wave.data.x;
      wavesAttribute.array[vIdx + 1] = wave.data.y;
      wavesAttribute.array[vIdx + 2] = wave.data.z;
      wavesAttribute.array[vIdx + 3] = wave.data.w;
    });

    wavesAttribute.needsUpdate = true;
    wavesStorage.needsUpdate = true;
  }

  return {
    count: COUNT,
    wavesAttribute,
    wavesStorage,
    releaseWave,
    updateWaves,
  };
}
