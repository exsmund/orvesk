import { useLayoutEffect, useRef } from "react";

/** Only wrap the tray when the complete battle panel still fits its viewport. */
export function useFittingFigureRows(contents: string) {
  const trayRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const tray = trayRef.current;
    const panel = tray?.closest<HTMLElement>(".combat-app .reaction-board");
    if (!tray || !panel) return;
    let frame = 0;
    const measure = () => {
      tray.dataset.wrap = "false";
      if (window.innerWidth < 600) return;
      tray.dataset.wrap = "true";
      // Measure the real layout, including captions, messages and the footer.
      // Reset before every measurement so a previous wrap cannot affect the decision.
      if (panel.scrollHeight > panel.clientHeight + 1) {
        tray.dataset.wrap = "false";
      }
    };
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    };
    const observer = new ResizeObserver(schedule);
    observer.observe(panel);
    observer.observe(tray);
    for (const element of panel.querySelectorAll(
      ".board-column, .planning-footer, .planning-message",
    ))
      observer.observe(element);
    window.addEventListener("resize", schedule);
    void document.fonts.ready.then(schedule);
    measure();
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", schedule);
      cancelAnimationFrame(frame);
    };
  }, [contents]);
  return trayRef;
}
