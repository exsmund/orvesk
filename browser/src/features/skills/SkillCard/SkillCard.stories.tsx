import type { Meta, StoryObj } from "@storybook/react-vite";
import { SkillCard } from "@/features/skills/SkillCard/SkillCard";
import { Example } from "../../../../stories/examples";
const meta = {
  title: "src/features/skills/SkillCard",
  component: SkillCard,
  args: { id: "dodge" },
  argTypes: {
    id: {
      control: "select",
      options: [
        "dodge",
        "sidestep",
        "parry",
        "attack-training",
        "defense-training",
        "bandage",
      ],
    },
    fighter: { control: "object" },
  },
  parameters: { componentName: "SkillCard" },
} satisfies Meta<typeof SkillCard>;
export default meta;
export const Preview: StoryObj = {
  name: "Пример",
  render: (args) => <Example name="SkillCard" args={args} />,
};
