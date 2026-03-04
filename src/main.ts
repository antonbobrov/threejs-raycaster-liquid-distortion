import './styles/index.scss';
import {
  BufferGeometry,
  Mesh,
  NoColorSpace,
  Raycaster,
  SphereGeometry,
  SRGBColorSpace,
  TextureLoader,
  TorusGeometry,
  TorusKnotGeometry,
  Vector2,
} from 'three';
import { HDRLoader } from 'three/examples/jsm/Addons.js';
import GUI from 'three/examples/jsm/libs/lil-gui.module.min.js';
import { uniformTexture } from 'three/tsl';
import {
  MeshMatcapNodeMaterial,
  MeshNormalNodeMaterial,
  MeshStandardNodeMaterial,
} from 'three/webgpu';
import { Cursor, vevet } from 'vevet';

import { createDisplacement } from './js/displacement/createDisplacement';
import { defaultSettings } from './js/displacement/defaults';
import { manager } from './js/manager';
import { loadModelGeometry } from './js/utils/loadModelGeometry';

// GUI

const gui = new GUI();

// Environment

manager.scene.environment = null;
manager.scene.environmentIntensity = 1;

new HDRLoader().load('env/warehouse.hdr', (texture) => {
  manager.scene.environment = texture;
  manager.renderer.compile(manager.scene, manager.camera);
});

// Textures

const loader = new TextureLoader();

const clayTexture = loader.load('materials/clay.png');
clayTexture.colorSpace = SRGBColorSpace;

const grayTexture = loader.load('materials/gray.png');
grayTexture.colorSpace = SRGBColorSpace;

const redTexture = loader.load('materials/red.png');
redTexture.colorSpace = SRGBColorSpace;

// Wave Textures

const emptyTexture = loader.load('displacement/empty.png');
emptyTexture.colorSpace = NoColorSpace;

const smokeTexture = loader.load('displacement/smoke.png');
smokeTexture.colorSpace = NoColorSpace;

const rippleTexture = loader.load('displacement/ripple.png');
rippleTexture.colorSpace = NoColorSpace;

const waveTexture = uniformTexture(emptyTexture);

// Displacement

const displacement = createDisplacement(waveTexture, gui);
const { settings } = displacement;

// Create materials

const materials = {
  milk: new MeshStandardNodeMaterial({
    color: 0xeeefff,
    emissive: 0x000012,
    roughness: 0.2,
    metalness: 0.0,
    positionNode: displacement.positionNode,
    normalNode: displacement.normalNode,
  }),
  metal: new MeshStandardNodeMaterial({
    color: 0xeeefff,
    emissive: 0x000012,
    roughness: 0.2,
    metalness: 1.0,
    positionNode: displacement.positionNode,
    normalNode: displacement.normalNode,
  }),
  clay: new MeshMatcapNodeMaterial({
    matcap: clayTexture,
    positionNode: displacement.positionNode,
    normalNode: displacement.normalNode,
  }),
  grey: new MeshMatcapNodeMaterial({
    matcap: grayTexture,
    positionNode: displacement.positionNode,
    normalNode: displacement.normalNode,
  }),
  red: new MeshMatcapNodeMaterial({
    matcap: redTexture,
    positionNode: displacement.positionNode,
    normalNode: displacement.normalNode,
  }),
  normal: new MeshNormalNodeMaterial({
    positionNode: displacement.positionNode,
    normalNode: displacement.normalNode,
  }),
};

// Create geometries

const geometries = {
  sphere: new SphereGeometry(1, 128, 128),
  torus: new TorusGeometry(0.5, 0.25, 128, 128),
  torusKnot: new TorusKnotGeometry(0.5, 0.18, 128, 128),
  leePerrySmith: null as BufferGeometry | null,
};

type TGeometry = keyof typeof geometries;
type TMaterial = keyof typeof materials;

// Create mesh

const mesh = new Mesh(geometries.sphere, materials.milk);
manager.scene.add(mesh);

// Update displacement

manager.callbacks.on('render', () => {
  displacement.updateWaves();
});

// Add displacement interaction

const raycaster = new Raycaster();

