import type { Meta, StoryObj } from "@storybook/react-vite";
import { Text } from "@/shared/ui/Text";

const meta = {
  title: "src/shared/ui/Text/Варианты",
  component: Text,
  args: {
    children: "Герои Орвеска — путь сквозь руины",
    as: "p",
    size: "md",
    color: "primary",
    font: "body",
    weight: "regular",
    align: "left",
    truncate: false,
  },
  argTypes: {
    children: { control: "text", description: "Текст или вложенные фрагменты" },
    as: {
      control: "select",
      options: ["span", "p", "h1", "h2", "h3", "strong", "small", "label"],
    },
    size: {
      control: "select",
      options: ["inherit", "xs", "sm", "md", "lg", "xl", "2xl", "3xl"],
    },
    color: {
      control: "select",
      options: [
        "inherit",
        "primary",
        "muted",
        "accent",
        "highlight",
        "danger",
        "success",
        "inverse",
        "home",
      ],
    },
    font: { control: "select", options: ["inherit", "body", "display"] },
    weight: {
      control: "select",
      options: ["inherit", "regular", "medium", "semibold", "bold"],
    },
    align: {
      control: "select",
      options: ["inherit", "left", "center", "right"],
    },
    truncate: {
      control: "boolean",
      description: "Одна строка с многоточием; ширину задаёт контейнер",
    },
  },
} satisfies Meta<typeof Text>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Playground: Story = { name: "Песочница" };
export const Sizes: Story = {
  name: "Размеры",
  render: (args) => (
    <div>
      {(["xs", "sm", "md", "lg", "xl", "2xl", "3xl"] as const).map((size) => (
        <Text {...args} key={size} size={size}>
          {size} — Герои Орвеска
        </Text>
      ))}
    </div>
  ),
};
export const Colors: Story = {
  name: "Цвета",
  render: (args) => (
    <div>
      {(
        [
          "primary",
          "muted",
          "accent",
          "highlight",
          "danger",
          "success",
          "inverse",
          "home",
        ] as const
      ).map((color) => (
        <Text {...args} key={color} color={color}>
          {color} — Герои Орвеска
        </Text>
      ))}
    </div>
  ),
};
export const Display: Story = {
  name: "Prata",
  args: { font: "display", size: "2xl" },
};
export const Truncated: Story = {
  name: "Обрезка",
  args: {
    truncate: true,
    children:
      "Очень длинное название предмета, которое не помещается в одну строку",
  },
  render: (args) => (
    <div style={{ width: 240 }}>
      <Text {...args} />
    </div>
  ),
};
