import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { fitCameraToBbox } from './camera';

describe('fitCameraToBbox (perspective)', () => {
  it('moves the camera back far enough to fit a 10x10x10 box', () => {
    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 1000);
    camera.up.set(0, 0, 1);
    camera.position.set(20, 0, 0);
    const target = new THREE.Vector3(0, 0, 0);
    const bbox = new THREE.Box3(new THREE.Vector3(-5, -5, -5), new THREE.Vector3(5, 5, 5));
    fitCameraToBbox(camera, target, bbox, 1, 1.1);
    const dist = camera.position.distanceTo(target);

    expect(dist).toBeGreaterThan(15);
    expect(dist).toBeLessThan(16);
  });

  it('points the camera at the target', () => {
    const camera = new THREE.PerspectiveCamera(40, 1.5, 0.1, 1000);
    camera.up.set(0, 0, 1);
    camera.position.set(1, 2, 3).normalize().multiplyScalar(50);
    const target = new THREE.Vector3(0, 0, 0);
    const bbox = new THREE.Box3(new THREE.Vector3(-1, -1, -1), new THREE.Vector3(1, 1, 1));
    fitCameraToBbox(camera, target, bbox, 1.5, 1.1);
    const dir = new THREE.Vector3().subVectors(target, camera.position).normalize();
    const expected = new THREE.Vector3(1, 2, 3).normalize();
    expect(dir.dot(expected)).toBeCloseTo(-1, 5);
  });

  it('is a no-op for an empty bbox', () => {
    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 1000);
    camera.position.set(7, 8, 9);
    const before = camera.position.clone();
    const target = new THREE.Vector3();
    const bbox = new THREE.Box3();
    fitCameraToBbox(camera, target, bbox, 1, 1.1);
    expect(camera.position.distanceTo(before)).toBe(0);
  });
});

describe('fitCameraToBbox (narrow-FOV ortho-like)', () => {
  it('with FOV=3, distance is far enough that a 10x10x10 box fits', () => {
    const camera = new THREE.PerspectiveCamera(3, 1, 0.1, 10000);
    camera.up.set(0, 0, 1);
    camera.position.set(20, 0, 0);
    const target = new THREE.Vector3(0, 0, 0);
    const bbox = new THREE.Box3(new THREE.Vector3(-5, -5, -5), new THREE.Vector3(5, 5, 5));
    fitCameraToBbox(camera, target, bbox, 1, 1.1);
    const dist = camera.position.distanceTo(target);

    expect(dist).toBeGreaterThan(150);
    expect(dist).toBeLessThan(300);
  });
});
