import { useState } from "react";
import { ResourceBar } from "@/shared/ui/ResourceBar/ResourceBar";

export function ResourceBarDemo({
  effect = "plasma",
  args = {},
}: {
  args?: Record<string, unknown>;
  effect?: "plasma" | "smoke" | "flame";
}) {
  const [health, setHealth] = useState(8),
    [stamina, setStamina] = useState(12);
  return (
    <div
      style={{
        width: "100%",
        maxWidth: 520,
        padding: 24,
        boxSizing: "border-box",
        background: "var(--color-background-page)",
        border: "1px solid var(--color-border-style-4)",
      }}
    >
      <p style={{ marginTop: 0, color: "var(--color-text-muted)" }}>
        {effect === "flame"
          ? "Пламя · вариант для сравнения"
          : effect === "smoke"
            ? "Дым · используется в игре"
            : "Плазма · вариант для сравнения"}
      </p>
      <div
        style={{
          width: "clamp(175px, 19vw, 230px)",
          maxWidth: "100%",
          padding: "17px 14px",
          boxSizing: "border-box",
          background: "var(--color-background-panel)",
          border: "1px solid var(--color-border-default)",
        }}
      >
        <div className="combat-resources">
          <ResourceBar
            compact
            effect={effect}
            kind="health"
            value={health}
            max={12}
            {...args}
          />
          <ResourceBar
            compact
            effect={effect}
            kind="stamina"
            value={stamina}
            max={12}
            {...args}
          />
        </div>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 24 }}>
        <button onClick={() => setHealth((v) => Math.max(0, v - 3))}>
          Урон −3
        </button>
        <button onClick={() => setHealth((v) => Math.min(12, v + 3))}>
          Лечение +3
        </button>
        <button onClick={() => setStamina((v) => Math.max(0, v - 4))}>
          Выносливость −4
        </button>
        <button
          onClick={() => {
            setHealth(12);
            setStamina(12);
          }}
        >
          Восстановить
        </button>
        <button
          onClick={() => {
            setHealth(0);
            setStamina(0);
          }}
        >
          Обнулить
        </button>
      </div>
    </div>
  );
}
