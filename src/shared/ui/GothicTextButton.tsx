import { useLayoutEffect, useRef, type ButtonHTMLAttributes } from "react";
import "./gothic-text-controls.css";

/** Real text over nine-slice artwork; fit after resizing, label changes and font loading. */
export function GothicTextButton({
  children,
  className = "",
  title,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  const button = useRef<HTMLButtonElement>(null),
    label = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const element = button.current!,
      text = label.current!;
    let frame = 0,
      active = true;
    function fit() {
      if (!active || !element.clientWidth) return;
      const style = getComputedStyle(element);
      const width =
        element.clientWidth -
        parseFloat(style.paddingLeft) -
        parseFloat(style.paddingRight);
      const height =
        element.clientHeight -
        parseFloat(style.paddingTop) -
        parseFloat(style.paddingBottom);
      const base = parseFloat(style.fontSize);
      if (width <= 0 || height <= 0) return;
      text.style.whiteSpace = "nowrap";
      text.style.width = "max-content";
      text.style.fontSize = `${base}px`;
      const fits = () =>
        text.scrollWidth <= width &&
        text.getBoundingClientRect().height <= height;
      if (fits()) return;
      // Very long labels may use two lines before becoming unreadably small.
      const readable = Math.min(12, base);
      text.style.fontSize = `${readable}px`;
      const wrap = !fits();
      if (wrap) {
        text.style.whiteSpace = "normal";
        text.style.width = `${width}px`;
      }
      let low = 1,
        high = wrap ? readable : base;
      for (let i = 0; i < 12; i++) {
        const size = (low + high) / 2;
        text.style.fontSize = `${size}px`;
        if (fits()) low = size;
        else high = size;
      }
      text.style.fontSize = `${low}px`;
    }
    function schedule() {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(fit);
    }
    const observer = new ResizeObserver(schedule);
    observer.observe(element);
    document.fonts.addEventListener("loadingdone", schedule);
    void document.fonts.ready.then(() => {
      if (active) schedule();
    });
    fit();
    return () => {
      active = false;
      cancelAnimationFrame(frame);
      observer.disconnect();
      document.fonts.removeEventListener("loadingdone", schedule);
    };
  }, [children]);
  return (
    <button
      {...props}
      ref={button}
      className={`gothic-text-button ${className}`}
      title={title ?? (typeof children === "string" ? children : undefined)}
    >
      <span ref={label} className="gothic-text-label">
        {children}
      </span>
    </button>
  );
}
