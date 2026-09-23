import { useEffect, useRef } from "react";
import "./modal-page-scroll.css";

// Native top-layer dialogs do not contribute to the document's scroll height.
// Reserve their height explicitly when the whole page must scroll.
const dialogs: HTMLDialogElement[] = [];
let savedScroll = 0;
function update() {
  const open = dialogs.filter((dialog) => dialog.open && dialog.isConnected);
  const active = open.at(-1);
  const enabled = !!active && matchMedia("(max-height:599px)").matches;
  const root = document.documentElement;
  if (enabled && !root.classList.contains("modal-page-scroll")) {
    savedScroll = window.scrollY;
    window.scrollTo(0, 0);
  }
  root.classList.toggle("modal-page-scroll", enabled);
  if (enabled)
    root.style.setProperty(
      "--modal-page-height",
      `${Math.ceil(active!.getBoundingClientRect().height) + 32}px`,
    );
  else {
    root.style.removeProperty("--modal-page-height");
    if (root.dataset.modalScrolling) {
      window.scrollTo(0, savedScroll);
    }
  }
  if (enabled) root.dataset.modalScrolling = "true";
  else delete root.dataset.modalScrolling;
}
export function useModalPageScroll() {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const dialog = ref.current?.closest("dialog");
    if (!dialog) return;
    dialogs.push(dialog);
    const resize = new ResizeObserver(update);
    resize.observe(dialog);
    const mutation = new MutationObserver(() => {
      if (dialog.open && matchMedia("(max-height:599px)").matches)
        window.scrollTo(0, 0);
      update();
    });
    mutation.observe(dialog, { attributes: true, attributeFilter: ["open"] });
    window.addEventListener("resize", update);
    update();
    return () => {
      resize.disconnect();
      mutation.disconnect();
      window.removeEventListener("resize", update);
      const index = dialogs.indexOf(dialog);
      if (index >= 0) dialogs.splice(index, 1);
      update();
    };
  }, []);
  return ref;
}
