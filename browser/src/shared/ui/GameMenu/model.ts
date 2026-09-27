export interface GameMenuProps {
  busy: boolean;
  onClose: () => void;
  onHome: () => void;
  onRules: () => void;
  onMap?: () => void;
}
