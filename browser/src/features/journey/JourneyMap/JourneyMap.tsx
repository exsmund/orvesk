import { Notification } from "@/shared/ui/Notification";
import "@/features/journey/JourneyMap/JourneyMap.css";
import { creature } from "@/game/creatures/catalog";
import { STYLES } from "@/game/combat/tactics";

import { useEffect, useRef, useState } from "react";
import {
  encounterIdentity,
  encounterPortrait,
  portrait,
} from "@/game/characters/portraits";
import type { JourneyNode } from "@/game/journey/journey-map";
import {
  availableJourneyNodes,
  currentJourneyNode,
  journeyMapLayout,
  journeyMapPreset,
  journeyNode,
  journeyPath,
} from "@/game/journey/journey-map";
import { journeyEnemyLevel } from "@/game/progression/souls";
import type { PublicGame } from "@/game/types";
import { JourneyNodeIcon } from "@/features/journey/JourneyNodeIcon/JourneyNodeIcon";

import { NodeDialog } from "@/features/journey/JourneyMap/NodeDialog";
export function JourneyMap({
  game,
  busy = false,
  onVisit,
  fullScreen = false,
  onResumeForge,
  onReward,
}: {
  game: PublicGame;
  busy?: boolean;
  onVisit?: (id: string) => void;
  fullScreen?: boolean;
  onResumeForge?: () => void;
  onReward?: () => void;
}) {
  const [notice, setNotice] = useState<{ id: number; message: string } | null>(
    null,
  );
  const [selected, setSelected] = useState<string | null>(null);
  const confirming = useRef(false),
    graph = useRef<HTMLDivElement>(null);
  const location = game.journey ? currentJourneyNode(game.journey) : "";
  useEffect(() => {
    if (fullScreen)
      graph.current
        ?.querySelector('[aria-current="location"]')
        ?.scrollIntoView({ block: "center", inline: "nearest" });
  }, [fullScreen, location, game.journey?.mapPreset]);
  const j = game.journey;
  if (!j) return null;
  const preset = journeyMapPreset(j);
  const layout = journeyMapLayout(j);
  const current = currentJourneyNode(j),
    path = journeyPath(j),
    available = availableJourneyNodes(game),
    currentNode = journeyNode(current, j);
  const battleLabel =
    game.phase === "combat"
      ? "Продолжить бой"
      : game.phase === "defeat"
        ? "Посмотреть поражение"
        : game.phase === "draw"
          ? "Повторить бой"
          : undefined;
  const statusFor = (node: JourneyNode) =>
    available.includes(node.id)
      ? "Можно идти"
      : node.id === current
        ? "Вы здесь"
        : path.includes(node.id)
          ? "Пройдено"
          : available.includes(node.id)
            ? "Можно идти"
            : "Недоступно";
  const chosen = selected ? journeyNode(selected, j) : undefined;
  const storedEnemy = chosen ? j.enemies?.[chosen.id] : undefined;
  const identity =
    storedEnemy ??
    (chosen?.stage === j.stage && game.phase !== "defeat"
      ? game.enemy
      : chosen
        ? encounterIdentity(game.player, j.expedition, chosen.stage)
        : undefined);
  const typeName =
    STYLES[
      chosen?.stage === j.stage && game.phase !== "defeat"
        ? (game.enemy.style ?? "berserker")
        : "berserker"
    ].name;

  return (
    <div
      className={`journey-graph-wrap${fullScreen ? " journey-graph-wrap--fullscreen" : ""}`}
    >
      <img
        className="journey-map-art"
        src={preset.background}
        width={preset.width}
        height={preset.height}
        alt=""
        draggable={false}
      />
      <div className="journey-map-canvas">
        <div
          ref={graph}
          className="journey-graph"
          data-preset={preset.id}
          role="group"
          aria-label={`Карта путешествия: ${preset.name}`}
        >
          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            aria-hidden="true"
            className="journey-edges"
          >
            {layout.edges.map(([from, to]) => {
              const a = journeyNode(from, j)!,
                b = journeyNode(to, j)!,
                walked = path.some(
                  (id, i) => id === from && path[i + 1] === to,
                ),
                open = from === current && available.includes(to);
              return (
                <path
                  key={`${from}:${to}`}
                  d={`M ${a.x} ${a.y} L ${b.x} ${b.y}`}
                  fill="none"
                  className={
                    walked
                      ? "walked"
                      : open
                        ? "available"
                        : b.y >= (currentNode?.y ?? 100)
                          ? "expired"
                          : ""
                  }
                />
              );
            })}
          </svg>
          {layout.nodes.map((node) => {
            const here = node.id === current,
              visited = path.includes(node.id),
              resumeForge =
                here &&
                node.kind === "forge" &&
                !j.forgeResolved &&
                !!onResumeForge,
              claimReward =
                here &&
                node.kind === "fight" &&
                game.phase === "victory" &&
                !!onReward,
              open = available.includes(node.id) || resumeForge || claimReward,
              status =
                here && game.phase === "defeat"
                  ? "Посмотреть поражение"
                  : claimReward
                    ? "Выбрать награду"
                    : resumeForge
                      ? "Можно выбрать предмет"
                      : statusFor(node),
              past = !here && (visited || node.y >= (currentNode?.y ?? 100));
            return (
              <JourneyNodeIcon
                key={node.id}
                node={node}
                current={here}
                visited={visited}
                past={past}
                available={open}
                busy={busy}
                status={status}
                lostSouls={
                  j.lostSouls?.nodeId === node.id
                    ? j.lostSouls.amount
                    : undefined
                }
                label={here ? battleLabel : undefined}
                onClick={() => {
                  if (!open) {
                    setNotice((value) => ({
                      id: (value?.id ?? 0) + 1,
                      message:
                        visited || past
                          ? "Этот путь уже пройден. Вы не можете вернуться."
                          : "Сначала откройте предыдущие этапы пути.",
                    }));
                    return;
                  }
                  if (game.phase === "defeat" && here) {
                    onVisit?.(node.id);
                    return;
                  }
                  if (claimReward) {
                    onReward?.();
                    return;
                  }
                  if (resumeForge) {
                    onResumeForge?.();
                    return;
                  }
                  confirming.current = false;
                  setSelected(node.id);
                }}
              />
            );
          })}
        </div>
      </div>
      {notice && (
        <Notification
          key={notice.id}
          message={notice.message}
          onClose={() => setNotice(null)}
        />
      )}
      {chosen && (
        <NodeDialog
          node={chosen}
          enemyName={identity?.name}
          enemyDescription={creature(storedEnemy?.creatureId)?.description}
          enemyType={typeName}
          actionLabel={chosen.id === current ? battleLabel : undefined}
          enemyPortrait={
            storedEnemy
              ? portrait(storedEnemy.portraitId).src
              : chosen.stage === j.stage && game.phase !== "defeat"
                ? portrait(game.enemy.portraitId).src
                : encounterPortrait(game.player, j.expedition, chosen.stage).src
          }
          enemyLevel={
            chosen.kind === "fight"
              ? journeyEnemyLevel(j.startLevel, chosen.stage, j.expedition)
              : undefined
          }
          status={statusFor(chosen)}
          busy={busy}
          canVisit={!!onVisit && available.includes(chosen.id)}
          onClose={() => setSelected(null)}
          onConfirm={() => {
            if (
              busy ||
              confirming.current ||
              !onVisit ||
              !available.includes(chosen.id)
            )
              return;
            confirming.current = true;
            setSelected(null);
            onVisit(chosen.id);
          }}
        />
      )}
    </div>
  );
}
