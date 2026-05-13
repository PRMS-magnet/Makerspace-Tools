import * as THREE from 'three';
import type { DiagramTokens } from '../diagram-tokens';

export interface SceneHelpers {
  ground: THREE.Mesh;
  shadow: THREE.Mesh;
  layoutForBbox: (bbox: THREE.Box3) => void;
  applyTokens: (tokens: DiagramTokens) => void;
}

export function viewerBackground(tokens: DiagramTokens): string {
  return tokens.background === '#2A2A28' ? '#2A2A28' : '#FFFFFF';
}

function makeShadowTexture(): THREE.CanvasTexture {
  const size = 256;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d');
  if (!ctx) throw new Error('shadow canvas: no 2d context');
  const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, 'rgba(0,0,0,0.18)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function addSceneHelpers(scene: THREE.Scene, wallStubHeightIn: number, initialTokens: DiagramTokens): SceneHelpers {

  const groundGeo = new THREE.PlaneGeometry(1, 1);
  const groundMat = new THREE.MeshBasicMaterial({ color: viewerBackground(initialTokens) });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.position.z = -wallStubHeightIn - 0.02;
  scene.add(ground);

  const shadowTex = makeShadowTexture();
  const shadowMat = new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false });
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), shadowMat);
  shadow.position.z = -wallStubHeightIn - 0.01;
  scene.add(shadow);

  const layoutForBbox = (bbox: THREE.Box3): void => {
    if (bbox.isEmpty()) return;
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    bbox.getSize(size);
    bbox.getCenter(center);
    const footW = size.x * 1.3;
    const footH = size.y * 1.3;
    ground.scale.set(Math.max(footW * 2, 12), Math.max(footH * 2, 12), 1);
    ground.position.x = center.x;
    ground.position.y = center.y;
    shadow.scale.set(size.x * 1.2, size.y * 1.2, 1);
    shadow.position.x = center.x;
    shadow.position.y = center.y;
  };

  const applyTokens = (tokens: DiagramTokens): void => {
    groundMat.color.set(viewerBackground(tokens));
  };

  return { ground, shadow, layoutForBbox, applyTokens };
}
