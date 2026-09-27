import type { Meta, StoryObj } from "@storybook/react-vite";
import { MapWindow } from "@/features/journey/JourneyScreen/MapWindow";
import { Example } from "../../../../stories/examples";
const meta = {
  title: "src/features/journey/JourneyScreen/MapWindow",
  component: MapWindow,
  args: { title: "Остановка" },
  argTypes: {
    title: { control: "text" },
    close: { action: "close", control: false },
    children: { control: "text" },
  },
  parameters: { componentName: "MapWindow" },
} satisfies Meta<typeof MapWindow>;
export default meta;
export const Preview: StoryObj = {
  name: "Пример",
  render: (args) => <Example name="MapWindow" args={args} />,
};
