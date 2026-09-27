import type { Meta, StoryObj } from "@storybook/react-vite";
import { StartScreen } from "@/features/home/StartScreen/StartScreen";
import { Example } from "../../../../stories/examples";
const meta = {
  title: "src/features/home/StartScreen",
  component: StartScreen,
  args: {},
  argTypes: {
    load: { action: "load", control: false },
    onContinue: { action: "onContinue", control: false },
    onCreate: { action: "onCreate", control: false },
    onHeroes: { action: "onHeroes", control: false },
    storage: { control: "object" },
  },
  parameters: { componentName: "StartScreen" },
} satisfies Meta<typeof StartScreen>;
export default meta;
export const Preview: StoryObj = {
  name: "Пример",
  render: (args) => <Example name="StartScreen" args={args} />,
};
