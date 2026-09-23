import { BookOpen, House, Map, ScrollText, Sword } from "lucide-react";
import { Modal } from "./Modal";
import { GothicTextButton } from "./GothicTextButton";
import "./game-menu.css";
interface GameMenuProps {
  busy: boolean;
  onClose: () => void;
  onHome: () => void;
  onCatalog: () => void;
  onRules: () => void;
  onMap?: () => void;
  onJournal?: () => void;
}
export function GameMenu({
  busy,
  onClose,
  onHome,
  onCatalog,
  onRules,
  onMap,
  onJournal,
}: GameMenuProps) {
  const choose = (action: () => void) => {
    onClose();
    action();
  };
  return (
    <Modal title="Меню" close={onClose} size="small" className="game-menu">
      <nav className="game-menu-options" aria-label="Меню игры">
        <GothicTextButton disabled={busy} onClick={() => choose(onHome)}>
          <House />
          На главный экран
        </GothicTextButton>
        {onMap && (
          <GothicTextButton onClick={() => choose(onMap)}>
            <Map />
            Карта путешествия
          </GothicTextButton>
        )}
        {onJournal && (
          <GothicTextButton onClick={() => choose(onJournal)}>
            <ScrollText />
            Хроника поединка
          </GothicTextButton>
        )}
        <GothicTextButton onClick={() => choose(onCatalog)}>
          <Sword />
          Арсенал
        </GothicTextButton>
        <GothicTextButton onClick={() => choose(onRules)}>
          <BookOpen />
          Правила
        </GothicTextButton>
      </nav>
    </Modal>
  );
}
