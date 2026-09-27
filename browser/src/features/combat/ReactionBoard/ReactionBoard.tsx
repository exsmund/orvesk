import { placementCost, layer } from "@/game/combat/clash-damage";
import { Notification } from "@/shared/ui/Notification";
import { CellPopup } from "@/features/combat/CellPopup";
import { CellDamage } from "@/features/combat/CellDamage";
import { describeCellDamage } from "@/features/combat/CellDamage/model";
import { charmManeuvers } from "@/game/combat/figure-config";
import { Text } from "@/shared/ui/Text";
import "@/features/combat/ReactionBoard/ReactionBoard.css";
import { BattleWorkspace } from "@/features/combat/BattleWorkspace/BattleWorkspace";
import type { CombatResourcePreview } from "@/features/combat/resource-preview";

import { createPortal } from "react-dom";
import { GothicTextButton } from "@/shared/ui/GothicTextButton/GothicTextButton";
import { Modal } from "@/shared/ui/Modal/Modal";
import { ModalFooter } from "@/shared/ui/ModalFooter/ModalFooter";
import { useFigureDrag } from "@/features/combat/useFigureDrag";

import { ArrowRight, Heart, Zap } from "lucide-react";
import { useEffect, useState, type CSSProperties } from "react";
import { formatDamage } from "@/game/combat/battle-feedback";
import { battleMode as journeyBattleMode } from "@/game/combat/battle-modes";
import { canPlace, placementCells } from "@/game/combat/board";
import {
  preparationDamage,
  previewClashDamage,
} from "@/game/combat/clash-damage";
import { isStrike, reactionManeuvers } from "@/game/combat/reaction-rules";
import type {
  BoardModifiers,
  Maneuver,
  Placement,
  PublicGame,
} from "@/game/types";
import { ActionFigure } from "@/features/combat/ActionFigure/ActionFigure";
import { ActionPalette } from "@/features/combat/ActionPalette/ActionPalette";
import { RockTerrain } from "@/features/combat/RockTerrain/RockTerrain";

