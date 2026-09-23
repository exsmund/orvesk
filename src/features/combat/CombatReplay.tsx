import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Dice1,
  Dice2,
  Dice3,
  Dice4,
  Dice5,
  Dice6,
  Footprints,
  Hand,
  Pause,
  PersonStanding,
  Play,
  RotateCcw,
  Shield,
  SkipForward,
} from "lucide-react";
import { ItemArtwork } from "../equipment/EquipmentDoll";
import { item } from "../../game/equipment/catalog";
import { formatDamage } from "../../game/combat/battle-feedback";
import type {
  CombatSnapshot,
  CombatStep,
  Side,
  TurnRecord,
} from "../../game/types";
import "./combat-replay.css";

function Artwork({
  id,
  action,
}: {
  id?: string;
  action?: CombatStep["action"];
}) {
  const Icon =
    action === "advance" || action === "retreat" || action === "kick"
      ? Footprints
      : action === "rest"
        ? RotateCcw
        : action === "equip"
          ? Hand
          : action === "block"
            ? Shield
            : PersonStanding;
  return (
    <span className="replay-art">
      {id ? (
        <ItemArtwork equipment={item(id)} size={54} />
      ) : (
        <Icon aria-hidden="true" />
      )}
    </span>
  );
}
function InitiativeDie({
  value,
  bonus,
  first,
}: {
  value: number;
  bonus: number;
  first: boolean;
}) {
  const Icon = [Dice1, Dice2, Dice3, Dice4, Dice5, Dice6][value - 1] ?? Dice1;
  return (
    <div className={`reaction-side ${first ? "goes-first" : ""}`}>
      <Icon className="replay-die" aria-label={`Кубик: ${value}`} />
      <div>
        <strong>
          {value} + {bonus} = {value + bonus}
        </strong>
        <small>кубик + инициатива</small>
        <b>{first ? "Действует первым" : "Действует вторым"}</b>
      </div>
    </div>
  );
}
function ReplayRow({
  step,
  index,
  before,
}: {
  step: CombatStep;
  index: number;
  before: CombatSnapshot;
}) {
  const other: Side = step.actor === "player" ? "enemy" : "player",
    guard = step.defense;
  const attack = (
    <div className="replay-side acting">
      <Artwork id={step.itemId} action={step.action} />
      <div>
        <small>{step.counter ? "ОТВЕТНЫЙ УДАР" : `ШАГ ${index + 1}`}</small>
        <strong>{step.name}</strong>
        {step.itemId && <span>{item(step.itemId).name}</span>}
        {step.dice && <span>d20 · {step.dice.attack}</span>}
      </div>
    </div>
  );
  const defending = (
    <div className={`replay-side defending ${guard ? "guarding" : ""}`}>
      <Artwork
        id={guard?.itemId ?? before[other].gear.body ?? undefined}
        action={guard?.kind}
      />
      <div>
        <small>{guard ? "АКТИВНАЯ ЗАЩИТА" : "СОСТОЯНИЕ"}</small>
        <strong>
          {guard
            ? guard.kind === "parry"
              ? "Парирование"
              : guard.itemId === "fist"
                ? "Блок руками"
                : "Блок щитом"
            : before[other].prone
              ? "На земле"
              : step.damage !== undefined
                ? "Без блока"
                : "Ожидает"}
        </strong>
        {guard && (
          <span>
            {item(guard.itemId).name} · {guard.hits} зар.
          </span>
        )}
        {guard?.bypassed && <span>Не действует против рипоста</span>}
        {before[other].exposed ? <span>Раскрыт</span> : null}
        {step.dice && <span>d20 · {step.dice.defense}</span>}
      </div>
    </div>
  );
  return (
    <li
      className={`replay-row from-${step.actor}`}
      aria-label={`Шаг ${index + 1}. ${step.actor === "player" ? "Вы" : "Противник"}: ${step.name}. ${step.result}${step.damage !== undefined ? `. Потеря здоровья: ${formatDamage(step.damage)}` : ""}`}
    >
      <div className="replay-exchange">
        {step.actor === "player" ? attack : defending}
        <div className={`replay-outcome ${step.damage ? "damaging" : ""}`}>
          {step.actor === "player" ? (
            <ArrowRight size={16} />
          ) : (
            <ArrowLeft size={16} />
          )}
          <b>
            {step.damage !== undefined
              ? step.damage > 0
                ? `−${formatDamage(step.damage)}`
                : "0"
              : "·"}
          </b>
          <span>{step.result}</span>
        </div>
        {step.actor === "enemy" ? attack : defending}
      </div>
      <details className="replay-details">
        <summary>Подробности шага</summary>
        {step.events.map((event, i) => (
          <p key={i}>{event}</p>
        ))}
      </details>
    </li>
  );
}
export function CombatReplay({
  turn,
  count,
  onCount,
  onDone,
  reduced,
  active,
  ending,
}: {
  turn: TurnRecord;
  count: number;
  onCount: (count: number) => void;
  onDone: () => void;
  reduced: boolean;
  active: boolean;
  ending: string;
}) {
  const replay = turn.replay!,
    [paused, setPaused] = useState(reduced),
    scroll = useRef<HTMLDivElement>(null),
    total = replay.steps.length,
    complete = count === total;
  useEffect(() => {
    if (paused || complete || !active) return;
    const timer = setTimeout(
      () => onCount(count + 1),
      count === 0 ? 1300 : 1700,
    );
    return () => clearTimeout(timer);
  }, [count, total, paused, complete, active, onCount]);
  useEffect(() => {
    const el = scroll.current;
    if (el)
      el.scrollTo({
        top: el.scrollHeight,
        behavior: reduced ? "instant" : "smooth",
      });
  }, [count, reduced]);
  return (
    <section className="combat-replay" aria-label={`Разбор хода ${turn.round}`}>
      <header className="replay-header">
        <div>
          <span className="eyebrow">ХОД {turn.round} · ШАГ ЗА ШАГОМ</span>
          <h2>{complete ? "Ход завершён" : "Розыгрыш действий"}</h2>
        </div>
        <span>
          {count}/{total}
        </span>
      </header>
      <div className="replay-column-heads">
        <span>ВЫ</span>
        <span>ПРОТИВНИК</span>
      </div>
      <div
        className="replay-scroll"
        ref={scroll}
        onClick={(e) => {
          if ((e.target as HTMLElement).closest("details")) setPaused(true);
        }}
        onWheel={() => setPaused(true)}
        onTouchMove={() => setPaused(true)}
        tabIndex={0}
        aria-label="Шаги боя"
      >
        <div className="replay-reaction">
          <span className="reaction-label">ИНИЦИАТИВА · D6</span>
          <div>
            <InitiativeDie
              value={turn.playerDie}
              bonus={replay.playerInitiative}
              first={replay.first === "player"}
            />
            <InitiativeDie
              value={turn.enemyDie}
              bonus={replay.enemyInitiative}
              first={replay.first === "enemy"}
            />
          </div>
          {turn.playerDie + replay.playerInitiative ===
            turn.enemyDie + replay.enemyInitiative && (
            <p>
              Равенство: по правилу очерёдности начинает{" "}
              {replay.first === "player" ? "игрок" : "противник"}.
            </p>
          )}
        </div>
        <ol className="replay-steps">
          {replay.steps.slice(0, count).map((step, i) => (
            <ReplayRow
              key={i}
              index={i}
              step={step}
              before={i ? replay.steps[i - 1].after : replay.initial}
            />
          ))}
        </ol>
      </div>
      <footer className="replay-controls">
        <div>
          <button
            aria-label={paused ? "Продолжить показ" : "Пауза"}
            disabled={complete}
            onClick={() => setPaused(!paused)}
          >
            {paused ? <Play size={16} /> : <Pause size={16} />}
          </button>
          <button
            aria-label="Следующий шаг"
            disabled={complete}
            onClick={() => {
              setPaused(true);
              onCount(count + 1);
            }}
          >
            <SkipForward size={16} />
          </button>
          <button
            aria-label="Повторить ход"
            onClick={() => {
              onCount(0);
              setPaused(reduced);
            }}
          >
            <RotateCcw size={16} />
          </button>
        </div>
        {complete ? (
          <button className="primary" onClick={onDone}>
            {ending}
            <ArrowRight size={15} />
          </button>
        ) : (
          <button
            className="secondary"
            onClick={() => {
              setPaused(true);
              onCount(total);
            }}
          >
            Показать всё
          </button>
        )}
      </footer>
      <span className="sr-only" role="status">
        {count
          ? `${replay.steps[count - 1].actor === "player" ? "Вы" : "Противник"}: ${replay.steps[count - 1].name}. ${replay.steps[count - 1].result}.`
          : "Броски инициативы."}
      </span>
    </section>
  );
}
