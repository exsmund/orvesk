import { useEffect } from "react";
import "./keyboard-input-focus.css";

/** Text inputs match :focus-visible even after a click, so track navigation explicitly. */
export function useKeyboardInputFocus() {
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.inputFocus = "pointer";
    const pointer = () => {
      root.dataset.inputFocus = "pointer";
    };
    const keyboard = (event: KeyboardEvent) => {
      // Typing in a clicked text field must not bring the focus ring back.
      if (event.key === "Tab") root.dataset.inputFocus = "keyboard";
    };
    document.addEventListener("pointerdown", pointer, true);
    document.addEventListener("keydown", keyboard, true);
    return () => {
      document.removeEventListener("pointerdown", pointer, true);
      document.removeEventListener("keydown", keyboard, true);
      delete root.dataset.inputFocus;
    };
  }, []);
}
