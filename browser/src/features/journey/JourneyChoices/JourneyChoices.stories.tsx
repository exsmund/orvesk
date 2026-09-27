import type { Meta, StoryObj } from "@storybook/react-vite";
import { JourneyChoices } from "@/features/journey/JourneyChoices/JourneyChoices";
import { Example } from "../../../../stories/examples";
const meta = {
  title: "src/features/journey/JourneyChoices",
  component: JourneyChoices,
  args: { busy: false },
  argTypes: {
    game: { control: "object" },
    busy: { control: "boolean" },
    onNext: { action: "onNext", control: false },
    onInspect: { action: "onInspect", control: false },
  },
  parameters: { componentName: "JourneyChoices" },
} satisfies Meta<typeof JourneyChoices>;
export default meta;
export const Preview: StoryObj = {
  name: "Пример",
  render: (args) => <Example name="JourneyChoices" args={args} />,
};
