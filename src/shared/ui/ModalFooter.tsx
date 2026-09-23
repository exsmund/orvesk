import type { ReactNode } from "react";
import "./modal-footer.css";

export function ModalFooter({
  hint,
  children,
}: {
  hint?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <footer
      className={`modal-footer${children ? "" : " modal-footer-text-only"}`}
    >
      <div className="modal-footer-hint" aria-live="polite">
        {hint}
      </div>
      {children && <div className="modal-footer-buttons">{children}</div>}
    </footer>
  );
}
