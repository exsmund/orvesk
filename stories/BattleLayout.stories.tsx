import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  ReactionBoard,
  ClashOutcome,
} from "../src/features/combat/ReactionBoard";
import { outcome, pub } from "./fixtures";

const meta = {
  title: "Проверки/Раскладка боя",
  parameters: { layout: "fullscreen" },
} satisfies Meta;
export default meta;

function LayoutDemo() {
  const [state, setState] = useState("planning");
  return (
    <div
      className="app combat-app"
      style={{
        height: "100dvh",
        width: "100%",
        position: "fixed",
        inset: 0,
        margin: "0 auto",
      }}
    >
      <header className="battle-header" style={{ flexShrink: 0 }}>
        <select
          aria-label="Состояние боя"
          value={state}
          onChange={(e) => setState(e.target.value)}
        >
          <option value="planning">Расстановка</option>
          <option value="result">Результат хода</option>
          <option value="victory">Победа</option>
          <option value="defeat">Поражение</option>
          <option value="draw">Ничья</option>
        </select>
      </header>
      <main style={{ display: "flex", flex: 1, minHeight: 0 }}>
        {state === "planning" ? (
          <ReactionBoard
            game={pub}
            session="layout-story"
            busy={false}
            onInspect={() => {}}
            onSubmit={async () => setState("result")}
          />
        ) : (
          <ClashOutcome
            turn={outcome}
            onDone={() => setState("planning")}
            ending={
              state === "victory"
                ? "К награде"
                : state === "result"
                  ? "К следующему раунду"
                  : "На карту"
            }
            result={
              state === "victory" || state === "defeat" || state === "draw"
                ? state
                : undefined
            }
          />
        )}
      </main>
    </div>
  );
}
export const Comparison: StoryObj<typeof meta> = {
  render: () => <LayoutDemo />,
};
