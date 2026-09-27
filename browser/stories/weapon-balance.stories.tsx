import "./weapon-balance.css";
import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  ITEMS,
  itemAtLevel,
  STATS,
  WEAPON_WEIGHTS,
} from "@/game/equipment/catalog";
import { itemManeuvers } from "@/game/combat/reaction-rules";
import { figureCellDamage } from "@/game/combat/figure-power";
import { FigureCard } from "@/features/combat/FigureCard";
import { EquipmentIcon } from "@/shared/ui/EquipmentIcon";
import { Text } from "@/shared/ui/Text";
import type { Stat, WeaponWeight } from "@/game/types";
import { fighter } from "./fixtures";

const groups = [
  { label: "Сила", stats: ["strength"] },
  { label: "Ловкость", stats: ["agility"] },
  { label: "Интеллект", stats: ["intelligence"] },
  { label: "Сила + ловкость", stats: ["strength", "agility"] },
  { label: "Сила + интеллект", stats: ["strength", "intelligence"] },
  { label: "Ловкость + интеллект", stats: ["agility", "intelligence"] },
] satisfies { label: string; stats: Stat[] }[];

function WeaponBalance({
  weaponLevel,
  statValue,
  equalInvestment,
  weightClass,
}: {
  weaponLevel: number;
  statValue: number;
  equalInvestment: boolean;
  weightClass: "all" | WeaponWeight;
}) {
  const level = Math.max(1, Math.floor(weaponLevel));
  const stat = Math.max(1, Math.floor(statValue));
  return (
    <section className="sb-weapon-balance">
      <Text as="h1" size="2xl" font="display">
        Баланс оружия
      </Text>
      <Text as="p">
        По 11 оружий на силу, ловкость и интеллект; ещё по 3 на каждую пару
        характеристик. Кулак и щиты здесь не учитываются.
      </Text>
      <Text as="p" color="muted">
        {equalInvestment
          ? "Равные вложения: выбранные значения относятся к гибридам. Для оружия с одним требованием уровень и характеристика равны 2N − 1."
          : "Одинаковые значения характеристик и уровня оружия. Гибрид требует прокачать две характеристики, поэтому вложенных очков у него больше."}{" "}
        Броня и противодействие не учитываются. Числа: урон одной клетки ×
        количество клеток.
      </Text>
      <Text as="p" color="muted">
        {Object.values(WEAPON_WEIGHTS)
          .map(
            ({ name, cells, staminaCost }) =>
              `${name}: ${cells.min}–${cells.max} кл., цена ${staminaCost.min}–${staminaCost.max}.`,
          )
          .join(" ")}{" "}
        Урон клетки одинаков при равных вложениях.
      </Text>
      {groups.map(({ label, stats }) => {
        const weapons = ITEMS.filter(
          (w) =>
            w.kind === "weapon" &&
            !w.unarmed &&
            (weightClass === "all" || w.weightClass === weightClass) &&
            Object.keys(w.requirements).length === stats.length &&
            stats.every((s) => s in w.requirements),
        );
        if (!weapons.length) return null;
        const adjustedLevel =
          equalInvestment && stats.length === 1 ? 2 * level - 1 : level;
        const adjustedStat =
          equalInvestment && stats.length === 1 ? 2 * stat - 1 : stat;
        const actor = {
          ...fighter,
          stats: {
            ...fighter.stats,
            ...Object.fromEntries(stats.map((s) => [s, adjustedStat])),
          },
        };
        return (
          <section className="sb-weapon-balance-group" key={label}>
            <Text as="h2" size="xl">
              {label} · {weapons.length}
            </Text>
            <Text as="p" color="muted">
              Уровень оружия: {adjustedLevel}.{" "}
              {stats.map((s) => `${STATS[s]}: ${adjustedStat}`).join("; ")}.
            </Text>
            {adjustedStat < adjustedLevel && (
              <Text as="p" color="danger">
                Характеристик недостаточно для экипировки.
              </Text>
            )}
            <div
              className="sb-weapon-balance-scroll"
              role="region"
              aria-label={`Таблица: ${label}`}
              tabIndex={0}
            >
              <table className="sb-weapon-balance-table">
                <thead>
                  <tr>
                    {["Оружие", "Фигуры"].map((title) => (
                      <Text as="th" scope="col" key={title}>
                        {title}
                      </Text>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {weapons.map((w) => {
                    const equipment = itemAtLevel(w, adjustedLevel);
                    const figures = itemManeuvers(equipment);
                    const copies = figures.reduce(
                      (sum, m) => sum + (m.copies ?? 1),
                      0,
                    );
                    const damage = figures.reduce(
                      (sum, m) =>
                        sum +
                        figureCellDamage(actor, m) *
                          m.shape.length *
                          (m.copies ?? 1),
                      0,
                    );
                    const cost = figures.reduce(
                      (sum, m) => sum + (m.staminaCost ?? 0) * (m.copies ?? 1),
                      0,
                    );
                    return (
                      <tr key={w.id}>
                        <td className="sb-weapon-balance-cell">
                          <div className="sb-weapon-balance-item">
                            <EquipmentIcon
                              equipment={equipment}
                              size={88}
                              framed
                            />
                            <div>
                              <Text as="p" weight="bold">
                                {w.name}
                              </Text>
                              <Text as="p" color="muted" size="sm">
                                {w.weightClass &&
                                  `${WEAPON_WEIGHTS[w.weightClass].name} · `}
                                {w.hands === 2 ? "Две руки" : "Одна рука"}
                                {w.lore ? ` · Лор ${w.lore.section}` : ""}
                              </Text>
                            </div>
                          </div>
                          <Text as="p" size="sm">
                            Карт от оружия: {copies}
                          </Text>
                          <Text as="p" size="sm">
                            Урон всех карт: {damage}
                          </Text>
                          <Text as="p" size="sm">
                            Цена всех карт: {cost} выносливости
                          </Text>
                        </td>
                        <td className="sb-weapon-balance-cell">
                          <div className="sb-weapon-balance-figures">
                            {figures.map((figure) => (
                              <FigureCard
                                key={figure.id}
                                figure={figure}
                                stats={actor.stats}
                              />
                            ))}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}
    </section>
  );
}
const meta = {
  title: "Экипировка/Баланс оружия",
  component: WeaponBalance,
  args: {
    weaponLevel: 1,
    statValue: 1,
    equalInvestment: true,
    weightClass: "all",
  },
  argTypes: {
    weightClass: {
      name: "Вес оружия",
      control: {
        type: "select",
        labels: {
          all: "Все",
          ...Object.fromEntries(
            Object.entries(WEAPON_WEIGHTS).map(([key, value]) => [
              key,
              value.name,
            ]),
          ),
        },
      },
      options: ["all", ...Object.keys(WEAPON_WEIGHTS)],
    },
    weaponLevel: {
      name: "Уровень оружия",
      control: { type: "range", min: 1, max: 30, step: 1 },
    },
    statValue: {
      name: "Характеристика",
      control: { type: "range", min: 1, max: 30, step: 1 },
    },
    equalInvestment: { name: "Равные вложения", control: "boolean" },
  },
} satisfies Meta<typeof WeaponBalance>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Comparison: Story = { name: "Сравнение" };
