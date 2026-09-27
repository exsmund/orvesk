export type TextSize =
  "inherit" | "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | "3xl";
export type TextColor =
  | "inherit"
  | "primary"
  | "muted"
  | "accent"
  | "highlight"
  | "danger"
  | "success"
  | "inverse"
  | "home";
export type TextFont = "inherit" | "body" | "display";
export type TextWeight = "inherit" | "regular" | "medium" | "semibold" | "bold";
export type TextAlign = "inherit" | "left" | "center" | "right";
export interface TextOptions {
  size?: TextSize;
  color?: TextColor;
  font?: TextFont;
  weight?: TextWeight;
  align?: TextAlign;
  truncate?: boolean;
}
