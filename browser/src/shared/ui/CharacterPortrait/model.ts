export interface CharacterPortraitProps {
  src: string;
  dead?: boolean;
  side?: "player" | "enemy";
  size?: "large" | "small";
  alt?: string;
  className?: string;
  label?: string;
  title?: string;
  onClick?: () => void;
  loading?: "lazy" | "eager";
}
