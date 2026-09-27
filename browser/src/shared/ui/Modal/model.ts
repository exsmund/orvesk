import { type ReactNode } from "react";
export type ModalSize = "small" | "medium" | "large";
export interface ModalProps {
  title: string;
  children: ReactNode;
  close?: () => void;
  className?: string;
  size?: ModalSize;
  onBack?: () => void;
  disabled?: boolean;
  closeLabel?: string;
  backLabel?: string;
  titleId?: string;
  showClose?: boolean;
  closeOnBackdrop?: boolean;
  portal?: boolean;
  variant?: "standard" | "bare";
}
