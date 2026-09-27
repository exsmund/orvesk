import { useLayoutEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import "@/shared/ui/Popup/Popup.css";

export function Popup({
  anchor,
  children,
  onClose,
}: {
  anchor: HTMLElement;
  children: ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const popup = ref.current!;
    const position = () => {
      const rect = anchor.getBoundingClientRect();
      const header = document
        .querySelector(".battle-header")
        ?.getBoundingClientRect();
      const top = Math.max(8, header?.bottom ?? 0) + 8;
      popup.style.maxHeight = `${Math.max(80, window.innerHeight - top - 8)}px`;
      popup.style.left = `${Math.max(8, Math.min(window.innerWidth - popup.offsetWidth - 8, rect.left + rect.width / 2 - popup.offsetWidth / 2))}px`;
      popup.style.top = `${Math.max(top, Math.min(rect.top - popup.offsetHeight - 8, window.innerHeight - popup.offsetHeight - 8))}px`;
    };
    position();
    const observer = new ResizeObserver(position);
    observer.observe(popup);
    observer.observe(anchor);
    window.addEventListener("resize", position);
    window.addEventListener("scroll", position, true);
    const outside = (event: PointerEvent) => {
      if (
        !popup.contains(event.target as Node) &&
        !anchor.contains(event.target as Node)
      )
        onClose();
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", position);
      window.removeEventListener("scroll", position, true);
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [anchor, onClose]);
  return createPortal(
    <div
      ref={ref}
      className="popup"
      role="button"
      tabIndex={0}
      aria-label="Попап. Нажмите, чтобы закрыть"
      onClick={onClose}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onClose();
        }
      }}
    >
      {children}
    </div>,
    document.body,
  );
}
