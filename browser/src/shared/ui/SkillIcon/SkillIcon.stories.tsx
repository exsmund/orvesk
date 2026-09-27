import type { Meta, StoryObj } from "@storybook/react-vite";
import { SkillIcon } from "@/shared/ui/SkillIcon/SkillIcon";
import { Example } from "../../../../stories/examples";
const meta = {
  title: "src/shared/ui/SkillIcon",
  component: SkillIcon,
  args: { id: "dodge", size: 120, framed: true },
  argTypes: {
    size: { control: "object" },
    framed: { control: "boolean" },
    id: {
      control: "select",
      options: ["dodge", "sidestep", "parry", "attack-training", "defense-training", "bandage"],
    },
  },
  parameters: { componentName: "SkillIcon" },
} satisfies Meta<typeof SkillIcon>;
export default meta;
export const Preview: StoryObj = {
  name: "Пример",
  render: (args) => <Example name="SkillIcon" args={args} />,
};
