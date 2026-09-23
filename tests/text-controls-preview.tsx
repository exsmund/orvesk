// Isolated control preview: no game API or saved-character access.
import { useState } from "react";
import { createRoot } from "react-dom/client";
import { ArrowRight } from "lucide-react";
import { Modal } from "../src/shared/ui/Modal";
import { GothicTextButton } from "../src/shared/ui/GothicTextButton";
import "../src/app/styles/style.css";
import "../src/app/styles/ui-textures.css";
function Preview() {
  const [long, setLong] = useState(false),
    [open, setOpen] = useState(true);
  return open ? (
    <Modal title="Кнопки и ввод" close={() => setOpen(false)}>
      <div style={{ padding: 20 }}>
        <label>
          Имя
          <input className="gothic-text-input" placeholder="Имя персонажа" />
        </label>
        <div className="catalog-toolbar" style={{ padding: "20px 0" }}>
          <div className="segmented">
            {["Всё", "Оружие", "Щиты", "Одежда", "Украшения"].map((text) => (
              <GothicTextButton key={text}>{text}</GothicTextButton>
            ))}
          </div>
        </div>
        <GothicTextButton
          className="primary"
          style={{ width: "100%" }}
          onClick={() => setLong(!long)}
        >
          {long
            ? "Продолжить приключение с выбранным персонажем"
            : "Продолжить приключение"}
          <ArrowRight />
        </GothicTextButton>
      </div>
    </Modal>
  ) : (
    <p>Окно закрыто</p>
  );
}
createRoot(document.getElementById("root")!).render(<Preview />);
