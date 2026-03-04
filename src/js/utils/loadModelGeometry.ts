import { Box3, BufferGeometry, Vector3 } from 'three';
import { GLTF, GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const gltfLoader = new GLTFLoader();

function pickGeometry(gltf: GLTF): BufferGeometry | null {
  let geometry: BufferGeometry | null = null;

  gltf.scene.traverse((obj) => {
    if (geometry) {
      return;
    }

    if ((obj as any).isMesh && (obj as any).geometry) {
      geometry = (obj as any).geometry as BufferGeometry;
    }
  });

  return geometry;
}

function normalizeGeometry(geometry: BufferGeometry, scaleProp: number) {
  geometry.computeBoundingBox();

  const box = geometry.boundingBox ?? new Box3();
  const size = new Vector3();
  box.getSize(size);

  const maxAxis = Math.max(size.x, size.y, size.z) || 1;
  const scale = scaleProp / maxAxis;
  geometry.scale(scale, scale, scale);

  geometry.center();
}

export async function loadModelGeometry(
  url: string,
  scale: number,
): Promise<BufferGeometry> {
  const gltf = await gltfLoader.loadAsync(url);

  const sourceGeometry = pickGeometry(gltf);
  if (!sourceGeometry) {
    throw new Error(`Model "${url}": no mesh geometry found`);
  }

  const geometry = sourceGeometry.clone();
  normalizeGeometry(geometry, scale);

  return geometry;
}
