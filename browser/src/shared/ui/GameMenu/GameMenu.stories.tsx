import type { Meta, StoryObj } from "@storybook/react-vite";
import { GameMenu } from "@/shared/ui/GameMenu/GameMenu";
import { Example } from "../../../../stories/examples";
const meta = {
  title: "src/shared/ui/GameMenu",
  component: GameMenu,
  args: { busy: false },
  argTypes: {
    busy: { control: "boolean" },
    onClose: { action: "onClose", control: false },
    onHome: { action: "onHome", control: false },
    onRules: { action: "onRules", control: false },
    onMap: { action: "onMap", control: false },
  },
  parameters: { componentName: "GameMenu" },
} satisfies Meta<typeof GameMenu>;
export default meta;
export const Preview: StoryObj = {
  name: "Пример",
  render: (args) => <Example name="GameMenu" args={args} />,
};
