import type { Meta, StoryObj } from "@storybook/react-vite";
import { ReactionBoard } from "@/features/combat/ReactionBoard/ReactionBoard";
import { Example } from "../../../../stories/examples";
const meta = {
  title: "src/features/combat/ReactionBoard",
  component: ReactionBoard,
  args: { session: "storybook-only", busy: false },
  argTypes: {
    game: { control: "object" },
    busy: { control: "boolean" },
    session: { control: "text" },
    onExchange: { action: "onExchange", control: false },
    onSubmit: { action: "onSubmit", control: false },
    onFinish: { action: "onFinish", control: false },
    onCharm: { action: "onCharm", control: false },
    forecastKey: { control: "text" },
    onForecast: { action: "onForecast", control: false },
  },
  parameters: { componentName: "ReactionBoard" },
} satisfies Meta<typeof ReactionBoard>;
export default meta;
export const Preview: StoryObj = {
  name: "Пример",
  render: (args) => <Example name="ReactionBoard" args={args} />,
};
