import { ResourceBarDemo } from "./ResourceBarDemo";
export default {
  title: "Компоненты/Общие/ResourceBar",
  parameters: { componentName: "ResourceBar" },
};
export const Smoke = {
  name: "Дым — используется в игре",
  render: () => <ResourceBarDemo effect="smoke" />,
};

export const Flame = {
  name: "Пламя — вариант для сравнения",
  render: () => <ResourceBarDemo effect="flame" />,
};
