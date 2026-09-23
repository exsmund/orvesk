import { CharacterPortrait } from "../../shared/ui/CharacterPortrait";
import { STYLES } from "../../game/combat/tactics";
import "../../shared/ui/modal-sizes.css";
import { Modal } from "../../shared/ui/Modal";
import { ModalFooter } from "../../shared/ui/ModalFooter";
import { GothicTextButton } from "../../shared/ui/GothicTextButton";

import { useEffect, useRef, useState } from "react";
import {
  portrait,
  encounterPortrait,
  encounterIdentity,
} from "../../game/characters/portraits";
import { journeyEnemyLevel } from "../../game/progression/souls";
import { JourneyNodeIcon } from "./JourneyNodeIcon";
import {
  journeyMapPreset,
  journeyMapLayout,
  availableJourneyNodes,
  currentJourneyNode,
  journeyPath,
  journeyNode,
} from "../../game/journey/journey-map";
import type { JourneyNode } from "../../game/journey/journey-map";
import type { PublicGame } from "../../game/types";
import "./journey-map.css";

const nodeImage = (node: JourneyNode) =>
  `/ui/journey/${node.kind === "fight" ? (node.stage === 5 ? "champion" : "battle") : node.kind}-v1.png`;
function NodeDialog({
  node,
  enemyLevel,
  enemyPortrait,
  enemyName,
  enemyType,
  actionLabel,
  status,
  canVisit,
  busy,
  onClose,
  onConfirm,
}: {
  node: JourneyNode;
  enemyLevel?: number;
  enemyPortrait?: string;
  enemyName?: string;
  enemyType?: string;
  actionLabel?: string;
  status: string;
  canVisit: boolean;
  busy: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const description =
    node.kind === "camp"
      ? "Отдых у костра полностью восстановит здоровье и стойку. После отдыха можно продолжить путь к следующему противнику."
      : node.kind === "forge"
        ? "Здесь можно заменить один предмет предложенным: прежняя вещь будет потеряна. Замену можно пропустить."
        : null;
  return (
    <Modal
      title={node.name}
      titleId="journey-node-title"
      close={onClose}
      className="journey-node-dialog"
      size="small"
      portal
    >
      <div className="journey-node-details">
        <>
          {node.kind === "fight" ? (
            <div className="encounter-identity">
              <CharacterPortrait
                className="portrait-frame encounter-portrait"
                src={enemyPortrait!}
                alt="Портрет противника"
              />
              <div className="encounter-info">
                <h3>{enemyName}</h3>
                <p className="journey-node-level">Уровень {enemyLevel}</p>
                <p className="encounter-type">{enemyType}</p>
              </div>
            </div>
          ) : (
            <>
              <img src={nodeImage(node)} alt="" />
              <span className="eyebrow">{status}</span>
            </>
          )}
          {description && <p>{description}</p>}
        </>
        {!canVisit && (
          <p className="muted">
            {status === "Вы здесь"
              ? "Вы уже находитесь в этой точке."
              : status === "Пройдено"
                ? "Эта точка уже пройдена. Вернуться назад нельзя."
                : "Сейчас сюда перейти нельзя. Сначала завершите текущую встречу и следуйте по доступным связям карты."}
          </p>
        )}
      </div>
      <ModalFooter>
        <GothicTextButton
          type="button"
          className="secondary"
          onClick={onClose}
          autoFocus
        >
          Отмена
        </GothicTextButton>
        {canVisit && (
          <GothicTextButton
            type="button"
            className="primary"
            disabled={busy}
            onClick={onConfirm}
          >
            {actionLabel ?? (node.kind === "fight" ? "Начать бой" : "Перейти")}
          </GothicTextButton>
        )}
      </ModalFooter>
    </Modal>
  );
}

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
  const typeName = identity?.archetype
    ? (
        {
          warden: "Страж",
          duelist: "Дуэлянт",
          crusher: "Крушитель",
          ghost: "Призрак",
        } as const
      )[identity.archetype]
    : STYLES[
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
              status = claimReward
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
                  if (!open) return;
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
      {chosen && (
        <NodeDialog
          node={chosen}
          enemyName={identity?.name}
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
              ? journeyEnemyLevel(j.startLevel, chosen.stage)
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
