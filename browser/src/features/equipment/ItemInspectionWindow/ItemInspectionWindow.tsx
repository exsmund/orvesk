import "@/features/equipment/ItemInspectionWindow/ItemInspectionWindow.css";
import type { ComponentProps } from "react";
import { GothicIcon } from "@/shared/ui/GothicIcon/GothicIcon";
import { Modal } from "@/shared/ui/Modal/Modal";
import { ItemInspection } from "@/features/equipment/ItemInspection/ItemInspection";

/** Equipment cards provide their own frames; no general modal shell or header. */
export function ItemInspectionWindow({
  close,
  ...props
}: ComponentProps<typeof ItemInspection> & { close: () => void }) {
  return (
    <Modal
      variant="bare"
      portal
      title={props.equipment.name}
      close={close}
      className={`item-inspection-window${props.own ? " own-item-window" : ""}`}
    >
      <div className="item-window-toolbar">
        <button
          type="button"
          className="gothic-button"
          onClick={close}
          aria-label="Закрыть"
          autoFocus
        >
          <GothicIcon icon="close" />
        </button>
      </div>
      <ItemInspection {...props} />
    </Modal>
  );
}
