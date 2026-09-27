import "./palette.css";
import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import palette from "@/app/styles/palette.css?raw";

// Read the source of truth, so new tokens appear without maintaining a second list.
const colors = Array.from(
  palette.matchAll(/(--color-[\w-]+):\s*([^;]+);/g),
  ([, name, value]) => ({ name, value }),
);
const groups = [
  ["text", "Текст"],
  ["background", "Фон"],
  ["border", "Границы и обводки"],
  ["shadow", "Тени"],
  ["effect", "Эффекты и материалы"],
  ["base", "Базовые цвета"],
] as const;
function Palette() {
  const [query, setQuery] = useState("");
  const visible = colors.filter(({ name, value }) =>
    `${name} ${value} ${groups.find(([group]) => name.startsWith(`--color-${group}-`))?.[1] ?? ""}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  return (
    <section className="sb-palette">
      <h1>Цветовая палитра</h1>
      <p>
        Единый источник цветов — src/app/styles/palette.css. {colors.length}{" "}
        переменных, включая полупрозрачные оттенки, цвета эффектов и освещения
        кубиков.
      </p>
      <label className="sb-palette-search">
        Поиск по имени или значению
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          type="search"
        />
      </label>
      <p role="status">Показано: {visible.length}</p>
      {groups.map(([group, label]) => {
        const tokens = visible.filter(({ name }) =>
          name.startsWith(`--color-${group}-`),
        );
        if (!tokens.length) return null;
        return (
          <section className="sb-palette-group" key={group}>
            <h2>
              {label} · {tokens.length}
            </h2>
            <div className="sb-palette-grid">
              {tokens.map(({ name, value }) => (
                <article className="sb-palette-token" key={name}>
                  <div className="sb-palette-checker">
                    <div
                      className="sb-palette-swatch"
                      style={{ background: `var(${name})` }}
                    />
                  </div>
                  <code>{name}</code>
                  <span>{value}</span>
                </article>
              ))}
            </div>
          </section>
        );
      })}
    </section>
  );
}
const meta = {
  title: "Дизайн/Цветовая палитра",
  component: Palette,
} satisfies Meta<typeof Palette>;
export default meta;
type Story = StoryObj<typeof meta>;
export const AllColors: Story = { name: "Все цвета" };
