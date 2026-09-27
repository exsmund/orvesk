import "@/features/combat/CombatMenu/CombatMenu.css";
import { useState } from "react";
import { GameMenu } from "@/shared/ui/GameMenu/GameMenu";
import { GothicIcon } from "@/shared/ui/GothicIcon/GothicIcon";

export function CombatMenu({
  busy,
  onHome,
  onMap,
  onRules,
}: {
  busy: boolean;
  onHome: () => void;
  onMap: () => void;
  onRules: () => void;
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
          onRules={onRules}
        />
      )}
    </>
  );
}
