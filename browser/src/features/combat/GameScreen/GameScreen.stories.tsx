import { mapGame, outcome } from "../../../../stories/fixtures";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { GameScreen } from "@/features/combat/GameScreen/GameScreen";
import { Example } from "../../../../stories/examples";
const meta = {
  title: "src/features/combat/GameScreen",
  component: GameScreen,
  args: { session: "storybook", busy: false, error: "" },
  argTypes: {
    game: { control: "object" },
    session: { control: "text" },
    busy: { control: "boolean" },
    error: { control: "text" },
    setError: { action: "setError", control: false },
    sendAction: { action: "sendAction", control: false },
    goHome: { action: "goHome", control: false },
  },
  parameters: { componentName: "GameScreen" },
} satisfies Meta<typeof GameScreen>;
export default meta;
export const Preview: StoryObj = {
  name: "Пример",
  render: (args) => <Example name="GameScreen" args={args} />,
};

export const SavedDefeat: StoryObj = {
  name: "Сохранённое поражение",
  args: {
    game: {
      ...mapGame,
      phase: "defeat",
      player: { ...mapGame.player, hp: 0, stamina: 0 },
      log: [outcome],
      journey: {
        ...mapGame.journey!,
        awaitingFirstBattle: false,
        lostSouls: { nodeId: "fight-1", amount: 12 },
      },
    },
  },
  render: (args) => <Example name="GameScreen" args={args} />,
};
