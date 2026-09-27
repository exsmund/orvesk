import "@/shared/ui/Modal/Modal.css";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { ModalHeader } from "@/shared/ui/Modal/ModalHeader";
import { ModalProps } from "@/shared/ui/Modal/model";
/** All native dialog lifecycle and dismissal rules live here. */
export function Modal({
  title,
  children,
  close,
  className = "",
  size = "medium",
  onBack,
  disabled = false,
  closeLabel,
  backLabel,
  titleId,
  showClose = true,
  closeOnBackdrop = true,
  portal = false,
  variant = "standard",
}: ModalProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);
  const dismiss = () => {
    if (!disabled) close?.();
  };
  const content = (
    <dialog
      ref={dialog}
      {...{ closedby: "none" }}
      className={`${variant === "standard" ? "modal " : ""}${className}`}
      data-size={variant === "standard" ? size : undefined}
      aria-label={titleId ? undefined : title}
      aria-labelledby={titleId}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.preventDefault();
          e.stopPropagation();
          dismiss();
        }
      }}
      onCancel={(e) => {
        e.preventDefault();
        e.stopPropagation();
        dismiss();
      }}
      onClick={(e) => {
        if (closeOnBackdrop && e.target === e.currentTarget) dismiss();
      }}
    >
      {variant === "standard" && (
        <ModalHeader
          title={title}
          titleId={titleId}
          onClose={showClose && close ? dismiss : undefined}
          onBack={onBack}
          disabled={disabled}
          closeLabel={closeLabel}
          backLabel={backLabel}
        />
      )}
      {children}
    </dialog>
  );
  return portal ? createPortal(content, document.body) : content;
}
