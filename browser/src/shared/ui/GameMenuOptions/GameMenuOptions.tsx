import "@/shared/ui/GameMenuOptions/GameMenuOptions.css";
import { BookOpen, House, Map } from "lucide-react";
import { GothicTextButton } from "@/shared/ui/GothicTextButton/GothicTextButton";

import { GameMenuProps } from "@/shared/ui/GameMenu/model";
export function GameMenuOptions({
  busy,
  onClose,
  onHome,
  onRules,
  onMap,
}: GameMenuProps) {
  const choose = (action: () => void) => {
    onClose();
    action();
  };
  return (
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
      <GothicTextButton onClick={() => choose(onRules)}>
        <BookOpen />
        Правила
      </GothicTextButton>
    </nav>
  );
}
