export interface ModalHeaderProps {
  title: string;
  titleId?: string;
  onClose?: () => void;
  onBack?: () => void;
  disabled?: boolean;
  closeLabel?: string;
  backLabel?: string;
}
