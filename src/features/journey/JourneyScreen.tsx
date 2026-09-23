import { BattleHeader } from "../combat/BattleHeader";
import "../../shared/ui/modal-sizes.css";
import { Modal } from "../../shared/ui/Modal";
import { useState } from "react";
import { JourneyMap } from "./JourneyMap";
import { JourneyStop } from "./AdventureUI";
import "../characters/souls.css";
import { battleMode } from "../../game/combat/battle-modes";
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
  onHero,
  onReward,
}: {
  game: PublicGame;
  busy: boolean;
  onNext: (payload: object) => void;
  onInspect: (id: string) => void;
  onHome: () => void;
  onHero: () => void;
  onRules: () => void;
  onReward?: () => void;
}) {
  const j = game.journey!,
    current = currentJourneyNode(j),
    node = journeyNode(current, j),
    mode = battleMode(j);
  const forge = node?.kind === "forge" && !j.forgeResolved;
  const [window, setWindow] = useState<"stop" | null>(forge ? "stop" : null);
  const [previous, setPrevious] = useState({ current, forge });
  if (previous.current !== current || previous.forge !== forge) {
    setPrevious({ current, forge });
    setWindow(forge ? "stop" : null);
  }
  return (
    <main className="journey-screen" aria-label="Путешествие">
      <h1 className="sr-only">Путешествие {j.expedition}. Путь к боссу</h1>
      <BattleHeader
        screen="map"
        player={game.player}
        mode={mode}
        souls={game.souls}
        onPlayer={onHero}
      />
      <div className="journey-map-surface">
        <JourneyMap
          game={game}
          busy={busy}
          fullScreen
          onReward={onReward}
          onResumeForge={() => setWindow("stop")}
          onVisit={(id) => onNext({ nodeId: id, fromNode: current })}
        />
      </div>
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
        </MapWindow>
      )}
    </main>
  );
}
