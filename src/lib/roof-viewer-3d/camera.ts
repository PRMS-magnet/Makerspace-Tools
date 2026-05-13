import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export type Projection = 'persp' | 'ortho';
export type PresetName = 'front' | 'side' | 'top' | 'iso' | 'home';

export const FOV_PERSP = 40;

export const FOV_ORTHO = 3;

export interface CameraSystem {
  camera: THREE.PerspectiveCamera;
  controls: OrbitControls;
  projection: Projection;
  target: THREE.Vector3;
  aspect: number;
  setAspect: (a: number) => void;
  setProjection: (p: Projection) => void;
  setFov: (f: number) => void;
  applyPreset: (name: PresetName) => void;
  fitToBbox: (bbox: THREE.Box3) => void;

  refitForAspect: (bbox: THREE.Box3) => void;
  update: () => void;
  dispose: () => void;
}

const ISO_DIR: [number, number, number] = [-1, 1, -0.7];

const PRESET_DIRECTIONS: Record<PresetName, [number, number, number]> = {
  front: [-1, 0, 0],
  side: [0, 1, 0],
  top: [0, 0, -1],
  iso: ISO_DIR,
  home: ISO_DIR,
};

function presetUp(name: PresetName): THREE.Vector3 {
  if (name === 'top') return new THREE.Vector3(0, 1, 0);
  return new THREE.Vector3(0, 0, 1);
}

export function fitCameraToBbox(
  camera: THREE.PerspectiveCamera,
  target: THREE.Vector3,
  bbox: THREE.Box3,
  canvasAspect: number,
  paddingFactor = 1.1,
): void {
  if (bbox.isEmpty()) return;
  const size = new THREE.Vector3();
  bbox.getSize(size);
  if (size.lengthSq() === 0) return;

  const up = camera.up.clone().normalize();
  const viewDir = new THREE.Vector3().subVectors(target, camera.position).normalize();
  const right = new THREE.Vector3().crossVectors(viewDir, up).normalize();
  up.crossVectors(right, viewDir).normalize();

  const center = new THREE.Vector3();
  bbox.getCenter(center);

  const corners: THREE.Vector3[] = [
    new THREE.Vector3(bbox.min.x, bbox.min.y, bbox.min.z),
    new THREE.Vector3(bbox.min.x, bbox.min.y, bbox.max.z),
    new THREE.Vector3(bbox.min.x, bbox.max.y, bbox.min.z),
    new THREE.Vector3(bbox.min.x, bbox.max.y, bbox.max.z),
    new THREE.Vector3(bbox.max.x, bbox.min.y, bbox.min.z),
    new THREE.Vector3(bbox.max.x, bbox.min.y, bbox.max.z),
    new THREE.Vector3(bbox.max.x, bbox.max.y, bbox.min.z),
    new THREE.Vector3(bbox.max.x, bbox.max.y, bbox.max.z),
  ];
  let halfW = 0;
  let halfH = 0;
  for (const corner of corners) {
    const v = new THREE.Vector3().subVectors(corner, center);
    halfW = Math.max(halfW, Math.abs(v.dot(right)));
    halfH = Math.max(halfH, Math.abs(v.dot(up)));
  }

  if (halfW / halfH < canvasAspect) {
    halfW = halfH * canvasAspect;
  } else {
    halfH = halfW / canvasAspect;
  }

  const vHalfFov = (camera.fov * Math.PI) / 180 / 2;
  const hHalfFov = Math.atan(Math.tan(vHalfFov) * camera.aspect);
  const distV = halfH / Math.tan(vHalfFov);
  const distH = halfW / Math.tan(hHalfFov);
  const dist = Math.max(distV, distH) * paddingFactor;
  camera.position.copy(target).addScaledVector(viewDir, -dist);

  camera.far = Math.max(1000, dist * 4);
  camera.near = Math.max(0.01, dist / 1000);
  camera.updateProjectionMatrix();
}

export function createCameraSystem(
  domElement: HTMLElement,
  initialAspect: number,
  target: THREE.Vector3,
): CameraSystem {
  let currentAspect = initialAspect;
  const startProjection: Projection = (() => {
    try {
      const v = localStorage.getItem('mt:ui:roof:projection');
      return v === 'persp' || v === 'ortho' ? v : 'ortho';
    } catch {
      return 'ortho';
    }
  })();

  const startFov = startProjection === 'persp' ? FOV_PERSP : FOV_ORTHO;
  const camera = new THREE.PerspectiveCamera(startFov, initialAspect, 0.1, 10000);
  camera.up.set(0, 0, 1);

  const isoDir = new THREE.Vector3(...ISO_DIR).normalize();
  camera.position.copy(target).addScaledVector(isoDir, -50);
  camera.lookAt(target);

  const controls = new OrbitControls(camera, domElement);
  controls.target.copy(target);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.update();

  function setAspect(a: number): void {
    if (!Number.isFinite(a) || a <= 0) return;
    currentAspect = a;
    camera.aspect = a;
    camera.updateProjectionMatrix();
    system.aspect = a;
  }

  function setFov(f: number): void {
    camera.fov = f;
    camera.updateProjectionMatrix();
  }

  function setProjection(p: Projection): void {
    if (p === system.projection) return;
    system.projection = p;
    camera.fov = p === 'persp' ? FOV_PERSP : FOV_ORTHO;
    camera.updateProjectionMatrix();
    try {
      localStorage.setItem('mt:ui:roof:projection', p);
    } catch {  }
  }

  function applyPreset(name: PresetName): void {
    const dir = new THREE.Vector3(...PRESET_DIRECTIONS[name]).normalize();
    const up = presetUp(name);
    camera.up.copy(up);
    const placeholderDist = 50;
    camera.position.copy(target).addScaledVector(dir, -placeholderDist);
    camera.lookAt(target);
    controls.target.copy(target);
    controls.update();
  }

  function fitToBbox(bbox: THREE.Box3): void {

    if (!bbox.isEmpty()) bbox.getCenter(target);
    fitCameraToBbox(camera, target, bbox, currentAspect);
    controls.target.copy(target);
    controls.update();
  }

  function refitForAspect(bbox: THREE.Box3): void {

    if (bbox.isEmpty()) return;
    fitCameraToBbox(camera, target, bbox, currentAspect);
    controls.update();
  }

  function update(): void {
    controls.update();
  }

  function dispose(): void {
    controls.dispose();
  }

  const system: CameraSystem = {
    camera, controls, projection: startProjection, target,
    aspect: currentAspect,
    setAspect, setFov, setProjection, applyPreset, fitToBbox, refitForAspect, update, dispose,
  };
  return system;
}
