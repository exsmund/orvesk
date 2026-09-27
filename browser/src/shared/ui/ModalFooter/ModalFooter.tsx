import { Text } from "@/shared/ui/Text";
import "@/shared/ui/ModalFooter/ModalFooter.css";
import type { ReactNode } from "react";

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
      <Text as="div" className="modal-footer-hint" aria-live="polite">
        {hint}
      </Text>
      {children && <div className="modal-footer-buttons">{children}</div>}
    </footer>
  );
}
