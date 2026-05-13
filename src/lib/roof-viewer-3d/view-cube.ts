import * as THREE from 'three';
import type { DiagramTokens } from '../diagram-tokens';

export interface ViewCubeHandlers {
  onFace: (worldDir: THREE.Vector3) => void;
}

export interface ViewCubeHandle {
  root: HTMLDivElement;
  sync: (mainCamera: THREE.Camera, mainTarget: THREE.Vector3) => void;
  applyTokens: (tokens: DiagramTokens) => void;
  destroy: () => void;
}

const FACE_LABELS: readonly string[] = ['FRONT', 'BACK', 'RIGHT', 'LEFT', 'TOP', 'BOTTOM'];
const FACE_DIRS: readonly THREE.Vector3[] = [
  new THREE.Vector3(+1, 0, 0),
  new THREE.Vector3(-1, 0, 0),
  new THREE.Vector3(0, +1, 0),
  new THREE.Vector3(0, -1, 0),
  new THREE.Vector3(0, 0, +1),
  new THREE.Vector3(0, 0, -1),
];

const GIZMO_PX = 96;
const TEX_PX = 128;

function isDark(tokens: DiagramTokens): boolean {
  return tokens.background === '#2A2A28';
}

const FACE_TEXT_ROTATION: readonly number[] = [
  -Math.PI / 2,
  +Math.PI / 2,
  Math.PI,
  0,
  0,
  Math.PI,
];

function makeFaceTexture(label: string, tokens: DiagramTokens, textRotation: number): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = TEX_PX;
  c.height = TEX_PX;
  const ctx = c.getContext('2d');
  if (!ctx) throw new Error('view-cube: no 2d context');
  ctx.fillStyle = isDark(tokens) ? '#3a3a37' : '#e8e6dc';
  ctx.fillRect(0, 0, TEX_PX, TEX_PX);
  ctx.strokeStyle = tokens.strokeWall;
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, TEX_PX - 4, TEX_PX - 4);
  ctx.save();
  ctx.translate(TEX_PX / 2, TEX_PX / 2);
  ctx.rotate(textRotation);
  ctx.fillStyle = tokens.text;
  ctx.font = '600 22px "Times New Roman", Times, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, 0, 0);
  ctx.restore();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function mountViewCube(
  host: HTMLElement,
  handlers: ViewCubeHandlers,
  initialTokens: DiagramTokens,
): ViewCubeHandle {
  const root = document.createElement('div');
  root.className = 'roof-viewer-cube';
  Object.assign(root.style, {
    position: 'absolute',
    top: '12px',
    right: '12px',
    width: `${GIZMO_PX}px`,
    height: `${GIZMO_PX}px`,
    pointerEvents: 'auto',
    cursor: 'pointer',
    zIndex: '2',
    userSelect: 'none',
  });

  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(GIZMO_PX, GIZMO_PX);
  renderer.setClearColor(0x000000, 0);
  root.appendChild(renderer.domElement);

  const scene = new THREE.Scene();

  const camera = new THREE.OrthographicCamera(-1.4, 1.4, 1.4, -1.4, 0.1, 100);
  camera.up.set(0, 0, 1);
  camera.position.set(5, 0, 0);
  camera.lookAt(0, 0, 0);

  const materials = FACE_LABELS.map((l, i) => new THREE.MeshBasicMaterial({ map: makeFaceTexture(l, initialTokens, FACE_TEXT_ROTATION[i]) }));
  const cube = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.4, 1.4), materials);
  scene.add(cube);

  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  root.addEventListener('click', (e: MouseEvent) => {
    const rect = renderer.domElement.getBoundingClientRect();
    ndc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    ndc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(ndc, camera);
    const hits = raycaster.intersectObject(cube);
    if (hits.length === 0) return;
    const hit = hits[0];
    const slotIdx = hit.face?.materialIndex;
    if (slotIdx === undefined) return;

    handlers.onFace(FACE_DIRS[slotIdx].clone());
  });

  const dirVec = new THREE.Vector3();
  function sync(mainCamera: THREE.Camera, mainTarget: THREE.Vector3): void {
    dirVec.subVectors(mainCamera.position, mainTarget);
    if (dirVec.lengthSq() < 1e-6) dirVec.set(0, -1, 0);
    dirVec.normalize();
    camera.position.copy(dirVec).multiplyScalar(5);
    camera.up.copy(mainCamera.up);
    camera.lookAt(0, 0, 0);
    renderer.render(scene, camera);
  }

  function applyTokens(tokens: DiagramTokens): void {
    materials.forEach((m, i) => {
      m.map?.dispose();
      m.map = makeFaceTexture(FACE_LABELS[i], tokens, FACE_TEXT_ROTATION[i]);
      m.needsUpdate = true;
    });
  }

  function destroy(): void {
    materials.forEach((m) => {
      m.map?.dispose();
      m.dispose();
    });
    cube.geometry.dispose();
    renderer.dispose();
    root.remove();
  }

  host.appendChild(root);
  return { root, sync, applyTokens, destroy };
}
