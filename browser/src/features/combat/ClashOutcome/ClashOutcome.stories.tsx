import type { Meta, StoryObj } from "@storybook/react-vite";
import { ClashOutcome } from "@/features/combat/ClashOutcome/ClashOutcome";
import { Example } from "../../../../stories/examples";
const meta = {
  title: "src/features/combat/ClashOutcome",
  component: ClashOutcome,
  args: { ending: "Далее" },
  argTypes: {
    resultDescription: { control: "text" },
    turn: { control: "object" },
    onDone: { action: "onDone", control: false },
    ending: { control: "text" },
    showContinue: { control: "boolean" },
    result: { control: "select", options: ["victory", "defeat", "draw"] },
  },
  parameters: { componentName: "ClashOutcome" },
} satisfies Meta<typeof ClashOutcome>;
export default meta;
export const Preview: StoryObj = {
  name: "Пример",
  render: (args) => <Example name="ClashOutcome" args={args} />,
};

export const VictoryByHealth: StoryObj = {
  name: "Победа по оставшемуся здоровью",
  args: {
    result: "victory",
    ending: "К награде",
    resultDescription:
      "Фигуры закончились. Вы победили, потому что у вас осталось больше здоровья.",
  },
  render: (args) => <Example name="ClashOutcome" args={args} />,
};
