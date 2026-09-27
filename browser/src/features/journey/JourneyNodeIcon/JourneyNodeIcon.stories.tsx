import type { Meta, StoryObj } from "@storybook/react-vite";
import { JourneyNodeIcon } from "@/features/journey/JourneyNodeIcon/JourneyNodeIcon";
import { Example } from "../../../../stories/examples";
const meta = {
  title: "src/features/journey/JourneyNodeIcon",
  component: JourneyNodeIcon,
  args: { status: "Можно идти", available: true },
  argTypes: {
    node: { control: "object" },
    current: { control: "boolean" },
    visited: { control: "boolean" },
    past: { control: "boolean" },
    available: { control: "boolean" },
    busy: { control: "boolean" },
    status: { control: "text" },
    label: { control: "text" },
    lostSouls: { control: "number" },
    onClick: { action: "onClick", control: false },
  },
  parameters: { componentName: "JourneyNodeIcon" },
} satisfies Meta<typeof JourneyNodeIcon>;
export default meta;
export const Preview: StoryObj = {
  name: "Пример",
  render: (args) => <Example name="JourneyNodeIcon" args={args} />,
};
