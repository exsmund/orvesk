import type { Meta, StoryObj } from "@storybook/react-vite";
import { JourneyMap } from "@/features/journey/JourneyMap/JourneyMap";
import { Example } from "../../../../stories/examples";
const meta = {
  title: "src/features/journey/JourneyMap",
  component: JourneyMap,
  args: {},
  argTypes: {
    game: { control: "object" },
    busy: { control: "boolean" },
    onVisit: { action: "onVisit", control: false },
    fullScreen: { control: "boolean" },
    onResumeForge: { action: "onResumeForge", control: false },
    onReward: { action: "onReward", control: false },
  },
  parameters: { componentName: "JourneyMap" },
} satisfies Meta<typeof JourneyMap>;
export default meta;
export const Preview: StoryObj = {
  name: "Пример",
  render: (args) => <Example name="JourneyMap" args={args} />,
};
