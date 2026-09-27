import type { Meta, StoryObj } from "@storybook/react-vite";
import { GothicTextButton } from "@/shared/ui/GothicTextButton/GothicTextButton";
import { Example } from "../../../../stories/examples";
const meta = {
  title: "src/shared/ui/GothicTextButton",
  component: GothicTextButton,
  args: { variant: "primary", size: "regular", width: "full", disabled: false },
  argTypes: {
    variant: { control: "select", options: ["primary", "secondary"] },
    size: { control: "select", options: ["regular", "compact"] },
    width: { control: "select", options: ["auto", "full", "action"] },
    disabled: { control: "boolean" },
    title: { control: "text" },
    children: { control: "text" },
    onClick: { action: "onClick", control: false },
  },
  parameters: { componentName: "GothicTextButton" },
} satisfies Meta<typeof GothicTextButton>;
export default meta;
export const Preview: StoryObj = {
  name: "Пример",
  render: (args) => <Example name="GothicTextButton" args={args} />,
};

export const Variants: StoryObj = {
  name: "Виды и недоступное состояние",
  render: () => (
    <div style={{ display: "grid", gap: 16, maxWidth: 410 }}>
      <GothicTextButton>Основное действие</GothicTextButton>
      <GothicTextButton variant="secondary">
        Второстепенное действие
      </GothicTextButton>
      <GothicTextButton disabled>Основное недоступно</GothicTextButton>
      <GothicTextButton variant="secondary" disabled>
        Второстепенное недоступно
      </GothicTextButton>
    </div>
  ),
};

export const InColumn: StoryObj<typeof meta> = {
  name: "В высокой колонке",
  args: { children: "Свойства предмета", variant: "secondary" },
  render: (args) => (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: 600,
        maxWidth: 410,
      }}
    >
      <GothicTextButton {...args} />
    </div>
  ),
};