import { LayerIcon } from "@/features/combat/ReactionBoard/LayerIcon";
export function ReactionBoard({
  game,
  busy,
  session,
  onSubmit,
  onFinish,
  forecastKey = "",
  onForecast,
  onCharm,
  onExchange,
}: {
  game: PublicGame;
  busy: boolean;
  session: string;
  onSubmit: (payload: object) => Promise<void>;
  onFinish?: () => void;
  onExchange?: (cardId: string) => Promise<void>;
  onCharm?: (
    charm: "ring" | "amulet",
    target: number | string,
  ) => Promise<boolean>;
  forecastKey?: string;
  onForecast?: (preview: CombatResourcePreview | null) => void;
}) {
  const mode = journeyBattleMode(game.journey),
    canPass = true;
  const plan = game.clash!,
    combatTokens = reactionManeuvers(game.player),
    charmTokens: Maneuver[] = onCharm ? charmManeuvers(game.player) : [],
    tokens = [...combatTokens, ...charmTokens],
    enemyTokens = reactionManeuvers(game.enemy),
    key = `duelyant.clash5.${session}.${game.fight}.${game.round}`;
  const [initial] = useState(() => {
    if (plan.stage === "reveal")
      return { placed: plan.playerPlaced, mod: plan.playerModifiers };
    try {
      const draft = JSON.parse(sessionStorage.getItem(key) ?? "null");
      if (draft && Array.isArray(draft.placed)) {
        draft.mod = plan.committedPlayerModifiers ?? {};
        const blocked = plan.blocked.filter(
          (n) => n !== plan.enemyModifiers?.unlocked,
        );
        const used: number[] = [];
        let okay = draft.placed.length <= 9;
        const ids = new Set();
        for (const p of draft.placed) {
          const m = tokens.find((m) => m.id === p.id);
          if (
            !m ||
            ids.has(p.id) ||
            !canPlace(m, p, blocked, used, draft.mod ?? {})
          ) {
            okay = false;
            break;
          }
          used.push(...placementCells(m, p, draft.mod ?? {}));
          ids.add(p.id);
        }
        if (okay)
          return {
            placed: draft.placed as Placement[],
            mod: (draft.mod ?? {}) as BoardModifiers,
          };
      }
    } catch {
      /* Ignore malformed local drafts. */
    }
    return {
      placed: [] as Placement[],
      mod: plan.committedPlayerModifiers ?? ({} as BoardModifiers),
    };
  });
  const [draftPlaced, setPlaced] = useState<Placement[]>(initial.placed),
    [draftMod, setMod] = useState<BoardModifiers>(initial.mod),
    [selection, setSelected] = useState(tokens[0]?.id ?? ""),
    [rotation, setRotation] = useState(0),
    [cellSize, setCellSize] = useState(36),
    [hover, setHover] = useState<number | null>(null),
    [notice, setNotice] = useState<{ id: number; message: string } | null>(
      null,
    );
  const placed = draftPlaced.filter((p) =>
    combatTokens.some((m) => m.id === p.id),
  );
  const selected = tokens.some((m) => m.id === selection)
    ? selection
    : (tokens[0]?.id ?? "");
  const mod = { ...draftMod, ...plan.committedPlayerModifiers };
  const [cellAnchor, setCellAnchor] = useState<HTMLElement | null>(null);
  const [compressOpen, setCompressOpen] = useState(false);
  const [charmPending, setCharmPending] = useState(false);
  const [finishConfirm, setFinishConfirm] = useState(false);
  const [rotations, setRotations] = useState<Record<string, number>>({}),
    [cellInfo, setCellInfo] = useState<number | null>(null);
  const enemy = plan.enemyPlaced ?? [],
    enemyMod = plan.enemyModifiers ?? {},
    blocked = plan.blocked.filter((n) => n !== enemyMod.unlocked),
    selectedToken = tokens.find((m) => m.id === selected) ?? tokens[0];
  const drag = useFigureDrag({
    onStart: (id) => {
      setCellInfo(null);
      setSelected(id);
      const existing = placed.find((p) => p.id === id);
      setRotation(existing?.rotation ?? rotations[id] ?? 0);

      setNotice(null);
    },
    onHover: setHover,
    onDrop: (n) => place(n),
    onDropOutside: (id) => {
      if (!busy && !charmPending && placed.some((p) => p.id === id))
        change(placed.filter((p) => p.id !== id));
    },
  });
  const moving = drag.ghost?.id;
  const fixedPlaced = moving ? placed.filter((p) => p.id !== moving) : placed;
  const occupied = fixedPlaced.flatMap((p) =>
    placementCells(
      tokens.find((m) => m.id === p.id)!,
      p,
      mod,
    ),
  );
  const candidate =
    hover === null || !selectedToken
      ? null
      : { id: selected, x: hover % 3, y: Math.floor(hover / 3), rotation };
  const preview = candidate
      ? placementCells(selectedToken, candidate, mod)
      : [],
    validPreview =
      !busy &&
      plan.stage !== "reveal" &&
      !!selectedToken &&
      !selected.startsWith("charm-") &&
      placed.length < 9 &&
      !!candidate &&
      canPlace(selectedToken, candidate, blocked, occupied, mod) &&
      (!placed.some((p) => p.id === selected) || moving === selected);
  const previewPlaced =
      validPreview && candidate ? [...fixedPlaced, candidate] : placed,
    forecast = previewClashDamage(game, previewPlaced, mod);
  const cost = placementCost(
    game.player,
    previewPlaced,
    mod,
    plan.enemyPlaced ? layer(game.enemy, enemy, enemyMod) : undefined,
  );
  const actualCost = placementCost(
    game.player,
    placed,
    mod,
    plan.enemyPlaced ? layer(game.enemy, enemy, enemyMod) : undefined,
  );
  const playerHealth = -(forecast?.sides.player.damage ?? 0);
  const playerStamina = -(forecast?.sides.player.staminaLoss ?? 0);
  const enemyHealth = -(forecast?.sides.enemy.damage ?? 0);
  const enemyStamina = -(forecast?.sides.enemy.staminaLoss ?? 0);
  const enemyAvailable = forecast?.sides.enemy.available;
  useEffect(() => {
    onForecast?.({
      key: forecastKey,
      player: {
        health: playerHealth,
        stamina: playerStamina,
        available: cost.remaining,
      },
      enemy: {
        health: enemyHealth,
        stamina: enemyStamina,
        available: enemyAvailable,
      },
    });
  }, [
    forecastKey,
    onForecast,
    playerHealth,
    playerStamina,
    enemyHealth,
    enemyStamina,
    cost.remaining,
    enemyAvailable,
  ]);
  const potential = forecast
    ? null
    : preparationDamage(game.player, previewPlaced, mod);
  function notify(message: string) {
    setNotice((previous) => ({ id: (previous?.id ?? 0) + 1, message }));
  }
  function change(next: Placement[], mods = mod) {
    if (plan.stage === "reveal") return;
    setPlaced(next);
    setMod(mods);
    setNotice(null);
    sessionStorage.setItem(key, JSON.stringify({ placed: next, mod: mods }));
  }
  function place(n: number) {
    if (busy || plan.stage === "reveal" || !selectedToken) return;
    setHover(null);
    if (charmPending) return;
    if (selected === "charm-ring") {
      if (!blocked.includes(n) || mod.unlocked === n) {
        notify("Перетащите кольцо на скалу.");
        return;
      }
      void applyCharm("ring", n);
      return;
    }
    if (selected === "charm-amulet") {
      setCompressOpen(true);
      return;
    }
    const remaining = placed.filter((p) => p.id !== selected);
    const occupied = remaining.flatMap((p) =>
      placementCells(
        tokens.find((m) => m.id === p.id)!,
        p,
        mod,
      ),
    );
    const p: Placement = {
      id: selected,
      x: n % 3,
      y: Math.floor(n / 3),
      rotation,
    };
    if (!canPlace(selectedToken, p, blocked, occupied, mod)) {
      notify("Фигура не помещается: свой слой, скала или граница поля.");
      return;
    }
    change([...remaining, p]);
  }
  function clickCell(n: number, anchor: HTMLElement) {
    if (drag.consumeClick()) return;
    setHover(null);
    setCellAnchor(anchor);
    setCellInfo(n);
  }
  function rotateFigure(id: string) {
    if (drag.consumeClick()) return;
    const next = ((rotations[id] ?? 0) + 1) % 4;
    setRotations((r) => ({ ...r, [id]: next }));
    setSelected(id);
    setRotation(next);
    setNotice(null);
  }
  const ownInfo =
    cellInfo === null
      ? undefined
      : placed.find((p) =>
          placementCells(
            tokens.find((m) => m.id === p.id)!,
            p,
            mod,
          ).includes(cellInfo),
        );
  const enemyInfo =
    cellInfo === null
      ? undefined
      : enemy.find((p) =>
          placementCells(
            enemyTokens.find((m) => m.id === p.id)!,
            p,
            enemyMod,
          ).includes(cellInfo),
        );
  async function applyCharm(charm: "ring" | "amulet", target: number | string) {
    if (!onCharm || busy || charmPending) return;
    setCharmPending(true);
    try {
      if (await onCharm(charm, target)) {
        change(placed, {
          ...mod,
          ...(charm === "ring"
            ? { unlocked: target as number }
            : { compressed: target as string }),
        });
        setCompressOpen(false);
        setSelected(combatTokens[0]?.id ?? "");
      }
    } finally {
      setCharmPending(false);
    }
  }
  return (
    <section
      className="board-combat reaction-board"
      style={{ "--piece-cell": `${cellSize}px` } as CSSProperties}
      aria-label="Подготовка и реакция"
    >
      <BattleWorkspace
        hint={
          plan.stage === "reveal"
            ? "Ответ противника раскрыт. Подсчитайте результат."
            : cost.remaining < 0
              ? `Не хватает ${Math.abs(cost.remaining)} выносливости. Снимите фигуру перед подтверждением.`
              : `Выносливость после затрат: ${cost.remaining} / 8${plan.preparer === "player" ? ". Блоки зарезервированы по всем клеткам" : ""}`
        }
        below={
          <>
            <ActionPalette
              fighter={game.player}
              tokens={tokens}
              selected={selected}
              rotation={rotation}
              mod={mod}
              placed={placed}
              busy={busy || charmPending || plan.stage === "reveal"}
              onScale={setCellSize}
              rotations={rotations}
              onFigurePointerDown={drag.start}
              onFigurePointerMove={drag.move}
              onFigurePointerUp={drag.end}
              onFigurePointerCancel={drag.cancel}
              onSelect={rotateFigure}
            />
          </>
        }
      >
        <div
          className="action-board outcome-field terrain-board"
          role="group"
          aria-label="Общее поле 3 на 3"
        >
          <RockTerrain blocked={blocked} unlocked={[mod.unlocked]} />
          {Array.from({ length: 9 }, (_, n) => {
            const own = previewPlaced.find((p) =>
                placementCells(
                  tokens.find((m) => m.id === p.id)!,
                  p,
                  mod,
                ).includes(n),
              ),
              opposing = enemy.find((p) =>
                placementCells(
                  enemyTokens.find((m) => m.id === p.id)!,
                  p,
                  enemyMod,
                ).includes(n),
              );
            const a = own ? tokens.find((m) => m.id === own.id) : undefined,
              b = opposing
                ? enemyTokens.find((m) => m.id === opposing.id)
                : undefined,
              rock = blocked.includes(n) && mod.unlocked !== n,
              prediction = forecast?.cells[n];
            return (
              <button
                key={n}
                disabled={busy}
                className={`board-cell terrain-cell ${rock ? "rock" : "grass"} ${a ? "own-layer" : ""} ${b ? "enemy-layer" : ""} ${preview.includes(n) ? (validPreview ? "valid-preview" : "invalid-preview") : ""}`}
                data-board-cell={n}
                onClick={(event) => clickCell(n, event.currentTarget)}
                onPointerDown={(e) => {
                  const p = placed.find((p) =>
                    placementCells(
                      tokens.find((m) => m.id === p.id)!,
                      p,
                      mod,
                    ).includes(n),
                  );
                  if (p && !busy && plan.stage !== "reveal")
                    drag.start(e, p.id);
                }}
                onPointerMove={drag.move}
                onPointerUp={drag.end}
                onPointerCancel={drag.cancel}
                onDragStart={(e) => e.preventDefault()}
                aria-label={`Клетка ${Math.floor(n / 3) + 1}, ${(n % 3) + 1}: ${a ? "вы — " + a.name + "; " : ""}${b ? "противник — " + b.name + "; " : ""}${rock ? "скала" : "земля"}${prediction ? `; прогноз: ${describeCellDamage(prediction)}` : a && isStrike(a) && potential ? `; урон клетки до блока и брони: ${formatDamage(potential.potential[n])} здоровью, ${formatDamage(potential.stamina[n])} выносливости` : ""}`}
                title={
                  prediction
                    ? `Прогноз после противодействия и брони. ${describeCellDamage(prediction)}`
                    : undefined
                }
              >
                <LayerIcon m={a} side="player" />
                <LayerIcon m={b} side="enemy" />
                {rock && (
                  <Text as="small" className="rock-mark">
                    ×
                  </Text>
                )}
                {(a || b) && prediction ? (
                  <CellDamage damage={prediction} />
                ) : (
                  a &&
                  isStrike(a) &&
                  potential && (
                    <Text
                      as="span"
                      className="cell-attack-power"
                      title="Урон этой клетки до блока и брони"
                    >
                      <Text
                        as="b"
                        size="xs"
                        weight="semibold"
                        aria-label={`Урон здоровью: ${formatDamage(potential.potential[n])}`}
                      >
                        <Heart aria-hidden="true" />
                        {formatDamage(potential.potential[n])}
                      </Text>
                      <Text
                        as="b"
                        size="xs"
                        weight="semibold"
                        aria-label={`Урон выносливости: ${formatDamage(potential.stamina[n])}`}
                      >
                        <Zap aria-hidden="true" />
                        {formatDamage(potential.stamina[n])}
                      </Text>
                    </Text>
                  )
                )}
              </button>
            );
          })}
        </div>
      </BattleWorkspace>
      {mode === "expendable" && onFinish && plan.stage !== "reveal" && (
        <GothicTextButton
          disabled={busy}
          onClick={() => setFinishConfirm(true)}
        >
          Завершить действия
        </GothicTextButton>
      )}
      {compressOpen && (
        <Modal
          title="Сжать фигуру"
          close={() => {
            if (!charmPending) setCompressOpen(false);
          }}
          size="small"
        >
          <Text as="p">
            Выберите фигуру. После применения амулет будет израсходован,
            отменить сжатие нельзя.
          </Text>
          {combatTokens
            .filter((m) => m.shape.length > 1)
            .map((m) => (
              <GothicTextButton
                key={m.id}
                disabled={busy || charmPending}
                onClick={() => void applyCharm("amulet", m.id)}
              >
                {m.name}
              </GothicTextButton>
            ))}
          {!combatTokens.some((m) => m.shape.length > 1) && (
            <Text as="p">Нет доступных фигур для сжатия.</Text>
          )}
        </Modal>
      )}
      {finishConfirm && (
        <Modal
          title="Завершить действия?"
          close={() => setFinishConfirm(false)}
          size="small"
          className="battle-result-dialog"
        >
          <div className="battle-result-scroll">
            <Text as="p">
              Вы больше не сможете использовать фигуры в этом бою. Противник
              разыграет оставшиеся действия. Победит тот, у кого останется
              больше единиц здоровья.
            </Text>
          </div>
          <ModalFooter>
            <GothicTextButton
              variant="secondary"
              onClick={() => setFinishConfirm(false)}
            >
              Отмена
            </GothicTextButton>
            <GothicTextButton
              disabled={busy}
              onClick={() => {
                setFinishConfirm(false);
                onFinish?.();
              }}
            >
              Завершить
            </GothicTextButton>
          </ModalFooter>
        </Modal>
      )}
      {notice && (
        <Notification
          key={notice.id}
          message={notice.message}
          onClose={() => setNotice(null)}
        />
      )}
      <footer className="planning-footer planning-submit">
        {onExchange && plan.stage !== "reveal" && (
          <GothicTextButton
            variant="secondary"
            size="compact"
            disabled={
              busy ||
              game.player.deck?.exchanged ||
              !selected ||
              placed.some((p) => p.id === selected) ||
              !combatTokens.some((m) => m.id === selected)
            }
            onClick={async () => {
              await onExchange(selected);
            }}
          >
            Обмен · 1
          </GothicTextButton>
        )}

        <GothicTextButton
          width="action"
          disabled={
            busy || (plan.stage !== "reveal" && actualCost.remaining < 0)
          }
          onClick={() => onSubmit({ placements: placed, modifiers: mod })}
        >
          {busy
            ? "Подсчёт…"
            : plan.stage === "reveal"
              ? "Подсчитать результат"
              : !placed.length && canPass
                ? "Пропустить ход · восстановить 8"
                : plan.preparer === "player"
                  ? "Передать реакцию"
                  : "Подсчитать"}
          <ArrowRight size={16} />
        </GothicTextButton>
      </footer>
      {drag.ghost &&
        createPortal(
          <div
            className="figure-drag-ghost"
            style={{ left: drag.ghost.x + 12, top: drag.ghost.y - 28 }}
          >
            <ActionFigure
              m={tokens.find((m) => m.id === drag.ghost!.id)!}
              rotation={rotation}
              compressed={mod.compressed === selected}
            />
          </div>,
          document.body,
        )}
      {cellInfo !== null && cellAnchor && (
        <CellPopup
          anchor={cellAnchor}
          player={tokens.find((m) => m.id === ownInfo?.id)}
          enemy={enemyTokens.find((m) => m.id === enemyInfo?.id)}
          rotation={ownInfo?.rotation}
          compressed={mod.compressed === ownInfo?.id}
          rock={blocked.includes(cellInfo) && mod.unlocked !== cellInfo}
          damage={forecast?.cells[cellInfo]}
          onClose={() => setCellInfo(null)}
        />
      )}
    </section>
  );
}
