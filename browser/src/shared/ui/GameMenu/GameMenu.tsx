import { Modal } from "@/shared/ui/Modal/Modal";

import { GameMenuOptions } from "@/shared/ui/GameMenuOptions/GameMenuOptions";
import { GameMenuProps } from "@/shared/ui/GameMenu/model";
export function GameMenu(props: GameMenuProps) {
  return (
    <Modal
      title="Меню"
      close={props.onClose}
      size="small"
      className="game-menu"
    >
      <GameMenuOptions {...props} />
    </Modal>
  );
}
