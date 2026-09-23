import { useState } from "react";
import { Modal } from "../src/shared/ui/Modal";
import { ModalFooter } from "../src/shared/ui/ModalFooter";
import { GothicTextButton } from "../src/shared/ui/GothicTextButton";
import { GothicIcon } from "../src/shared/ui/GothicIcon";
import { SoulBalance } from "../src/features/characters/SoulBalance";
import { portrait } from "../src/game/characters/portraits";
export default { title: "Состояния интерфейса" };
export const TextInput = {
  name: "Поле ввода",
  render: () => (
    <div style={{ maxWidth: 410 }}>
      <input
        aria-label="Имя персонажа"
        className="gothic-text-input"
        placeholder="Имя персонажа"
      />
      <input
        aria-label="Недоступное поле"
        className="gothic-text-input"
        placeholder="Недоступно"
        disabled
      />
    </div>
  ),
};
export const Portrait = {
  name: "Рамка портрета",
  render: () => (
    <span className="portrait-frame" style={{ width: 240 }}>
      <img
        className="identity-portrait"
        src={portrait().src}
        alt="Портрет персонажа"
      />
    </span>
  ),
};
export const DisabledIcons = {
  name: "Недоступные кнопки",
  parameters: { componentName: "GothicIcon" },
  render: () => (
    <div className="sb-row">
      {(
        ["menu", "left", "right", "close", "plus", "minus", "grave"] as const
      ).map((icon) => (
        <button key={icon} className="gothic-button" disabled aria-label={icon}>
          <GothicIcon icon={icon} />
        </button>
      ))}
    </div>
  ),
};
function Sizes() {
  const [size, set] = useState<"small" | "medium" | "large" | null>(null);
  return (
    <>
      <div className="sb-row">
        {(["small", "medium", "large"] as const).map((s) => (
          <GothicTextButton key={s} onClick={() => set(s)}>
            {s}
          </GothicTextButton>
        ))}
      </div>
      {size && (
        <Modal title={`Размер: ${size}`} size={size} close={() => set(null)}>
          <p style={{ padding: 24 }}>
            На телефоне все размеры раскрываются на весь экран.
          </p>
          <ModalFooter
            hint={
              <>
                Распределите оставшиеся: <SoulBalance amount={3} />
              </>
            }
          >
            <GothicTextButton onClick={() => set(null)}>
              Готово
            </GothicTextButton>
          </ModalFooter>
        </Modal>
      )}
    </>
  );
}
export const ModalSizes = {
  name: "Размеры модалок и общий футер",
  parameters: { componentName: "Modal" },
  render: () => <Sizes />,
};
