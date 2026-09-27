import { Text } from "@/shared/ui/Text";
import "@/features/journey/JourneyScreen/JourneyScreen.css";
import { BattleHeader } from "@/features/combat/BattleHeader/BattleHeader";

import { useState } from "react";
import { JourneyMap } from "@/features/journey/JourneyMap/JourneyMap";
import { JourneyStop } from "@/features/journey/JourneyStop/JourneyStop";

import { battleMode } from "@/game/combat/battle-modes";
import { currentJourneyNode, journeyNode } from "@/game/journey/journey-map";
import type { PublicGame } from "@/game/types";

import { MapWindow } from "@/features/journey/JourneyScreen/MapWindow";
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
      <Text as="h1" className="sr-only">
        Путешествие {j.expedition}. Путь к боссу
      </Text>
      <BattleHeader
        screen="map"
        player={game.player}
        mode={mode}
        mapNumber={game.journey?.expedition ?? 1}
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
          <Text as="h2">Путешествие завершено</Text>
          <Text as="p">Персонаж и снаряжение сохраняются.</Text>
          <button
            className="primary"
            disabled={busy}
            onClick={() => onNext({})}
          >
            <Text>Новое путешествие</Text>
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
