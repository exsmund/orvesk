import type { Meta, StoryObj } from "@storybook/react-vite";
import { FighterDialog } from "@/features/characters/FighterDialog/FighterDialog";
import { Example } from "../../../../stories/examples";
const meta = {
  title: "src/features/characters/FighterDialog",
  component: FighterDialog,
  args: { side: "own", busy: false },
  argTypes: {
    side: { control: "select", options: ["own", "enemy"] },
    fighter: { control: "object" },
    game: { control: "object" },
    busy: { control: "boolean" },
    close: { action: "close", control: false },
    onInspect: { action: "onInspect", control: false },
    onUpgrade: { action: "onUpgrade", control: false },
  },
  parameters: { componentName: "FighterDialog" },
} satisfies Meta<typeof FighterDialog>;
export default meta;
export const Preview: StoryObj = {
  name: "Пример",
  render: (args) => <Example name="FighterDialog" args={args} />,
};
