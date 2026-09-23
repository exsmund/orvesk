import { createDiceScene } from "../src/features/combat/dice-scene";
import { useState, useRef, useEffect } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { InitiativeRoll } from "../src/features/combat/InitiativeRoll";
import { GothicTextButton } from "../src/shared/ui/GothicTextButton";
const meta = {
  title: "Компоненты/Бой/Бросок реакции",
  component: InitiativeRoll,
  args: {
    onComplete: () => {},
    playerDie: 5,
    enemyDie: 2,
    playerReaction: 1,
    enemyReaction: 1,
    playerName: "Вереск",
    enemyName: "Странник",
    preparer: "enemy",
  },
  render: function Preview(args) {
    const [playing, setPlaying] = useState(false);
    return (
      <>
        <GothicTextButton onClick={() => setPlaying(true)}>
          Бросить кубики
        </GothicTextButton>
        {playing && (
          <InitiativeRoll {...args} onComplete={() => setPlaying(false)} />
        )}
      </>
    );
  },
} satisfies Meta<typeof InitiativeRoll>;
export default meta;
export const Roll: StoryObj<typeof meta> = {};

function BoneDicePreview({ values }: { values: [number, number] }) {
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (host.current) return createDiceScene(host.current, values, true);
  }, [values]);
  return (
    <div ref={host} style={{ width: "100%", height: "min(70vh, 600px)" }} />
  );
}
export const WornBone: StoryObj<typeof meta> = {
  name: "Потёртая кость",
  render: (args) => (
    <BoneDicePreview values={[args.playerDie, args.enemyDie]} />
  ),
};
