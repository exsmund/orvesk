import "@/features/journey/JourneyScreen/MapWindow.css";

import { Modal } from "@/shared/ui/Modal/Modal";

export function MapWindow({
  title,
  close,
  children,
}: {
  title: string;
  close: () => void;
  children: React.ReactNode;
}) {
  return (
    <Modal
      title={title}
      close={close}
      className="journey-window"
      size="small"
      portal
    >
      {children}
    </Modal>
  );
}
