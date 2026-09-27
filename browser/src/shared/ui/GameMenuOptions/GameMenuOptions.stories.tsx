import type { Meta, StoryObj } from "@storybook/react-vite";
import { GameMenuOptions } from "@/shared/ui/GameMenuOptions/GameMenuOptions";
import { Example } from "../../../../stories/examples";
const meta = {
  title: "src/shared/ui/GameMenuOptions",
  component: GameMenuOptions,
  args: { busy: false },
  argTypes: {
    busy: { control: "boolean" },
    onClose: { action: "onClose", control: false },
    onHome: { action: "onHome", control: false },
    onRules: { action: "onRules", control: false },
    onMap: { action: "onMap", control: false },
  },
  parameters: { componentName: "GameMenuOptions" },
} satisfies Meta<typeof GameMenuOptions>;
export default meta;
export const Preview: StoryObj = {
  name: "Пример",
  render: (args) => <Example name="GameMenuOptions" args={args} />,
};
