import { ResourceBar } from "../../shared/ui/ResourceBar";
import { CharacterPortrait } from "../../shared/ui/CharacterPortrait";
import { GameMenu } from "../../shared/ui/GameMenu";
import { portrait } from "../../game/characters/portraits";
import { maxHp } from "../../game/combat/engine";
import { maxPoise, poise } from "../../game/combat/tactics";
import "../../shared/ui/modal-sizes.css";
import { Modal } from "../../shared/ui/Modal";
import { ModalFooter } from "../../shared/ui/ModalFooter";
import { GothicTextButton } from "../../shared/ui/GothicTextButton";
import { GothicIcon } from "../../shared/ui/GothicIcon";
import { useState } from "react";
import {
  Grid2X2,
  Infinity as InfinityIcon,
  Hourglass,
  Hammer,
  Trophy,
} from "lucide-react";
import { JourneyMap } from "./JourneyMap";
import { BattleModeInfo, JourneyStop } from "./AdventureUI";
import { SoulBalance } from "../characters/SoulBalance";
import "../characters/souls.css";
import { BATTLE_MODES, battleMode } from "../../game/combat/battle-modes";
import {
  currentJourneyNode,
  journeyNode,
} from "../../game/journey/journey-map";
import type { PublicGame } from "../../game/types";
import "./journey-screen.css";

function MapWindow({
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
export function JourneyScreen({
  game,
  busy,
  onNext,
  onInspect,
  onHome,
  onHero,
  onCatalog,
  onRules,
  onReward,
}: {
  game: PublicGame;
  busy: boolean;
  onNext: (payload: object) => void;
  onInspect: (id: string) => void;
  onHome: () => void;
  onHero: () => void;
  onCatalog: () => void;
  onRules: () => void;
  onReward?: () => void;
}) {
  const j = game.journey!,
    current = currentJourneyNode(j),
    node = journeyNode(current, j),
    mode = battleMode(j),
    ModeIcon =
      mode === "limited" ? Grid2X2 : mode === "free" ? InfinityIcon : Hourglass;
  const forge = node?.kind === "forge" && !j.forgeResolved;
  const [window, setWindow] = useState<"menu" | "mode" | "stop" | null>(
    forge ? "stop" : null,
  );
  const [previous, setPrevious] = useState({ current, forge });
  if (previous.current !== current || previous.forge !== forge) {
    setPrevious({ current, forge });
    setWindow(forge ? "stop" : null);
  }
  return (
    <main className="journey-screen" aria-label="Путешествие">
      <h1 className="sr-only">Путешествие {j.expedition}. Путь к чемпиону</h1>
      <nav className="journey-controls" aria-label="Управление картой">
        <button
          type="button"
          className="gothic-button map-menu-button"
          aria-label="Меню"
          title="Меню"
          aria-haspopup="dialog"
          onClick={() => setWindow("menu")}
        >
          <GothicIcon icon="menu" />
        </button>
        <CharacterPortrait
          className="portrait-frame map-player-portrait"
          onClick={onHero}
          label={`Ваш персонаж: ${game.player.name}`}
          title={game.player.name}
          src={portrait(game.player.portraitId).src}
        />
        <div className="map-player-resources">
          <ResourceBar
            kind="health"
            value={game.player.hp}
            max={maxHp(game.player)}
            compact
          />
          <ResourceBar
            kind="poise"
            value={poise(game.player)}
            max={maxPoise(game.player)}
            compact
          />
        </div>
        <button
          type="button"
          className="map-soul-balance"
          onClick={onHero}
          aria-label={`Души: ${game.souls}. Открыть персонажа`}
        >
          <SoulBalance amount={game.souls} />
        </button>
        <button
          type="button"
          className="map-round-button"
          aria-label={`Режим путешествия: ${BATTLE_MODES[mode].name}`}
          title={`Режим: ${BATTLE_MODES[mode].name}`}
          aria-haspopup="dialog"
          onClick={() => setWindow("mode")}
        >
          <ModeIcon />
        </button>
      </nav>
      <div className="journey-map-surface">
        <JourneyMap
          game={game}
          busy={busy}
          fullScreen
          onVisit={(id) => onNext({ nodeId: id, fromNode: current })}
        />
      </div>
      {forge && (
        <button
          type="button"
          className="map-stop-prompt"
          onClick={() => setWindow("stop")}
        >
          <Hammer size={18} />
          Завершить выбор в кузнице
        </button>
      )}
      {game.phase === "victory" && onReward && (
        <button type="button" className="map-stop-prompt" onClick={onReward}>
          <Trophy size={18} />
          Выбрать награду
        </button>
      )}
      {j.finished && game.phase === "ready" && (
        <div className="map-finish">
          <h2>Путешествие завершено</h2>
          <p>Персонаж и снаряжение сохраняются.</p>
          <button
            className="primary"
            disabled={busy}
            onClick={() => onNext({})}
          >
            Новое путешествие
          </button>
        </div>
      )}
      {window === "menu" && (
        <GameMenu
          busy={busy}
          onClose={() => setWindow(null)}
          onHome={onHome}
          onCatalog={onCatalog}
          onRules={onRules}
        />
      )}
      {window === "mode" && (
        <MapWindow
          title={`Режим: ${BATTLE_MODES[mode].name}`}
          close={() => setWindow(null)}
        >
          <BattleModeInfo game={game} />
          <p className="map-mode-note">
            Этот режим действует до конца путешествия. В новом путешествии режим
            выбирается заново.
          </p>
        </MapWindow>
      )}
      {window === "stop" && (
        <MapWindow
          title={node?.name ?? "Остановка"}
          close={() => setWindow(null)}
        >
          <JourneyStop
            key={current}
            game={game}
            busy={busy}
            onNext={onNext}
            onInspect={onInspect}
          />
          <ModalFooter>
            <GothicTextButton
              type="button"
              className="secondary"
              onClick={() => setWindow(null)}
            >
              К карте
            </GothicTextButton>
          </ModalFooter>
        </MapWindow>
      )}
    </main>
  );
}
