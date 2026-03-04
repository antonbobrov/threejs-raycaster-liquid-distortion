import { animate } from 'animejs';
import { Vector3, Vector4 } from 'three';
import { UniformNode } from 'three/webgpu';

export class Wave {
  private _data = new Vector4(0, 0, 0, 0);

  constructor(private _speed: UniformNode<'float', number>) {}

  public update(coord: Vector3) {
    this._data.x = coord.x;
    this._data.y = coord.y;
    this._data.z = coord.z;
    this._data.w = 0;

    animate(this._data, {
      duration: this._speed.value,
      w: 1,
      ease: 'outCubic',
    });
  }

  get data() {
    return this._data;
  }
}
