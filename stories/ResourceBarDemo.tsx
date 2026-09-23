import { useState } from "react";
import { ResourceBar } from "../src/shared/ui/ResourceBar";
import "../src/features/combat/tactics.css";
export function ResourceBarDemo({
  effect = "plasma",
}: {
  effect?: "plasma" | "smoke" | "flame";
}) {
  const [health, setHealth] = useState(8),
    [poise, setPoise] = useState(12);
  return (
    <div
      style={{
        width: "100%",
        maxWidth: 520,
        padding: 24,
        boxSizing: "border-box",
        background: "#131810",
        border: "1px solid #514932",
      }}
    >
      <p style={{ marginTop: 0, color: "#b9b49f" }}>
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
          background: "#1b211a",
          border: "1px solid #353c30",
        }}
      >
        <div className="combat-resources">
          <ResourceBar
            compact
            effect={effect}
            kind="health"
            value={health}
            max={12}
          />
          <ResourceBar
            compact
            effect={effect}
            kind="poise"
            value={poise}
            max={12}
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
        <button onClick={() => setPoise((v) => Math.max(0, v - 4))}>
          Стойка −4
        </button>
        <button
          onClick={() => {
            setHealth(12);
            setPoise(12);
          }}
        >
          Восстановить
        </button>
        <button
          onClick={() => {
            setHealth(0);
            setPoise(0);
          }}
        >
          Обнулить
        </button>
      </div>
    </div>
  );
}
