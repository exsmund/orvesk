import "@/shared/ui/Text/Text.css";
import type { ComponentPropsWithRef, ElementType } from "react";
import type { TextOptions } from "@/shared/ui/Text/model";
export type TextProps<T extends ElementType = "span"> = TextOptions & {
  as?: T;
} & Omit<ComponentPropsWithRef<T>, keyof TextOptions | "as" | "color">;
/** Semantic typography. Inherited variants preserve nested and responsive control text. */
export function Text<T extends ElementType = "span">({
  as,
  size = "inherit",
  color = "inherit",
  font = "inherit",
  weight = "inherit",
  align = "inherit",
  truncate = false,
  className = "",
  ...props
}: TextProps<T>) {
  const Tag = as || "span";
  return (
    <Tag
      {...props}
      className={[
        "text",
        size !== "inherit" && "text--size-" + size,
        color !== "inherit" && "text--color-" + color,
        font !== "inherit" && "text--font-" + font,
        weight !== "inherit" && "text--weight-" + weight,
        align !== "inherit" && "text--align-" + align,
        truncate && "text--truncate",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    />
  );
}
