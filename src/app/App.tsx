import { useKeyboardInputFocus } from "../shared/ui/useKeyboardInputFocus";
import { CombatBackdrop } from "../features/combat/CombatBackdrop";
import { BattleModeDialog } from "../features/combat/BattleModeDialog";
import { battleMode } from "../game/combat/battle-modes";
import { BattleResultDialog } from "../features/combat/BattleResultDialog";
import { ModalFooter } from "../shared/ui/ModalFooter";
import { ItemInspectionWindow } from "../features/equipment/ItemInspectionWindow";
import { CombatMenu } from "../features/combat/CombatMenu";
import { GothicTextButton } from "../shared/ui/GothicTextButton";
import {
  CharacterCreation,
  type NewCharacter,
} from "../features/characters/CharacterCreation";
import { StartScreen } from "../features/home/StartScreen";
import { FighterPanel } from "../features/characters/FighterPanel";
import { Modal } from "../shared/ui/Modal";
import { VictoryRewardDialog } from "../features/rewards/VictoryRewardDialog";
import { useVictoryRewardWindow } from "../features/rewards/useVictoryRewardWindow";
import { level } from "../game/progression/souls";
import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Sword,
  Swords,
  Hand,
  ChevronDown,
  ChevronRight,
  Check,
  X,
  Dices,
  Crosshair,
  LockKeyhole,
  Trophy,
} from "lucide-react";
import { ITEMS, item, STATS, DAMAGE, SLOTS } from "../game/equipment/catalog";
import {
  canUse,
  displaced,
  reaches,
  validateChoice,
  weapon,
} from "../game/combat/engine";
import {
  type Choice,
  type Fighter,
  type Item,
  type PublicGame,
} from "../game/types";
import "./styles/style.css";
import "../features/characters/portraits.css";

import { FloatingDamage } from "../features/combat/BattleEffects";
import { useReducedMotion } from "../features/combat/useReducedMotion";
import { turnFeedback, formatDamage } from "../game/combat/battle-feedback";
import { ItemArtwork } from "../features/equipment/EquipmentDoll";
import "../features/combat/combat-layout.css";
import { ItemInspection } from "../features/equipment/ItemInspection";
import { actionCost, selectedReward, stamina } from "../game/combat/tactics";

import "../features/combat/tactics.css";
import { ReactionBoard, ClashOutcome } from "../features/combat/ReactionBoard";
import { CombatReplay } from "../features/combat/CombatReplay";
import { CharacterHome } from "../features/characters/CharacterHome";
import {
  canCreateCharacter,
  createSavedCharacter,
  forgetCharacter,
  HERO_LIMIT_MESSAGE,
  rememberCharacter,
} from "../features/characters/characters";
import "../features/characters/fighter-portraits.css";
import "./styles/ui-textures.css";
import { JourneyScreen } from "../features/journey/JourneyScreen";
import { JourneyChoices } from "../features/journey/AdventureUI";

const SESSION_KEY = "duelyant.session.v2";

