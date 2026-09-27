import type { Meta, StoryObj } from "@storybook/react-vite";
import { CREATURES } from "@/game/creatures/catalog";
import { createGame, maxHp } from "@/game/combat/engine";
import { CreatureDetails } from "@/features/creatures/CreatureDetails";
import { CharacterPortrait } from "@/shared/ui/CharacterPortrait";
import { Text } from "@/shared/ui/Text";
import { DAMAGE_TYPES } from "@/game/combat/damage-types";
import "./bestiary.css";
function BestiaryPage({
  category,
  stat,
}: {
  category: "all" | "main" | "new";
  stat: number;
}) {
  return (
    <main className="sb-bestiary">
      <Text as="h1">Бестиарий</Text>
      <Text as="p">
        Характеристики для предпросмотра: {stat}. Фигуры и экипировка читаются
        из конфигов существ.
      </Text>
      {CREATURES.filter(
        (c) =>
          category === "all" ||
          c.source.section === (category === "main" ? "10" : "11"),
      ).map((c) => {
        const fighter = {
          ...createGame(c.name, () => 0.5).player,
          gear: {
            weapon: null,
            shield: null,
            body: null,
            feet: null,
            ring: null,
            amulet: null,
          },
          creatureId: c.id,
          name: c.name,
          portraitId: `creature:${c.id}`,
        };
        fighter.stats = {
          strength: stat,
          agility: stat,
          vitality: stat,
          intelligence: stat,
        };
        fighter.hp = maxHp(fighter);
        return (
          <article key={c.id} className="sb-bestiary__entry">
            <div>
              <Text as="h2">{c.name}</Text>
              <CharacterPortrait
                src={c.portrait.src}
                side="enemy"
                alt={c.name}
                loading="lazy"
              />
              <Text as="p">
                {c.encounter.combat
                  ? `Противник · с карты ${c.encounter.minExpedition}`
                  : "Мирное существо"}
                {c.encounter.dialogue ? " · Возможен диалог" : ""}
              </Text>
            </div>
            <CreatureDetails fighter={fighter} onInspect={() => {}} />
          </article>
        );
      })}
      <Text as="h2">Типы урона</Text>
      {Object.entries(DAMAGE_TYPES).map(([id, d]) => (
        <section key={id}>
          <Text as="h3">{d.name}</Text>
          <Text as="p">{d.description}</Text>
        </section>
      ))}
    </main>
  );
}
const meta = {
  title: "Бестиарий",
  component: BestiaryPage,
  args: { category: "all", stat: 1 },
  argTypes: {
    category: { control: "select", options: ["all", "main", "new"] },
    stat: { control: { type: "number", min: 1, max: 20 } },
  },
} satisfies Meta<typeof BestiaryPage>;
export default meta;
export const All: StoryObj<typeof meta> = { name: "Все существа" };
