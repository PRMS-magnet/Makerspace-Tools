export interface ReorderableOptions {
  itemSelector?: string;
  handleSelector?: string;
  getKey?: (el: HTMLElement) => string;
  onReorder?: (newKeys: string[]) => void;
  flipDurationMs?: number;
  springDurationMs?: number;
}

export interface Reorderable {
  destroy: () => void;
  getKeys: () => string[];
}

const SPRING_EASE = 'cubic-bezier(0.34, 1.56, 0.64, 1)';
const FLIP_EASE = 'cubic-bezier(0.4, 0, 0.2, 1)';

export function makeReorderable(container: HTMLElement, options: ReorderableOptions = {}): Reorderable {
  const itemSelector = options.itemSelector ?? '[data-reorder-item]';
  const handleSelector = options.handleSelector ?? '[data-reorder-handle]';
  const getKey = options.getKey ?? ((el) => el.dataset.reorderKey ?? '');
  const flipMs = options.flipDurationMs ?? 220;
  const springMs = options.springDurationMs ?? 340;

  let dragging: HTMLElement | null = null;
  let pointerId = -1;
  let cursorOffsetX = 0;
  let cursorOffsetY = 0;
  let cursorX = 0;
  let cursorY = 0;
  let naturalDocX = 0;
  let naturalDocY = 0;
  let scrollRaf: number | null = null;

  function getItems(): HTMLElement[] {
    return [...container.querySelectorAll<HTMLElement>(itemSelector)].filter((i) => !i.hidden);
  }

  function getKeys(): string[] {
    return getItems().map(getKey);
  }

  function recordNaturalPos(el: HTMLElement) {
    const savedTransform = el.style.transform;
    const savedTransition = el.style.transition;
    el.style.transition = 'none';
    el.style.transform = '';
    const rect = el.getBoundingClientRect();
    naturalDocX = rect.left + window.scrollX;
    naturalDocY = rect.top + window.scrollY;
    el.style.transform = savedTransform;
    el.style.transition = savedTransition;
  }

  function updateDragTransform() {
    if (!dragging) return;
    const visualScreenX = cursorX - cursorOffsetX;
    const visualScreenY = cursorY - cursorOffsetY;
    const naturalScreenX = naturalDocX - window.scrollX;
    const naturalScreenY = naturalDocY - window.scrollY;
    const dx = visualScreenX - naturalScreenX;
    const dy = visualScreenY - naturalScreenY;
    dragging.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
  }

  function flipOthers(oldRects: Map<HTMLElement, DOMRect>) {
    for (const [item, oldRect] of oldRects) {
      if (item === dragging) continue;
      if (!item.isConnected) continue;
      const newRect = item.getBoundingClientRect();
      const dx = oldRect.left - newRect.left;
      const dy = oldRect.top - newRect.top;
      if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) continue;
      item.style.transition = 'none';
      item.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
      void item.offsetHeight;
      item.style.transition = `transform ${flipMs}ms ${FLIP_EASE}`;
      requestAnimationFrame(() => {
        item.style.transform = '';
      });
      const cleanup = () => {
        item.style.transition = '';
        item.style.transform = '';
        item.removeEventListener('transitionend', cleanup);
      };
      item.addEventListener('transitionend', cleanup);
      setTimeout(cleanup, flipMs + 100);
    }
  }

  function checkLiveReorder() {
    if (!dragging) return;
    const items = getItems();
    const draggedIdx = items.indexOf(dragging);
    if (draggedIdx < 0) return;

    for (const item of items) {
      if (item === dragging) continue;
      const rect = item.getBoundingClientRect();
      if (cursorX < rect.left || cursorX > rect.right) continue;
      if (cursorY < rect.top || cursorY > rect.bottom) continue;

      const itemIdx = items.indexOf(item);
      const midX = rect.left + rect.width / 2;
      const midY = rect.top + rect.height / 2;

      const before = (cursorX - midX) + (cursorY - midY) < 0;

      if (before && itemIdx < draggedIdx) {
        const oldRects = new Map(items.map((it) => [it, it.getBoundingClientRect()]));
        item.parentNode!.insertBefore(dragging, item);
        recordNaturalPos(dragging);
        updateDragTransform();
        flipOthers(oldRects);
        options.onReorder?.(getKeys());
        return;
      }
      if (!before && itemIdx > draggedIdx) {
        const oldRects = new Map(items.map((it) => [it, it.getBoundingClientRect()]));
        item.parentNode!.insertBefore(dragging, item.nextSibling);
        recordNaturalPos(dragging);
        updateDragTransform();
        flipOthers(oldRects);
        options.onReorder?.(getKeys());
        return;
      }
    }
  }

  function autoScrollTick() {
    if (!dragging) { scrollRaf = null; return; }
    const edge = 90;
    const maxSpeed = 18;
    let dy = 0;
    if (cursorY < edge) {
      dy = -maxSpeed * Math.max(0, 1 - cursorY / edge);
    } else if (cursorY > window.innerHeight - edge) {
      dy = maxSpeed * Math.max(0, 1 - (window.innerHeight - cursorY) / edge);
    }
    if (dy !== 0) {
      window.scrollBy(0, dy);
      updateDragTransform();
      checkLiveReorder();
    }
    scrollRaf = requestAnimationFrame(autoScrollTick);
  }

  function onPointerDown(e: PointerEvent) {
    const target = e.target as Element | null;
    if (!target) return;
    const handle = target.closest(handleSelector);
    if (!handle || !container.contains(handle)) return;
    const item = handle.closest(itemSelector) as HTMLElement | null;
    if (!item || !container.contains(item)) return;
    if (e.button !== 0 && e.pointerType === 'mouse') return;

    e.preventDefault();
    dragging = item;
    pointerId = e.pointerId;
    cursorX = e.clientX;
    cursorY = e.clientY;

    const rect = item.getBoundingClientRect();
    cursorOffsetX = e.clientX - rect.left;
    cursorOffsetY = e.clientY - rect.top;
    naturalDocX = rect.left + window.scrollX;
    naturalDocY = rect.top + window.scrollY;

    item.classList.add('reorder-dragging');
    document.body.classList.add('reorder-active');
    item.style.willChange = 'transform';
    item.style.transition = '';
    updateDragTransform();

    try { (handle as HTMLElement).setPointerCapture(e.pointerId); } catch {}

    scrollRaf = requestAnimationFrame(autoScrollTick);
  }

  function onPointerMove(e: PointerEvent) {
    if (!dragging || e.pointerId !== pointerId) return;
    cursorX = e.clientX;
    cursorY = e.clientY;
    updateDragTransform();
    checkLiveReorder();
  }

  function onPointerUp(e: PointerEvent) {
    if (!dragging || e.pointerId !== pointerId) return;
    const item = dragging;
    if (scrollRaf !== null) { cancelAnimationFrame(scrollRaf); scrollRaf = null; }

    item.style.transition = `transform ${springMs}ms ${SPRING_EASE}`;
    requestAnimationFrame(() => {
      item.style.transform = 'translate3d(0, 0, 0)';
    });

    const cleanup = () => {
      item.style.transition = '';
      item.style.transform = '';
      item.style.willChange = '';
      item.classList.remove('reorder-dragging');
      item.removeEventListener('transitionend', cleanup);
    };
    item.addEventListener('transitionend', cleanup);
    setTimeout(cleanup, springMs + 100);

    document.body.classList.remove('reorder-active');
    dragging = null;
    pointerId = -1;
    options.onReorder?.(getKeys());
  }

  container.addEventListener('pointerdown', onPointerDown);
  document.addEventListener('pointermove', onPointerMove);
  document.addEventListener('pointerup', onPointerUp);
  document.addEventListener('pointercancel', onPointerUp);

  return {
    getKeys,
    destroy: () => {
      container.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('pointerup', onPointerUp);
      document.removeEventListener('pointercancel', onPointerUp);
    },
  };
}
