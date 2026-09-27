import type { Meta, StoryObj } from "@storybook/react-vite";
import { Text } from "@/shared/ui/Text/Text";
import { Example } from "../../../../stories/examples";
const meta = {
  title: "src/shared/ui/Text",
  component: Text,
  args: {},
  argTypes: {
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
    font: { control: "select", options: ["body", "inherit", "display"] },
    weight: {
      control: "select",
      options: ["medium", "inherit", "regular", "semibold", "bold"],
    },
    align: {
      control: "select",
      options: ["left", "right", "center", "inherit"],
    },
    truncate: { control: "boolean" },
    children: { control: "text" },
  },
  parameters: { componentName: "Text" },
} satisfies Meta<typeof Text>;
export default meta;
export const Preview: StoryObj = {
  name: "Пример",
  render: (args) => <Example name="Text" args={args} />,
};
