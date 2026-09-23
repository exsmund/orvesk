import "./modal-content.css";
import { useModalPageScroll } from "./useModalPageScroll";
import { GothicIcon } from "./GothicIcon";
import "./modal-header.css";
interface ModalHeaderProps {
  title: string;
  titleId?: string;
  onClose?: () => void;
  onBack?: () => void;
  disabled?: boolean;
  closeLabel?: string;
  backLabel?: string;
}
export function ModalHeader({
  title,
  titleId,
  onClose,
  onBack,
  disabled = false,
  closeLabel = "Закрыть",
  backLabel = "Назад",
}: ModalHeaderProps) {
  const scrollRef = useModalPageScroll();
  return (
    <header ref={scrollRef} className="modal-header">
      {onBack && (
        <button
          type="button"
          className="gothic-button modal-header-back"
          disabled={disabled}
          aria-label={backLabel}
          onClick={onBack}
        >
          <GothicIcon icon="left" />
        </button>
      )}
      <h2 id={titleId}>{title}</h2>
      {onClose && (
        <button
          type="button"
          className="gothic-button modal-header-close"
          disabled={disabled}
          aria-label={closeLabel}
          onClick={onClose}
        >
          <GothicIcon icon="close" />
        </button>
      )}
    </header>
  );
}