async function request(path: string, body?: unknown) {
  const res = await fetch(
    `/api${path}`,
    body === undefined
      ? undefined
      : {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
  );
  const data = await res.json();
  if (!res.ok)
    throw Object.assign(
      new Error(data.error ?? "Не удалось связаться с ареной."),
      { status: res.status, game: data.game },
    );
  return data;
}

function Mark() {
  return (
    <div className="brand">
      <Swords size={27} />
      <span>
        ГЕРОИ ОРВЕСКА<small>ПОШАГОВЫЕ ПОЕДИНКИ</small>
      </span>
    </div>
  );
}
function ItemIcon({
  equipment,
  size = 40,
}: {
  equipment?: Item;
  size?: number;
}) {
  return equipment ? (
    <ItemArtwork equipment={equipment} size={size} />
  ) : (
    <Sword size={size} strokeWidth={1.5} />
  );
}

// An equipment-aware schematic of a genderless human, rather than a gendered avatar.
function Figure({
  fighter,
  enemy = false,
  large = false,
}: {
  fighter: Fighter;
  enemy?: boolean;
  large?: boolean;
}) {
  const w = weapon(fighter),
    armed = w.id !== "fist";
  return (
    <svg
      className={`figure ${enemy ? "enemy-figure" : ""} ${large ? "large" : ""} ${fighter.hp <= 0 ? "fallen" : ""}`}
      viewBox="0 0 240 340"
      role="img"
      aria-label={`${fighter.name}: человек без пола, ${armed ? w.name : "без оружия"}, ${fighter.gear.body ? item(fighter.gear.body).name : "без одежды"}`}
    >
      <defs>
        <linearGradient id={enemy ? "skin-e" : "skin-p"} x1="0" x2="1">
          <stop stopColor={enemy ? "#716158" : "#8c918a"} />
          <stop offset=".5" stopColor={enemy ? "#d3aa8f" : "#d8d9cb"} />
          <stop offset="1" stopColor={enemy ? "#877365" : "#767d77"} />
        </linearGradient>
      </defs>
      <ellipse cx="117" cy="319" rx="79" ry="12" fill="#000" opacity=".25" />
      <g
        fill={`url(#${enemy ? "skin-e" : "skin-p"})`}
        stroke={enemy ? "#534a42" : "#575e57"}
        strokeWidth="1.3"
        strokeLinejoin="round"
      >
        <path d="m96 194 22 4-12 55-18 54-18 8-6-7 13-11 8-54z" />
        <path d="m120 193 21-5 7 60 22 54 13 8-4 7-26-6-26-57z" />
        <path d="m93 100 22-8 26 9 12 36-17 33 6 31-28 11-24-17 6-26-14-39z" />
        <path d="m88 106 13 15-25 43-27 13-9-9 28-19z" />
        <path d="m137 106 15 4 17 41 30-10 7 10-40 21-14-10-18-36z" />
        <path d="m105 84 19-1 6 20-24 3z" />
        <path d="m97 56 11-14 18 0 12 15-3 27-13 12-15-4-10-17z" />
      </g>
      <path
        d="m104 68 26-1m-14 0 1 14m-19 49 13 8 24-10m-21 11-1 26m-17 5 17 6 23-8"
        fill="none"
        stroke="#30352f"
        opacity=".25"
      />
      {fighter.gear.body && (
        <path
          d="m93 100 22 6 26-5 9 39-16 27 7 31-28 12-25-16 8-30-12-25z"
          fill="#505b55"
          stroke="#a6aa90"
          strokeWidth="2"
        />
      )}
      {fighter.gear.feet && (
        <g fill="#464940" stroke="#a6aa90">
          <path d="m76 283 18 5-6 19-18 8-6-7 13-11z" />
          <path d="m153 285 12-5 5 22 13 8-4 7-26-6z" />
        </g>
      )}
      {armed && (
        <g transform="rotate(20 202 144)">
          <path
            d={`M199 148 199 ${w.hands === 2 ? 13 : w.range! > 120 ? 38 : 75} 204 ${w.hands === 2 ? 3 : w.range! > 120 ? 28 : 65} 208 ${w.hands === 2 ? 13 : w.range! > 120 ? 38 : 75} 205 148Z`}
            fill="#babdb0"
            stroke="#e0d5b8"
          />
          <path d="M189 149h25m-12 0v25" stroke="#bda47c" strokeWidth="5" />
        </g>
      )}
      {fighter.gear.shield && (
        <path
          d="M27 139 66 139 71 165 47 202 22 168Z"
          fill="#444d47"
          stroke="#afa88a"
          strokeWidth="3"
        />
      )}
      <path d="M96 58 105 48" stroke="#fff" opacity=".25" strokeWidth="2" />
    </svg>
  );
}

function ItemDetails({
  equipment,
  fighter,
}: {
  equipment: Item;
  fighter: Fighter;
}) {
  return (
    <>
      <p className="item-description">{equipment.description}</p>
      <div className="item-properties">
        {equipment.damage && (
          <span>
            Урон{" "}
            {equipment.damage
              .map(
                (d) =>
                  `${Math.ceil(d.base + d.scale * fighter.stats[d.stat])} · ${DAMAGE[d.type].toLowerCase()}`,
              )
              .join(" + ")}
          </span>
        )}
        {equipment.hands && (
          <span>{equipment.hands === 2 ? "Две руки" : "Одна рука"}</span>
        )}
        {equipment.kind !== "shield" &&
          equipment.defense &&
          Object.entries(equipment.defense).map(([type, value]) => (
            <span key={type}>
              {DAMAGE[type as keyof typeof DAMAGE]} −{value}
            </span>
          ))}
        {equipment.kind !== "shield" &&
          equipment.resistance &&
          Object.entries(equipment.resistance).map(([type, value]) => (
            <span key={type}>
              {DAMAGE[type as keyof typeof DAMAGE]} −{Math.round(value * 100)}%
            </span>
          ))}
      </div>
      <div className="requirements">
        Требования:{" "}
        {Object.entries(equipment.requirements).map(([key, val]) => (
          <span
            className={
              fighter.stats[key as keyof typeof STATS] < val ? "unmet" : ""
            }
            key={key}
          >
            <span className="stat-name">
              {STATS[key as keyof typeof STATS]}
            </span>{" "}
            {val}{" "}
            <small>(у вас {fighter.stats[key as keyof typeof STATS]})</small>
          </span>
        ))}
        {!Object.keys(equipment.requirements).length && "нет"}
      </div>
    </>
  );
}

function Rules() {
  return (
    <div className="rules">
      <h3>Реакция и подготовка</h3>
      <p>
        В начале раунда обе стороны бросают d6 + реакцию. Меньший результат
        готовит действия, больший видит готовое поле и накладывает свой слой. В
        режиме «Тактика» подготовка ограничена 5 клетками, реакция — 4; в
        остальных режимах лимита клеток нет. При равенстве роли меняются
        относительно прошлого раунда, в первом — случайный выбор.
      </p>
      <h3>Режим путешествия</h3>
      <p>
        Режим выбирается случайно на всё путешествие. В новом путешествии
        выбирается один из двух других. «Тактика»: лимит клеток, фигуры
        возвращаются с учётом восстановления. «Свободное поле»: лимита клеток
        нет, фигуры возвращаются с учётом восстановления. «Единственный шанс»:
        каждую фигуру, включая навык, можно использовать только один раз за бой.
        Можно пропускать ход; подъём после падения не расходуется. Когда обе
        стороны завершили действия или больше не могут изменить здоровье,
        выигрывает участник с большим оставшимся здоровьем в единицах; при
        равенстве — ничья. Перед следующим боем фигуры обновляются. Правила
        одинаковы для игрока и врага.
      </p>
      <h3>Общее поле</h3>
      <p>
        Фигуры можно поворачивать. Свои фигуры не пересекаются; чужие можно
        перекрывать. Скалы закрыты, за границы поля выходить нельзя. Число фигур
        ограничено только местом на поле. Одну фигуру нельзя дублировать в одном
        раунде. Кулак доступен только при свободной руке.
      </p>
      <h3>Столкновения</h3>
      <p>
        Атака на пустоте наносит полный урон клетки. Атака против блока — 0.
        Оружие против оружия — половина урона каждой стороны. Блок против блока
        ничего не делает. Блок хотя бы на одной пустой клетке отнимает 1 стойки
        за всю фигуру. Правила одинаковы для обоих слоёв.
      </p>
      <h3>Урон</h3>
      <p>
        Урон показан в каждой клетке фигуры: у топора 60% приходится на первую
        клетку, у копья — на наконечник. Молот наносит 60% обычного урона
        здоровью, но снимает 3 стойки (4 сильной атакой). Посох выбирает луч или
        дугу, один рисунок за раунд. Броня вычитается один раз из прошедшего
        урона каждого действия по типам. Подсчёт одновременный; возможен
        обоюдный нокаут. Цифры в клетках показывают фактически потерянное
        здоровье.
      </p>
      <h3>Стойка и пинок</h3>
      <p>
        Пинок при прошедшем уроне снимает 2 стойки, сильная атака и щит — 1,
        магия дополнительно 1. Урон стойке от атаки умножается на прошедшую долю
        фигуры с учётом веса клеток и округляется до десятых; при полном
        поглощении урона здоровью — 0. При нулевой стойке следующий раунд
        содержит только подъём. Подъём полностью восстанавливает стойку и
        защищает от любой её потери на этот раунд, но урон здоровью сохраняется.
        Передышка восстанавливает 2 стойки. В режиме «Тактика» потеря равновесия
        уменьшает лимит следующего раунда на одну клетку; её может вызвать пинок
        или мороз. После штрафа мороз не может замедлить вас ещё один раунд;
        урон морозом при этом проходит.
      </p>
      <h3>Навыки</h3>
      <p>
        До трёх навыков на персонажа. За победу можно выбрать новый навык вместо
        другой награды; при заполненных местах — заменить один из имеющихся.
        Навыки сохраняются после поражения. Их фигуры подчиняются режиму
        путешествия, не проходят через скалы; после использования недоступны
        один раунд. Уклонение защищает от урона здоровью и стойке в своих
        клетках, но не даёт бонусов щита. При подъёме навыки недоступны. С
        третьего боя противники тоже получают навыки.
      </p>
      <h3>Предметы</h3>
      <p>
        Эфемерный меч проходит через скалы, но соблюдает границы, свой слой и
        лимит клеток. Кольцо раз за поединок открывает скалу для обеих сторон;
        амулет раз за поединок сжимает фигуру до одной клетки. Подбор предмета
        выполняется после подсчёта, если боец выжил. Вещи и фигуры можно
        осмотреть по клику.
      </p>
      <h3>Особые клетки и восстановление</h3>
      <p>
        Брешь обходит долю плоской брони, Опора восстанавливает 2 стойки за
        блок, Напор усиливает клетку и соседние части той же атаки на 25%.
        Описание видно до размещения. После сильного удара или усиленного блока
        этот приём недоступен один раунд, обычные действия остаются.
      </p>
      <h3>Противники и путешествие</h3>
      <p>
        Страж укрепляет стойку свободным блоком, Дуэлянт использует два
        маленьких выпада, Крушитель сосредотачивает сильный удар в одной клетке,
        Призрак проходит через скалы, но получает больше урона при обмене
        ударами. Их свойства и восстановление видны на экране боя. Пять боёв
        ведут к чемпиону. После победы и получения награды нажмите доступный
        узел карты. Двигаться можно только по линиям: через костёр, кузницу или
        напрямую к противнику. Костёр и кузница — отдельные сохраняемые
        остановки; получить их эффект повторно нельзя. Здоровье переносится
        между боями, поражение завершает путешествие, персонаж сохраняется.
      </p>
      <h3>Следующий поединок</h3>
      <p>
        Уровень равен сумме пяти характеристик минус 4 (минимум 1). В начале
        путешествия уровни врагов фиксируются относительно уровня героя: −2, −1,
        −1, 0, +1, минимум 1. Победа даёт одну награду на выбор: души, навык или
        предмет. Количество душ равно уровню врага + 1. Повышение характеристики
        стоит текущий уровень героя + 2 души и повышает уровень на 1. Прокачка
        доступна вне боя, в том числе при выборе предмета награды. При поражении
        все непотраченные души теряются; при ничьей сохраняются. Стойка
        восстанавливается к бою. Костёр лечит полностью, кузница — на 50%
        максимального здоровья; прямой переход не лечит. В кузнице можно
        заменить одну вещь или оставить своё снаряжение. Один лечебный заряд на
        путешествие восстанавливает 50% здоровья до размещения фигур без расхода
        клетки. После ничьей или поражения здоровье восстанавливается полностью.
        В режиме «Тактика» чемпион получает +1 клетку; за победу доступен
        дополнительный предмет на выбор.
      </p>
    </div>
  );
}

export function App() {
  useKeyboardInputFocus();
  const [confirmedBattle, setConfirmedBattle] = useState("");
  const [heroLimitOpen, setHeroLimitOpen] = useState(false);
  const [screen, setScreen] = useState<"home" | "heroes" | "create" | "game">(
    "home",
  );
  const [game, setGame] = useState<PublicGame | null>(null);
  const [session, setSession] = useState(() =>
    sessionStorage.getItem(SESSION_KEY),
  );
  const [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [choice, setChoice] = useState<Choice>({ action: "attack", step: 1 });
  const [mapOpen, setMapOpen] = useState(false);
  const [modal, setModal] = useState<
    "rules" | "catalog" | "ground" | "reward" | "journal" | null
  >(null);
  const [fighterInspection, setFighterInspection] = useState<
    "own" | "enemy" | null
  >(null);
  const [inspection, setInspection] = useState<{
    id: string;
    source: "own" | "enemy" | "catalog" | "ground";
  } | null>(null);
  const [filter, setFilter] = useState<
    "all" | "weapon" | "shield" | "armor" | "jewelry"
  >("all");
  const [rewardIndex, setRewardIndex] = useState(0);
  const [availableOnly, setAvailableOnly] = useState(false);
  const [feedback, setFeedback] =
    useState<ReturnType<typeof turnFeedback>>(null);
  const [replayOpen, setReplayOpen] = useState(false),
    [replayCount, setReplayCount] = useState(0);
  const [rewardOpen, setRewardOpen] = useVictoryRewardWindow(
    game?.phase,
    replayOpen,
  );
  const actionLock = useRef(false);
  const reducedMotion = useReducedMotion();
  useEffect(() => {
    if (screen !== "game" || !session) return;
    let active = true;
    request(`/sessions/${session}`)
      .then((data) => {
        if (active) {
          setGame(data);
          rememberCharacter(localStorage, {
            id: session,
            name: data.player.name,
            portraitId: data.player.portraitId,
          });
        }
      })
      .catch((err) => {
        if (!active) return;
        if (err.status === 404) {
          sessionStorage.removeItem(SESSION_KEY);
          setSession(null);
          setScreen("home");
        }
        setError(err.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [session, screen]);
  useEffect(() => {
    if (!feedback) return;
    const timer = setTimeout(() => setFeedback(null), 1900);
    return () => clearTimeout(timer);
  }, [feedback]);
  function showReplayStep(count: number) {
    setReplayCount(count);
    const trace = game?.log[0]?.replay;
    if (!replayOpen || !game || !trace || !count) {
      setFeedback(null);
      return;
    }
    const before = count === 1 ? trace.initial : trace.steps[count - 2].after,
      after = trace.steps[count - 1].after;
    setFeedback({
      id: `${game.fight}:${game.log[0].round}:${count}`,
      player: Math.max(
        0,
        Math.round((before.player.hp - after.player.hp) * 10) / 10,
      ),
      enemy: Math.max(
        0,
        Math.round((before.enemy.hp - after.enemy.hp) * 10) / 10,
      ),
    });
  }

  function resetView() {
    setRewardOpen(false);
    setMapOpen(false);
    setFighterInspection(null);
    setModal(null);
    setInspection(null);
    setFeedback(null);
    setReplayOpen(false);
    setReplayCount(0);
    setRewardIndex(0);
    setChoice({ action: "attack", step: 1 });
    setError("");
  }
  function goHome() {
    if (busy) return;
    resetView();
    setGame(null);
    setScreen("home");
  }
  function openCharacter(id: string) {
    resetView();
    setMapOpen(true);
    setGame(null);
    setLoading(true);
    sessionStorage.setItem(SESSION_KEY, id);
    setSession(id);
    setScreen("game");
  }
  function newCharacter() {
    if (!canCreateCharacter(localStorage)) {
      setHeroLimitOpen(true);
      return;
    }
    resetView();
    setGame(null);
    setScreen("create");
  }
  async function create(draft: NewCharacter) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const data = await createSavedCharacter(
        localStorage,
        () => request("/sessions", draft),
        (data) =>
          rememberCharacter(localStorage, {
            id: data.id,
            name: data.game.player.name,
            portraitId: data.game.player.portraitId,
          }),
      );
      sessionStorage.setItem(SESSION_KEY, data.id);
      setSession(data.id);
      setGame(data.game);
      setLoading(false);
      setScreen("game");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function deleteCharacter(id: string) {
    const response = await fetch(`/api/sessions/${id}`, { method: "DELETE" });
    if (!response.ok && response.status !== 404) {
      const data = await response.json();
      throw new Error(data.error ?? "Не удалось удалить героя.");
    }
    forgetCharacter(localStorage, id);
    if (sessionStorage.getItem(SESSION_KEY) === id) {
      sessionStorage.removeItem(SESSION_KEY);
      setSession(null);
      setGame(null);
    }
  }
  async function act(
    type:
      | "finish-actions"
      | "turn"
      | "next"
      | "reward"
      | "reveal"
      | "resolve"
      | "clash"
      | "heal"
      | "upgrade"
      | "travel",
    selection?: string,
    payload: object = {},
  ) {
    if (!game || busy || actionLock.current) return;
    actionLock.current = true;
    setBusy(true);
    setError("");
    setFeedback(null);
    try {
      // The animation never rolls game RNG: only the server determines the outcome.
      const [data] = await Promise.all([
        request(`/sessions/${session}/action`, {
          type,
          choice,
          selection,
          rewardIndex,
          round: game.round,
          fight: game.fight,
          phase: game.phase,
          stage: game.clash?.stage ?? game.planning?.stage,
          ...payload,
        }),
        new Promise<void>((resolve) =>
          setTimeout(
            resolve,
            (type === "turn" || type === "resolve") && !reducedMotion ? 950 : 0,
          ),
        ),
      ]);
      setGame(data);
      if (session)
        rememberCharacter(localStorage, {
          id: session,
          name: data.player.name,
          portraitId: data.player.portraitId,
        });
      if (type !== "upgrade" && (type !== "turn" || data.phase !== "combat"))
        setRewardIndex(0);
      if (type === "finish-actions") {
        setReplayOpen(true);
        setReplayCount(0);
      } else if (type === "clash" && data.log[0]?.clash) {
        setReplayCount(0);
        setReplayOpen(true);
        setFeedback(turnFeedback(game, data));
      } else if (type === "resolve" && data.log[0]?.replay) {
        setReplayCount(0);
        setReplayOpen(true);
      } else if (type === "turn" || type === "resolve")
        setFeedback(turnFeedback(game, data));
      if (type === "next" || type === "travel") {
        setReplayOpen(false);
        setReplayCount(0);
        setChoice({ action: "attack", step: 1 });
      } else if (actionCost(data.player, choice) > stamina(data.player))
        setChoice({ action: "rest", step: 0 });
      else if (choice.action === "equip")
        setChoice({ action: "attack", step: 0 });
    } catch (err) {
      const failure = err as Error & { game?: PublicGame };
      if (failure.game) setGame(failure.game);
      setError(failure.message);
    } finally {
      setBusy(false);
      actionLock.current = false;
    }
  }
  const heroLimitDialog = heroLimitOpen && (
    <Modal
      title="Слишком много героев"
      close={() => setHeroLimitOpen(false)}
      size="small"
      className="hero-confirm-dialog"
    >
      <div className="hero-confirm-body">
        <p>{HERO_LIMIT_MESSAGE}</p>
      </div>
      <ModalFooter>
        <GothicTextButton
          onClick={() => {
            setHeroLimitOpen(false);
            setScreen("heroes");
          }}
        >
          К героям
        </GothicTextButton>
      </ModalFooter>
    </Modal>
  );
  if (screen === "home")
    return (
      <>
        <StartScreen
          load={request}
          onContinue={openCharacter}
          onCreate={newCharacter}
          onHeroes={() => setScreen("heroes")}
        />
        {heroLimitDialog}
      </>
    );
  if (screen === "heroes")
    return (
      <>
        <CharacterHome
          onDelete={deleteCharacter}
          onOpen={openCharacter}
          onCreate={newCharacter}
          onBack={goHome}
          load={request}
        />
        {heroLimitDialog}
      </>
    );
  if (loading && screen === "game")
    return (
      <div className="loading">
        <Mark />
        <p>Открываем ворота арены…</p>
      </div>
    );
  if (screen === "game" && !game && session)
    return (
      <div className="loading">
        <Mark />
        <p role="alert">{error || "Не удалось открыть сохранение."}</p>
        <button className="primary" onClick={() => location.reload()}>
          Повторить загрузку
        </button>
        <button className="secondary" onClick={goHome}>
          На главный экран
        </button>
      </div>
    );
  if (!game)
    return (
      <CharacterCreation
        onClose={goHome}
        onCreate={(draft) => void create(draft)}
        busy={busy}
        error={error}
      />
    );
  const p = game.player,
    latest = game.log[0],
    playable = game.phase === "combat";
  const battleKey = `${session}:${game.journey?.expedition}:${game.fight}`;
  const trace = latest?.replay,
    showReplay = replayOpen && !!trace,
    showClash = replayOpen && !!latest?.clash;
  const frame = showReplay
    ? replayCount
      ? trace.steps[replayCount - 1].after
      : trace.initial
    : null;
  const shownPlayer = frame ? { ...p, ...frame.player } : p,
    shownEnemy = frame ? { ...game.enemy, ...frame.enemy } : game.enemy;
  const openReplay = () => {
    setReplayCount(0);
    setReplayOpen(true);
    setFeedback(null);
  };
  const closeReplay = () => {
    sessionStorage.setItem(
      `duelyant.replay.${session}`,
      `${game.fight}:${latest.round}`,
    );
    setReplayOpen(false);
    setFeedback(null);
    if (!playable) setMapOpen(true);
  };
  const reward = selectedReward(game, rewardIndex);
  const offensive = ["attack", "heavy", "kick", "shield"].includes(
    choice.action,
  );
  const errorChoice = validateChoice(game, choice);
  const selectedItem = choice.itemId ? item(choice.itemId) : null;
  const dropped = selectedItem ? displaced(p, selectedItem) : [];
  const planningPanel =
    playable && game.clash ? (
      <ReactionBoard
        key={`clash4-${game.fight}-${game.round}-${game.clash.stage}`}
        game={game}
        busy={busy}
        session={session!}
        onInspect={(id) => setInspection({ id, source: "ground" })}
        onSubmit={(payload) => act("clash", undefined, payload)}
        onHeal={() => void act("heal")}
        onFinish={() => void act("finish-actions")}
      />
    ) : (
      <section className="result-panel">
        <div className="result-content">
          {game.phase === "victory" ? (
            <button
              className="primary"
              onClick={() => {
                setMapOpen(true);
                setRewardOpen(true);
              }}
            >
              К награде
            </button>
          ) : (
            <>
              <h2>
                {game.phase === "draw"
                  ? "Поединок завершился ничьей"
                  : game.phase === "defeat"
                    ? "Путешествие окончено"
                    : "Следующий противник уже ждёт"}
              </h2>
              {game.phase === "defeat" && (
                <p>
                  Все непотраченные души потеряны. Характеристики, навыки и
                  снаряжение сохранены.
                </p>
              )}
              <button
                className="secondary"
                onClick={() => setFighterInspection("own")}
              >
                Персонаж и души
              </button>
              <JourneyChoices
                key={`${game.fight}:${game.phase}`}
                game={game}
                busy={busy}
                onNext={(payload) => act("travel", undefined, payload)}
                onInspect={(id) => setInspection({ id, source: "ground" })}
              />
            </>
          )}
        </div>
      </section>
    );

  const turnPanel = showClash ? (
    <ClashOutcome
      key={`${game.fight}:${latest.round}`}
      turn={latest}
      onDone={closeReplay}
      ending={
        playable
          ? "К следующему раунду"
          : game.phase === "victory"
            ? "К награде"
            : "К итогам"
      }
    />
  ) : showReplay ? (
    <CombatReplay
      key={`${game.fight}:${latest.round}`}
      turn={latest}
      count={replayCount}
      onCount={showReplayStep}
      onDone={closeReplay}
      reduced={reducedMotion}
      active
      ending={
        playable
          ? "К следующему ходу"
          : game.phase === "victory"
            ? "К награде"
            : "К итогам"
      }
    />
  ) : (
    <>
      {(trace || latest?.clash) && (
        <button className="replay-launch" onClick={openReplay}>
          Посмотреть ход {latest.round}
        </button>
      )}
      {planningPanel}
    </>
  );
  const journalPanel = (
    <section className="journal">
      <div className="panel-heading">
        <div>
          <span className="section-index">02</span>
          <h2>Хроника поединка</h2>
        </div>
        <span className="journal-subtitle">КАЖДЫЙ БРОСОК ИМЕЕТ ЗНАЧЕНИЕ</span>
      </div>
      {latest ? (
        <div className="journal-layout">
          <div className="dice-summary">
            <span className="eyebrow">
              ПОСЛЕДНИЙ БРОСОК · ХОД {latest.round}
            </span>
            <div className="dice-pair">
              <div>
                <span
                  className={`die ${latest.playerDie === 20 ? "critical" : ""}`}
                >
                  {latest.playerDie}
                </span>
                <small>ВЫ</small>
              </div>
              <span className="dice-divider">:</span>
              <div>
                <span
                  className={`die enemy-die ${latest.enemyDie === 20 ? "critical" : ""}`}
                >
                  {latest.enemyDie}
                </span>
                <small>ПРОТИВНИК</small>
              </div>
            </div>
            <p>
              {latest.playerAction}
              <span>vs</span>
              {latest.enemyAction}
            </p>
          </div>
          <div className="log-list" aria-live="polite">
            <span className="sr-only">
              Ход {latest.round}. Ваш бросок {latest.playerDie}, противник{" "}
              {latest.enemyDie}.
            </span>
            {latest.events.map((event, idx) => (
              <p key={`${latest.round}-${idx}`}>
                <ChevronRight size={13} />
                {event}
              </p>
            ))}
            {game.log.length > 1 && (
              <details className="past-turns">
                <summary>
                  Предыдущие ходы <ChevronDown size={13} />
                </summary>
                {game.log.slice(1).map((turn) => (
                  <div key={turn.round}>
                    <h4>
                      Ход {turn.round} · {turn.playerDie} : {turn.enemyDie} ·{" "}
                      {turn.playerAction} / {turn.enemyAction}
                    </h4>
                    {turn.events.map((event, idx) => (
                      <p key={idx}>{event}</p>
                    ))}
                  </div>
                ))}
              </details>
            )}
          </div>
        </div>
      ) : (
        <div className="empty-journal">
          <Dices size={27} />
          <div>
            <strong>Тишина перед первым ударом.</strong>
            <p>
              Выберите действие. Здесь появятся броски кубиков и события боя.
            </p>
          </div>
        </div>
      )}
    </section>
  );
  const groundPicker = (
    <div className="ground-selection">
      <div className="ground-title">
        <Hand size={16} />
        <strong>На камнях арены</strong>
        <span>Выберите предмет. Подбор займёт ход.</span>
      </div>
      <div className="ground-items">
        {[...new Set([...game.ground, ...(p.gear.weapon ? ["fist"] : [])])].map(
          (id) => (
            <button
              className={choice.itemId === id ? "chosen" : ""}
              key={id}
              disabled={busy}
              onClick={() => setChoice({ ...choice, itemId: id })}
            >
              <ItemIcon equipment={item(id)} />
              <span>{id === "fist" ? "Бросить оружие" : item(id).name}</span>
              {item(id).hands === 2 && <small>2 руки</small>}
              {choice.itemId === id && <Check size={15} />}
            </button>
          ),
        )}
      </div>
      {selectedItem && (
        <div className="swap-preview">
          <ItemInspection
            equipment={selectedItem}
            player={p}
            source="На арене"
          />
          {dropped.length > 0 && (
            <p className="accent">
              На земле останется: {dropped.map((i) => i.name).join(", ")}.
            </p>
          )}
        </div>
      )}
      {errorChoice && <p className="muted">{errorChoice}</p>}
    </div>
  );
  const mapScreen = !!game.journey && (game.phase !== "combat" || mapOpen);
  return (
    <div className={mapScreen ? "journey-shell" : "app combat-app"}>
      {mapScreen ? (
        <JourneyScreen
          game={game}
          busy={busy}
          onNext={(payload) => {
            setMapOpen(false);
            setModal(null);
            if (game.phase !== "combat") void act("travel", undefined, payload);
          }}
          onInspect={(id) => setInspection({ id, source: "ground" })}
          onHome={goHome}
          onHero={() => setFighterInspection("own")}
          onCatalog={() => setModal("catalog")}
          onRules={() => setModal("rules")}
          onReward={() => {
            if (replayOpen) closeReplay();
            setRewardOpen(true);
          }}
        />
      ) : (
        <>
          <CombatBackdrop journey={game.journey} />
          <CombatMenu
            busy={busy}
            onHome={goHome}
            onMap={() => setMapOpen(true)}
            onCatalog={() => setModal("catalog")}
            onRules={() => setModal("rules")}
            onJournal={() => setModal("journal")}
          />
          <main>
            <section className="arena-layout" aria-label="Арена боя">
              <FighterPanel
                fighter={shownPlayer}
                onOpen={() => setFighterInspection("own")}
                damage={feedback?.player}
                damageId={feedback?.id}
                onInspect={(equipment) =>
                  setInspection({ id: equipment.id, source: "own" })
                }
              />
              <div className="battle-center">
                <div className="fight-tab-content">
                  <div className="arena">
                    <div className="arena-top">
                      <span>
                        <span className="live-dot" />
                        {playable
                          ? "ПОЕДИНОК"
                          : game.phase === "defeat"
                            ? "ПОРАЖЕНИЕ"
                            : "ПОБЕДА"}
                      </span>
                      <span>ВЫ ХОДИТЕ ПЕРВЫМ</span>
                    </div>
                    <div className="arena-geometry">
                      <div />
                      <div />
                      <div />
                    </div>
                    <div className="arena-center-mark">✧</div>
                    <div
                      className="combatants"
                      style={
                        {
                          "--fighter-gap": `${Math.min(19, Math.max(0, (game.distance - 40) / 12))}%`,
                        } as React.CSSProperties
                      }
                    >
                      <div
                        className={`combatant player ${feedback?.player ? "took-hit" : ""}`}
                      >
                        <span className="fighter-label">ВЫ</span>
                        <Figure fighter={p} />
                        {feedback && (
                          <FloatingDamage
                            key={feedback.id}
                            amount={feedback.player}
                          />
                        )}
                        <div className="fighter-base" />
                      </div>
                      <div className="versus">VS</div>
                      <div
                        className={`combatant enemy ${feedback?.enemy ? "took-hit" : ""}`}
                      >
                        <span className="fighter-label">ПРОТИВНИК</span>
                        <Figure fighter={game.enemy} enemy />
                        {feedback && (
                          <FloatingDamage
                            key={feedback.id}
                            amount={feedback.enemy}
                          />
                        )}
                        <div className="fighter-base" />
                      </div>
                    </div>
                    <div className="arena-reach">
                      {playable ? (
                        <>
                          <span
                            className={
                              offensive && !reaches(game, choice)
                                ? "reach-icon out"
                                : "reach-icon"
                            }
                          >
                            <Crosshair size={16} />
                          </span>
                          <div>
                            <strong>
                              {p.prone
                                ? "Нужно подняться"
                                : offensive
                                  ? reaches(game, choice)
                                    ? "Удар достанет"
                                    : "Удар не достанет"
                                  : choice.action === "equip"
                                    ? "Смена экипировки"
                                    : choice.action === "rest"
                                      ? "Восстановление сил"
                                      : "Защитная стойка"}
                            </strong>
                            <small>
                              {p.prone
                                ? "Следующий ход — без других действий"
                                : offensive
                                  ? "С учётом вашего шага · противник может сместиться"
                                  : choice.action === "equip"
                                    ? "В этот ход вы не атакуете"
                                    : choice.action === "rest"
                                      ? "+3 силы · +2 устойчивости"
                                      : "Защита действует весь ход"}
                            </small>
                          </div>
                        </>
                      ) : (
                        <>
                          <Trophy size={20} />
                          <strong>
                            {game.phase === "defeat"
                              ? "Арена ждёт вашего возвращения"
                              : "Этот круг — за вами"}
                          </strong>
                        </>
                      )}
                    </div>
                    <div className="arena-bottom">
                      <span>КАМЕННАЯ АРЕНА</span>
                      <span>ОБОЮДНЫЙ ВЫБОР · D20</span>
                    </div>
                  </div>
                  {turnPanel}
                </div>
              </div>
              <FighterPanel
                fighter={shownEnemy}
                onOpen={() => setFighterInspection("enemy")}
                enemy
                damage={feedback?.enemy}
                damageId={feedback?.id}
                onInspect={(equipment) =>
                  setInspection({ id: equipment.id, source: "enemy" })
                }
              />
            </section>
            <div className="sr-only" role="status">
              {feedback &&
                [
                  feedback.player > 0
                    ? `Вы потеряли ${formatDamage(feedback.player)} здоровья.`
                    : "",
                  feedback.enemy > 0
                    ? `Противник потерял ${formatDamage(feedback.enemy)} здоровья.`
                    : "",
                ].join(" ")}
            </div>
          </main>
        </>
      )}
      {error && (
        <div className="error banner" role="alert">
          {error}
          <button onClick={() => setError("")} aria-label="Скрыть ошибку">
            <X size={16} />
          </button>
        </div>
      )}
      {playable && !mapScreen && confirmedBattle !== battleKey && (
        <BattleModeDialog
          mode={battleMode(game.journey)}
          onContinue={() => setConfirmedBattle(battleKey)}
        />
      )}
      {replayOpen && !playable && game.phase !== "ready" && (
        <BattleResultDialog game={game} onClose={closeReplay} />
      )}
      {rewardOpen && !replayOpen && game.phase === "victory" && (
        <VictoryRewardDialog
          game={game}
          busy={busy}
          index={rewardIndex}
          onSelect={setRewardIndex}
          onClaim={(selection, replaceSkillId, skillSlot) =>
            void act("reward", selection, { replaceSkillId, skillSlot })
          }
          onSpend={(stat) =>
            void act("upgrade", stat, {
              expectedLevel: level(p),
              expectedSouls: game.souls,
            })
          }
          error={error}
        />
      )}
      {modal && (
        <Modal
          size={modal === "catalog" ? "large" : "medium"}
          title={
            modal === "journal"
              ? "Хроника поединка"
              : modal === "rules"
                ? "Законы арены"
                : modal === "ground"
                  ? "Предметы на арене"
                  : modal === "reward"
                    ? "Награда"
                    : "Арсенал"
          }
          close={() => setModal(null)}
        >
          {modal === "journal" ? (
            journalPanel
          ) : modal === "rules" ? (
            <Rules />
          ) : modal === "reward" && reward?.kind === "item" ? (
            <ItemInspection
              equipment={item(reward.itemId)}
              player={p}
              source="Награда"
            />
          ) : modal === "ground" ? (
            <div className="ground-modal">
              {groundPicker}
              <GothicTextButton
                className="primary"
                disabled={!!errorChoice || busy}
                onClick={() => setModal(null)}
              >
                Выбрать
                <Check size={16} />
              </GothicTextButton>
            </div>
          ) : (
            <>
              <p className="catalog-intro">
                Оружие и доспехи этого мира. Их можно получить за победу; оружие
                также встречается на арене.
              </p>
              <div className="catalog-toolbar">
                <div className="segmented">
                  {(
                    [
                      { id: "all", label: "Всё" },
                      { id: "weapon", label: "Оружие" },
                      { id: "shield", label: "Щиты" },
                      { id: "armor", label: "Одежда" },
                      { id: "jewelry", label: "Украшения" },
                    ] as const
                  ).map((f) => (
                    <GothicTextButton
                      key={f.id}
                      className={filter === f.id ? "active" : ""}
                      onClick={() => setFilter(f.id)}
                    >
                      {f.label}
                    </GothicTextButton>
                  ))}
                </div>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={availableOnly}
                    onChange={(e) => setAvailableOnly(e.target.checked)}
                  />
                  По моим характеристикам
                </label>
              </div>
              <div className="catalog-grid">
                {ITEMS.filter(
                  (i) =>
                    (filter === "all" || i.kind === filter) &&
                    (!availableOnly || canUse(p, i)),
                ).map((equipment) => (
                  <article
                    className={`catalog-item ${!canUse(p, equipment) ? "locked" : ""}`}
                    key={equipment.id}
                  >
                    <button
                      className="catalog-item-header catalog-inspect"
                      aria-label={`Просмотреть ${equipment.name}`}
                      aria-haspopup="dialog"
                      onClick={() =>
                        setInspection({ id: equipment.id, source: "catalog" })
                      }
                    >
                      <div className="gear-icon filled">
                        <ItemIcon equipment={equipment} />
                      </div>
                      <div>
                        <span className="eyebrow">
                          {equipment.kind === "weapon"
                            ? "ОРУЖИЕ"
                            : equipment.kind === "shield"
                              ? "ЩИТ"
                              : SLOTS[equipment.slot].toUpperCase()}
                        </span>
                        <h3>{equipment.name}</h3>
                      </div>
                      {!canUse(p, equipment) && <LockKeyhole size={15} />}
                    </button>
                    <ItemDetails equipment={equipment} fighter={p} />
                  </article>
                ))}
              </div>
            </>
          )}
        </Modal>
      )}
      {fighterInspection &&
        createPortal(
          <Modal
            title={fighterInspection === "own" ? "Ваш персонаж" : "Противник"}
            close={() => setFighterInspection(null)}
          >
            <div className="fighter-details">
              <FighterPanel
                souls={fighterInspection === "own" ? game.souls : undefined}
                busy={busy}
                onUpgrade={
                  fighterInspection === "own" && !playable
                    ? (stat) =>
                        void act("upgrade", stat, {
                          expectedLevel: level(p),
                          expectedSouls: game.souls,
                        })
                    : undefined
                }
                fighter={
                  fighterInspection === "own"
                    ? mapScreen
                      ? p
                      : shownPlayer
                    : shownEnemy
                }
                enemy={fighterInspection === "enemy"}
                onInspect={(equipment) =>
                  setInspection({ id: equipment.id, source: fighterInspection })
                }
              />
            </div>
          </Modal>,
          document.body,
        )}
      {inspection && (
        <ItemInspectionWindow
          close={() => setInspection(null)}
          equipment={item(inspection.id)}
          player={p}
          opponent={
            inspection.source === "enemy" && playable ? game.enemy : undefined
          }
          own={inspection.source === "own"}
          source={
            inspection.source === "own"
              ? "Ваша экипировка"
              : inspection.source === "enemy"
                ? "Экипировка противника"
                : inspection.source === "ground"
                  ? "На арене"
                  : "Арсенал"
          }
        />
      )}
    </div>
  );
}
