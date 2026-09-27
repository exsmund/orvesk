import { Text } from "@/shared/ui/Text";
import "@/shared/ui/Modal/ModalHeader.css";

import { GothicIcon } from "@/shared/ui/GothicIcon/GothicIcon";
import { useModalPageScroll } from "@/shared/ui/Modal/useModalPageScroll";

import { ModalHeaderProps } from "@/shared/ui/Modal/ModalHeader.types";
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
      <Text as="h2" font="display" weight="regular" id={titleId}>
        {title}
      </Text>
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
