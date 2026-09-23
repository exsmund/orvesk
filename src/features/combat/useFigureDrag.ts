import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";

/** Pointer events unify mouse and touch; horizontal swipes in the tray scroll it. */
export function useFigureDrag({
  onStart,
  onHover,
  onDrop,
}: {
  onStart: (id: string) => void;
  onHover: (cell: number | null) => void;
  onDrop: (cell: number) => void;
}) {
  const [ghost, setGhost] = useState<{
    id: string;
    x: number;
    y: number;
  } | null>(null);
  const active = useRef<{
    id: string;
    pointer: number;
    x: number;
    y: number;
    mode: "pending" | "drag" | "scroll";
    tray: HTMLElement | null;
    scroll: number;
  } | null>(null);
  const suppress = useRef(false);
  const handlers = useRef({ onStart, onHover, onDrop });
  useEffect(() => {
    handlers.current = { onStart, onHover, onDrop };
  }, [onStart, onHover, onDrop]);
  function cellAt(x: number, y: number) {
    const el = document
      .elementFromPoint(x, y)
      ?.closest<HTMLElement>("[data-board-cell]");
    return el ? Number(el.dataset.boardCell) : null;
  }
  useEffect(() => {
    function cancel() {
      suppress.current = false;
      active.current = null;
      setGhost(null);
      handlers.current.onHover(null);
    }
    window.addEventListener("blur", cancel);
    return () => window.removeEventListener("blur", cancel);
  }, []);
  return {
    ghost,
    consumeClick() {
      if (!suppress.current) return false;
      suppress.current = false;
      return true;
    },
    start(e: ReactPointerEvent<HTMLElement>, id: string) {
      if (e.button !== 0 || active.current) return;
      suppress.current = false;
      const tray =
        e.pointerType === "touch"
          ? e.currentTarget.closest<HTMLElement>(".figure-palette")
          : null;
      active.current = {
        id,
        pointer: e.pointerId,
        x: e.clientX,
        y: e.clientY,
        mode: "pending",
        tray,
        scroll: tray?.scrollLeft ?? 0,
      };
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    move(e: ReactPointerEvent<HTMLElement>) {
      const a = active.current;
      if (!a || a.pointer !== e.pointerId) return;
      const dx = e.clientX - a.x,
        dy = e.clientY - a.y;
      if (a.mode === "pending") {
        if (Math.hypot(dx, dy) < 8) return;
        a.mode =
          a.tray && Math.abs(dx) > Math.abs(dy) * 1.3 ? "scroll" : "drag";
        suppress.current = true;
        if (a.mode === "drag") handlers.current.onStart(a.id);
      }
      if (a.mode === "scroll") {
        a.tray!.scrollLeft = a.scroll - dx;
        return;
      }
      setGhost({ id: a.id, x: e.clientX, y: e.clientY });
      handlers.current.onHover(cellAt(e.clientX, e.clientY));
      const panel = e.currentTarget.closest<HTMLElement>(".reaction-board");
      if (panel) {
        const r = panel.getBoundingClientRect();
        if (e.clientY < r.top + 60) panel.scrollTop -= 18;
        else if (e.clientY > r.bottom - 60) panel.scrollTop += 18;
      }
    },
    end(e: ReactPointerEvent<HTMLElement>) {
      const a = active.current;
      if (!a || a.pointer !== e.pointerId) return;
      active.current = null;
      setGhost(null);
      handlers.current.onHover(null);
      if (a.mode === "drag") {
        const cell = cellAt(e.clientX, e.clientY);
        if (cell !== null) handlers.current.onDrop(cell);
      }
      if (e.currentTarget.hasPointerCapture(e.pointerId))
        e.currentTarget.releasePointerCapture(e.pointerId);
    },
    cancel() {
      suppress.current = false;
      active.current = null;
      setGhost(null);
      handlers.current.onHover(null);
    },
  };
}
