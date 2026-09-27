import "@/features/rewards/VictoryRewardDialog/RewardWindow.css";

import { type ReactNode } from "react";
import { Modal } from "@/shared/ui/Modal/Modal";
import { ModalFooter } from "@/shared/ui/ModalFooter/ModalFooter";

export function RewardWindow({
  title,
  cancel,
  footer,
  hint,
  children,
}: {
  title: string;
  cancel?: () => void;
  footer?: ReactNode;
  hint?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Modal
      title={title}
      close={cancel}
      showClose={false}
      closeOnBackdrop={false}
      portal
      className="reward-window"
      size="large"
    >
      <div className="reward-window-scroll">{children}</div>
      <ModalFooter hint={hint}>{footer}</ModalFooter>
    </Modal>
  );
}
