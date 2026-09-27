import type { Meta, StoryObj } from "@storybook/react-vite";
import { FighterPanel } from "@/features/characters/FighterPanel/FighterPanel";
import { Example } from "../../../../stories/examples";
const meta = {
  title: "src/features/characters/FighterPanel",
  component: FighterPanel,
  args: { souls: 12 },
  argTypes: {
    souls: { control: "number" },
    busy: { control: "boolean" },
    onUpgrade: { action: "onUpgrade", control: false },
    onOpen: { action: "onOpen", control: false },
    fighter: { control: "object" },
    preview: { control: "object" },
    enemy: { control: "boolean" },
    damage: { control: "number" },
    damageId: { control: "text" },
    onInspect: { action: "onInspect", control: false },
  },
  parameters: { componentName: "FighterPanel" },
} satisfies Meta<typeof FighterPanel>;
export default meta;
export const Preview: StoryObj = {
  name: "Пример",
  render: (args) => <Example name="FighterPanel" args={args} />,
};