function releaseFromCursor(x: number, y: number) {
  const pointer = new Vector2(x, y);

  raycaster.setFromCamera(pointer, manager.camera);
  const intersects = raycaster.intersectObject(mesh);

  if (intersects.length > 0) {
    const intersect = intersects[0];
    const localPoint = mesh.worldToLocal(intersect.point.clone());
    displacement.releaseWave(localPoint);
  }
}

const cursor = new Cursor({
  lerp: 1,
  onRender: () => {
    if (!settings.mouse.value) {
      return;
    }

    const { coords } = cursor;

    const x = (coords.x / vevet.width) * 2 - 1;
    const y = -(coords.y / vevet.height) * 2 + 1;

    releaseFromCursor(x, y);
  },
});

// GUI

const meshParams = {
  geometry: 'sphere' as TGeometry,
  material: 'milk' as TMaterial,
};

const geometryController = gui
  .add(meshParams, 'geometry', Object.keys(geometries) as TGeometry[])
  .onChange((value) => {
    if (value === 'leePerrySmith') {
      loadModelGeometry('LeePerrySmith.glb', 2)
        .then((geo) => {
          geometries.leePerrySmith = geo;

          if (meshParams.geometry === 'leePerrySmith') {
            mesh.geometry = geo as any;
          }
        })
        .catch(() => {});

      const current = (geometries as any).leePerrySmith;
      if (current) {
        mesh.geometry = current;
      }

      return;
    }

    mesh.geometry = geometries[value] as any;
  });

const materialController = gui
  .add(meshParams, 'material', Object.keys(materials) as TMaterial[])
  .onChange((value) => {
    mesh.material = materials[value] as any;
  });

const waveTextureMap = {
  empty: emptyTexture,
  ripple: rippleTexture,
  smoke: smokeTexture,
} as const;

type TWaveTextures = keyof typeof waveTextureMap;

const waveTextureParams: { texture: TWaveTextures } = {
  texture: 'smoke',
};

const waveTextureController = gui
  .add(
    waveTextureParams,
    'texture',
    Object.keys(waveTextureMap) as TWaveTextures[],
  )
  .name('Wave texture')
  .onChange((key: keyof typeof waveTextureMap) => {
    waveTexture.value = waveTextureMap[key];
  });

// Presets

type TPreset = {
  geometry?: TGeometry;
  material?: TMaterial;
  waveTexture?: TWaveTextures;
} & Partial<typeof defaultSettings>;

const presets: Record<string, TPreset> = {
  Default: {
    ...defaultSettings,
    geometry: 'sphere',
    material: 'milk',
    waveTexture: 'smoke',
  },
  'Clay Sphere': {
    ...defaultSettings,
    geometry: 'sphere',
    material: 'clay',
    waveTexture: 'smoke',
    amplitude: 0.5,
  },
  'Metal Torus': {
    geometry: 'torus',
    material: 'metal',
    waveTexture: 'ripple',
    speed: 2500,
    amplitude: 1.5,
  },
  'Boiling Torus': {
    geometry: 'torus',
    material: 'clay',
    waveTexture: 'smoke',
    speed: 1250,
    amplitude: 0.7,
  },
  'Lee Perry Smith': {
    geometry: 'leePerrySmith',
    material: 'normal',
    waveTexture: 'ripple',
    speed: 2500,
    amplitude: 1.5,
  },
};

const presetParams = {
  preset: 'Default',
};

function applyPreset(name: keyof typeof presets) {
  const preset = presets[name];
  if (!preset) {
    return;
  }

  if (preset.geometry) {
    meshParams.geometry = preset.geometry as TGeometry;
    geometryController.setValue(meshParams.geometry);
  }

  if (preset.material) {
    meshParams.material = preset.material as TMaterial;
    materialController.setValue(meshParams.material);
  }

  Object.keys(preset).forEach((key) => {
    if (key in displacement.settings) {
      const value = (preset as any)[key];
      (displacement.settings as any)[key].value = value;
    }
  });

  if ('waveTexture' in preset && preset.waveTexture) {
    waveTexture.value = waveTextureMap[preset.waveTexture];
  }

  displacement.updateGUI?.();
  waveTextureController.updateDisplay();
}

const presetsGui = gui.addFolder('Presets');
presetsGui
  .add(presetParams, 'preset', Object.keys(presets))
  .name('Preset')
  .onChange((name) => applyPreset(String(name)));

applyPreset('Default');
