import type { Meta, StoryObj } from "@storybook/react-vite";
import { JourneyScreen } from "@/features/journey/JourneyScreen/JourneyScreen";
import { Example } from "../../../../stories/examples";
const meta = {
  title: "src/features/journey/JourneyScreen",
  component: JourneyScreen,
  args: { busy: false },
  argTypes: {
    game: { control: "object" },
    busy: { control: "boolean" },
    onNext: { action: "onNext", control: false },
    onInspect: { action: "onInspect", control: false },
    onHome: { action: "onHome", control: false },
    onHero: { action: "onHero", control: false },
    onRules: { action: "onRules", control: false },
    onReward: { action: "onReward", control: false },
  },
  parameters: { componentName: "JourneyScreen" },
} satisfies Meta<typeof JourneyScreen>;
export default meta;
export const Preview: StoryObj = {
  name: "Пример",
  render: (args) => <Example name="JourneyScreen" args={args} />,
};
