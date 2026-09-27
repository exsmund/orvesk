import type { Meta, StoryObj } from "@storybook/react-vite";
import { JourneyStop } from "@/features/journey/JourneyStop/JourneyStop";
import { Example } from "../../../../stories/examples";
const meta = {
  title: "src/features/journey/JourneyStop",
  component: JourneyStop,
  args: { busy: false },
  argTypes: {
    game: { control: "object" },
    busy: { control: "boolean" },
    onNext: { action: "onNext", control: false },
    onInspect: { action: "onInspect", control: false },
  },
  parameters: { componentName: "JourneyStop" },
} satisfies Meta<typeof JourneyStop>;
export default meta;
export const Preview: StoryObj = {
  name: "Пример",
  render: (args) => <Example name="JourneyStop" args={args} />,
};
