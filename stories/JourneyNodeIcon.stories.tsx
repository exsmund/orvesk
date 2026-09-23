import type { Meta, StoryObj } from "@storybook/react-vite";
import { JourneyNodeIcon } from "../src/features/journey/JourneyNodeIcon";
import type { JourneyNode } from "../src/game/journey/journey-map";
import "../src/features/journey/journey-screen.css";
const meta = {
  title: "Компоненты/Путешествие/JourneyNodeIcon",
  component: JourneyNodeIcon,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "Используется в JourneyMap на карте путешествия. Все варианты ниже отрисованы тем же компонентом, что и в игре. На доступных значках можно проверить наведение, нажатие и фокус с клавиатуры (Tab).",
      },
    },
  },
  args: {
    node: { id: "fight-1", kind: "fight", stage: 1, name: "Бой", x: 50, y: 50 },
    status: "Можно идти",
    available: true,
  },
  decorators: [
    (Story) => (
      <div
        className="journey-screen"
        style={{
          position: "relative",
          inset: "auto",
          overflow: "visible",
          minHeight: 180,
        }}
      >
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof JourneyNodeIcon>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Playground: Story = { name: "Интерактивный значок" };
export const AllStates: Story = {
  name: "Все виды и состояния",
  render: () => {
    const kinds: JourneyNode[] = [
      { id: "battle", kind: "fight", stage: 1, name: "Бой", x: 50, y: 55 },
      {
        id: "champion",
        kind: "fight",
        stage: 5,
        name: "Босс",
        x: 50,
        y: 55,
      },
      { id: "camp", kind: "camp", stage: 1, name: "Костёр", x: 50, y: 55 },
      { id: "forge", kind: "forge", stage: 1, name: "Кузница", x: 50, y: 55 },
    ];
    const states = [
      { status: "Недоступно" },
      { status: "Можно идти", available: true },
      { status: "Вы здесь", current: true, visited: true },
      { status: "Пройдено", visited: true, past: true },
      { status: "Пропущенный путь", past: true },
      { status: "Ожидание запроса", available: true, busy: true },
    ];
    return (
      <div style={{ padding: 20 }}>
        <p>
          Используется в JourneyMap. Наведение, нажатие и клавиатурный фокус
          доступны на активных значках.
        </p>
        {kinds.map((node) => (
          <section key={node.id}>
            <h2>{node.name}</h2>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                gap: 12,
              }}
            >
              {states.map((state) => (
                <div
                  key={state.status}
                  style={{
                    position: "relative",
                    height: 150,
                    textAlign: "center",
                  }}
                >
                  <small>{state.status}</small>
                  <JourneyNodeIcon node={node} {...state} />
                </div>
              ))}
            </div>
          </section>
        ))}
        <h2>Повторное открытие</h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 12,
          }}
        >
          {["Продолжить бой", "Повторить бой", "Вернуться в кузницу"].map(
            (label, i) => (
              <div
                key={label}
                style={{
                  position: "relative",
                  height: 170,
                  textAlign: "center",
                }}
              >
                <small>{label}</small>
                <JourneyNodeIcon
                  node={kinds[i === 2 ? 3 : 0]}
                  available
                  current
                  visited
                  status={label}
                  label={i === 2 ? undefined : label}
                />
              </div>
            ),
          )}
        </div>
      </div>
    );
  },
};

export const LostSouls: Story = {
  name: "Потерянные души у противника",
  args: { lostSouls: 17, available: false, status: "Недоступно" },
};
