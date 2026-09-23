import { useState } from "react";
import { GameMenu } from "../../shared/ui/GameMenu";
import { GothicIcon } from "../../shared/ui/GothicIcon";
import "./combat-menu.css";
export function CombatMenu({
  busy,
  onHome,
  onMap,
  onCatalog,
  onRules,
  onJournal,
}: {
  busy: boolean;
  onHome: () => void;
  onMap: () => void;
  onCatalog: () => void;
  onRules: () => void;
  onJournal: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        className="gothic-button combat-menu-button"
        aria-label="Меню"
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
      >
        <GothicIcon icon="menu" />
      </button>
      {open && (
        <GameMenu
          busy={busy}
          onClose={() => setOpen(false)}
          onHome={onHome}
          onMap={onMap}
          onCatalog={onCatalog}
          onRules={onRules}
          onJournal={onJournal}
        />
      )}
    </>
  );
}
