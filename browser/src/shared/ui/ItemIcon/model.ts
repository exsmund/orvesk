import type { ReactNode } from "react";

export interface ItemIconProps {
  children?: ReactNode;
  size?: number | string;
  className?: string;
  framed?: boolean;
}
