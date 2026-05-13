import * as THREE from 'three';
import type { Piece3D } from '../../geometry/core/types';
import { LIGHT_TOKENS, getCurrentTokens, type DiagramTokens } from '../diagram-tokens';
import { buildMaterialSet, buildPieceObject, createGeometryCache, disposeGeometryCache, disposeMaterialSet, evictGeometryCache, applyEdgeColors, type GeometryCache, type MaterialSet } from './pieces';
import type { Polygon, PolygonWithHoles } from '../../geometry/core/types';
import { addSceneHelpers, viewerBackground, type SceneHelpers } from './scene';
import { createCameraSystem, FOV_ORTHO, FOV_PERSP, type CameraSystem, type Projection } from './camera';
import { mountViewCube, type ViewCubeHandle } from './view-cube';
import { ColorTween, type ColorTrack } from './tween';
import { createDebugLayer, isDebugEnabled, type DebugLayer } from './debug';

export interface RoofViewerHandle {
  setPieces: (pieces: Piece3D[]) => void;
  setTokens: (tokens: DiagramTokens, opts?: { animate?: boolean; durationMs?: number }) => void;
  destroy: () => void;
  resize: () => void;
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export function mountRoofViewer(container: HTMLElement, initialTokens?: DiagramTokens): RoofViewerHandle {
  const tokens: DiagramTokens = initialTokens ?? getCurrentTokens() ?? LIGHT_TOKENS;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(viewerBackground(tokens));

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(container.clientWidth || 600, container.clientHeight || 400);
  container.appendChild(renderer.domElement);

  const target = new THREE.Vector3(0, 0, 2);
  const cameraSystem: CameraSystem = createCameraSystem(
    renderer.domElement,
    (container.clientWidth || 600) / (container.clientHeight || 400),
    target,
  );

  const sceneHelpers: SceneHelpers = addSceneHelpers(scene, 0.4, tokens);

  const materials: MaterialSet = buildMaterialSet(tokens);
  const geometryCache: GeometryCache = createGeometryCache();
  const pieceObjects: THREE.Object3D[] = [];

  const debugLayer: DebugLayer | null = isDebugEnabled() ? createDebugLayer() : null;
  if (debugLayer) scene.add(debugLayer.group);
  let firstFitDone = false;
  let lastBbox = new THREE.Box3();
  let tween = new ColorTween(220);

  let camTweenActive = false;
  let camTweenT0 = 0;
  const camTweenDuration = 300;
  const camTweenFrom = new THREE.Vector3();
  const camTweenTo = new THREE.Vector3();

  function tweenCameraTo(worldDir: THREE.Vector3): void {
    const currentDist = cameraSystem.camera.position.distanceTo(target) || 30;
    camTweenFrom.copy(cameraSystem.camera.position);
    camTweenTo.copy(target).addScaledVector(worldDir.clone().normalize(), currentDist);
    camTweenT0 = performance.now();
    camTweenActive = true;
  }

  let fovTweenActive = false;
  let fovTweenT0 = 0;
  let fovTweenFrom = FOV_ORTHO;
  let fovTweenTo = FOV_ORTHO;
  const fovTweenDuration = 320;

  const viewCube: ViewCubeHandle = mountViewCube(
    container,
    { onFace: (worldDir) => tweenCameraTo(worldDir) },
    tokens,
  );

  viewCube.root.style.display = 'none';

  const projBtn = document.createElement('button');
  projBtn.type = 'button';
  Object.assign(projBtn.style, {
    position: 'absolute',
    top: '12px',
    right: '12px',
    font: '14px "Times New Roman", Times, serif',
    padding: '4px 10px',
    cursor: 'pointer',
    border: '1px solid var(--rule)',
    borderRadius: '0',
    pointerEvents: 'auto',
    zIndex: '2',
  });
  function paintProjBtn(p: Projection, themeTokens: DiagramTokens): void {
    projBtn.textContent = p === 'ortho' ? 'Ortho' : 'Persp';
    const isDark = themeTokens.background === '#2A2A28';
    projBtn.style.background = isDark ? 'rgba(42,42,40,0.85)' : 'rgba(255,255,255,0.85)';
    projBtn.style.color = themeTokens.text;
    projBtn.style.borderColor = isDark ? '#3a3a37' : '#d8d4c8';
  }
  paintProjBtn(cameraSystem.projection, tokens);
  projBtn.addEventListener('click', () => {
    const next: Projection = cameraSystem.projection === 'ortho' ? 'persp' : 'ortho';
    fovTweenFrom = cameraSystem.camera.fov;
    fovTweenTo = next === 'persp' ? FOV_PERSP : FOV_ORTHO;
    fovTweenT0 = performance.now();
    fovTweenActive = true;
    cameraSystem.projection = next;
    try { localStorage.setItem('mt:ui:roof:projection', next); } catch {  }
    paintProjBtn(next, currentTokens);
  });
  container.appendChild(projBtn);

  let currentTokens: DiagramTokens = tokens;

  let needsRender = true;
  let lastPiecesRef: Piece3D[] | null = null;
  // True between an OrbitControls 'start' and the end of its post-release
  // damping window. Used to (a) force a render every frame while the user
  // is interacting and (b) defer mesh swaps until the drag finishes so
  // setPieces() can't flash the model mid-orbit.
  let interacting = false;
  let pendingPieces: Piece3D[] | null = null;

  function requestRender(): void { needsRender = true; }

  function clearPieces(): void {
    for (const obj of pieceObjects) scene.remove(obj);
    pieceObjects.length = 0;
  }

  function setPieces(pieces: Piece3D[]): void {
    if (pieces === lastPiecesRef) return;
    // Mid-drag mesh rebuilds make the model momentarily disappear and the
    // camera state feels unreliable. Stash the new pieces and apply them
    // when the drag ends (see the 'end' handler below).
    if (interacting) { pendingPieces = pieces; return; }
    lastPiecesRef = pieces;
    clearPieces();
    const live = new Set<Polygon | PolygonWithHoles>();
    for (const p of pieces) {
      const obj = buildPieceObject(p, materials, geometryCache);
      scene.add(obj);
      pieceObjects.push(obj);
      live.add(p.polygon);
    }
    evictGeometryCache(geometryCache, live);
    if (debugLayer) debugLayer.update(pieces);
    const bbox = new THREE.Box3();
    for (const obj of pieceObjects) bbox.expandByObject(obj);
    sceneHelpers.layoutForBbox(bbox);
    lastBbox = bbox;
    if (!firstFitDone && !bbox.isEmpty()) {
      cameraSystem.fitToBbox(bbox);
      firstFitDone = true;
    }
    needsRender = true;
  }

  function resize(): void {

    const w = container.clientWidth;
    const h = container.clientHeight;
    if (w === 0 || h === 0) return;
    const aspect = w / h;
    cameraSystem.setAspect(aspect);

    renderer.setSize(w, h);

    if (!lastBbox.isEmpty()) cameraSystem.refitForAspect(lastBbox);
    needsRender = true;
  }

  // OrbitControls events: 'start' fires on pointerdown, 'change' on each
  // camera state mutation (drag + damping frames), 'end' on pointerup.
  // We listen to all three so the render loop can't miss either edge of
  // a drag — and we hold the interacting flag from 'start' to the end of
  // the damping settle so setPieces() defers and frames keep rendering.
  const onInteractionStart = (): void => {
    interacting = true;
    needsRender = true;
  };
  const onInteractionEnd = (): void => {
    interacting = false;
    needsRender = true;
    // Apply any pieces that landed during the drag.
    if (pendingPieces) {
      const next = pendingPieces;
      pendingPieces = null;
      setPieces(next);
    }
  };
  cameraSystem.controls.addEventListener('start', onInteractionStart);
  cameraSystem.controls.addEventListener('change', requestRender);
  cameraSystem.controls.addEventListener('end', onInteractionEnd);

  let raf = 0;
  function tick(): void {

    if (camTweenActive) {
      const t = Math.min(1, (performance.now() - camTweenT0) / camTweenDuration);
      const eased = easeInOutCubic(t);
      cameraSystem.camera.position.lerpVectors(camTweenFrom, camTweenTo, eased);
      cameraSystem.camera.lookAt(target);
      cameraSystem.controls.target.copy(target);
      if (t >= 1) {
        camTweenActive = false;
        if (!lastBbox.isEmpty()) cameraSystem.fitToBbox(lastBbox);
      }
      needsRender = true;
    }
    if (fovTweenActive) {
      const t = Math.min(1, (performance.now() - fovTweenT0) / fovTweenDuration);
      const eased = easeInOutCubic(t);
      const fov = fovTweenFrom + (fovTweenTo - fovTweenFrom) * eased;
      cameraSystem.setFov(fov);

      if (!lastBbox.isEmpty()) cameraSystem.fitToBbox(lastBbox);
      if (t >= 1) fovTweenActive = false;
      needsRender = true;
    }
    cameraSystem.update();
    if (tween.isActive()) {
      tween.update(performance.now());
      needsRender = true;
    }
    // While the user is dragging, render every frame regardless of whether
    // a 'change' event fired this tick — pointer-state-to-camera-state
    // propagation can lag a frame and miss renders otherwise. This is the
    // single biggest source of perceived "drag unreliability".
    if (interacting) needsRender = true;

    if (needsRender) {
      renderer.render(scene, cameraSystem.camera);
      needsRender = false;
    }
    raf = requestAnimationFrame(tick);
  }
  raf = requestAnimationFrame(tick);

  function setTokens(newTokens: DiagramTokens, opts?: { animate?: boolean; durationMs?: number }): void {
    const animate = opts?.animate ?? true;
    const durationMs = Math.max(0, opts?.durationMs ?? 220);

    currentTokens = newTokens;
    viewCube.applyTokens(newTokens);
    paintProjBtn(cameraSystem.projection, newTokens);

    const bgColor = viewerBackground(newTokens);

    if (!animate || durationMs === 0) {
      applyEdgeColors(materials, newTokens);
      if (scene.background instanceof THREE.Color) scene.background.set(bgColor);
      sceneHelpers.applyTokens(newTokens);
      tween.cancel();
      needsRender = true;
      return;
    }

    const bg = scene.background instanceof THREE.Color ? scene.background : null;
    const groundMat = sceneHelpers.ground.material as THREE.MeshBasicMaterial;
    const tracks: ColorTrack[] = [];

    function addEdgeTrack(key: string, stroke: string): void {
      const mat = materials.edge[key];
      if (!mat) return;
      tracks.push({
        from: mat.color.clone(),
        to: new THREE.Color(stroke),
        target: mat.color,
      });
    }
    addEdgeTrack('rafter', newTokens.strokeWood);
    addEdgeTrack('ridge', newTokens.strokeRidge);
    addEdgeTrack('joist', newTokens.strokeStruct);
    addEdgeTrack('collar tie', newTokens.strokeStruct);
    addEdgeTrack('wall', newTokens.strokeWall);
    addEdgeTrack('default', newTokens.strokeWall);

    if (bg) {
      tracks.push({ from: bg.clone(), to: new THREE.Color(bgColor), target: bg });
    }
    tracks.push({
      from: groundMat.color.clone(),
      to: new THREE.Color(bgColor),
      target: groundMat.color,
    });

    tween.cancel();
    tween = new ColorTween(durationMs);
    tween.start(tracks, performance.now());
  }

  const ro = new ResizeObserver(resize);
  ro.observe(container);
  resize();

  const onContextLost = (e: Event) => {
    e.preventDefault();
    cancelAnimationFrame(raf);
    raf = 0;
  };
  const onContextRestored = () => {
    needsRender = true;
    if (raf === 0) raf = requestAnimationFrame(tick);
  };
  renderer.domElement.addEventListener('webglcontextlost', onContextLost, false);
  renderer.domElement.addEventListener('webglcontextrestored', onContextRestored, false);

  return {
    setPieces,
    setTokens,
    resize,
    destroy(): void {
      cancelAnimationFrame(raf);
      raf = 0;
      ro.disconnect();
      renderer.domElement.removeEventListener('webglcontextlost', onContextLost);
      renderer.domElement.removeEventListener('webglcontextrestored', onContextRestored);
      cameraSystem.controls.removeEventListener('start', onInteractionStart);
      cameraSystem.controls.removeEventListener('change', requestRender);
      cameraSystem.controls.removeEventListener('end', onInteractionEnd);
      clearPieces();
      if (debugLayer) debugLayer.dispose();
      disposeGeometryCache(geometryCache);
      disposeMaterialSet(materials);
      viewCube.destroy();
      projBtn.remove();
      cameraSystem.dispose();
      renderer.forceContextLoss();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    },
  };
}
