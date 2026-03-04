import { Webgl } from './webgl';

const container = document.getElementById('scene')!;

export const manager = new Webgl(container, {
  near: 0.1,
  far: 50,
  fov: 30,
  perspective: 5,
  alpha: true,
});
