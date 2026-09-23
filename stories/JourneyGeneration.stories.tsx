import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  createJourney,
  visitJourneyNode,
  resolveJourneyForge,
} from "../src/game/journey/journey";
import { JourneyScreen } from "../src/features/journey/JourneyScreen";
import {
  currentJourneyNode,
  JOURNEY_MAP_PRESETS,
  generateJourneyMap,
} from "../src/game/journey/journey-map";
import { publicClash } from "../src/game/combat/reaction-engine";
import { JourneyMap } from "../src/features/journey/JourneyMap";
import { GothicTextButton } from "../src/shared/ui/GothicTextButton";

function GeneratedMap() {
  const [game, setGame] = useState(() => createJourney("Путник", () => 0.5));
  return (
    <div style={{ width: "100%", maxWidth: 960, margin: "auto" }}>
      <p>
        Новая расстановка сохраняется на всю карту. Победа в этом примере
        имитируется кнопкой.
      </p>
      <GothicTextButton onClick={() => setGame(createJourney("Путник"))}>
        Новая карта
      </GothicTextButton>
      {game.phase === "combat" && (
        <GothicTextButton
          onClick={() =>
            setGame((g) => ({
              ...g,
              phase: "ready",
              journey: {
                ...g.journey!,
                cleared: g.journey!.stage,
                finished: g.journey!.stage === 5,
              },
            }))
          }
        >
          Завершить бой (демо)
        </GothicTextButton>
      )}
      {game.phase === "ready" &&
        currentJourneyNode(game.journey!).startsWith("forge") &&
        !game.journey!.forgeResolved && (
          <GothicTextButton
            onClick={() =>
              setGame((g) =>
                resolveJourneyForge(g, currentJourneyNode(g.journey!)),
              )
            }
          >
            Ничего не брать
          </GothicTextButton>
        )}
      <JourneyMap
        game={publicClash(game)}
        onVisit={(id) =>
          setGame((g) =>
            g.phase === "combat"
              ? g
              : visitJourneyNode(g, id, currentJourneyNode(g.journey!)),
          )
        }
      />
    </div>
  );
}
const meta = {
  title: "Проверки/Генерация карты",
  component: GeneratedMap,
  parameters: { layout: "padded" },
} satisfies Meta<typeof GeneratedMap>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Generated: Story = {};

function FullScreenMap({ preset }: { preset: string }) {
  const [game] = useState(() => {
    const g = createJourney("Путник", () => 0.5);
    const map = JOURNEY_MAP_PRESETS.find((p) => p.id === preset)!;
    g.journey!.mapPreset = map.id;
    g.journey!.map = generateJourneyMap(() => 0.5);
    return publicClash(g);
  });
  return (
    <JourneyScreen
      game={game}
      busy={false}
      onNext={() => {}}
      onInspect={() => {}}
      onHome={() => {}}
      onHero={() => {}}
      onRules={() => {}}
    />
  );
}
export const ForestFullScreen: Story = {
  render: () => <FullScreenMap preset="forest" />,
};
export const SteppeFullScreen: Story = {
  render: () => <FullScreenMap preset="steppe" />,
};
export const RuinsFullScreen: Story = {
  render: () => <FullScreenMap preset="ruins" />,
};
