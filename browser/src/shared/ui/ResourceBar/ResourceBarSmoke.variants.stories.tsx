import { ResourceBarDemo } from "../../../../stories/ResourceBarDemo";
import meta from "@/shared/ui/ResourceBar/ResourceBar.stories";
export default {
  ...meta,
  title: "src/shared/ui/ResourceBar/Варианты",
  parameters: { componentName: "ResourceBar" },
};
export const Smoke = {
  name: "Дым — используется в игре",
  render: (args: Record<string, unknown>) => (
    <ResourceBarDemo effect="smoke" args={args} />
  ),
};

export const Flame = {
  name: "Пламя — вариант для сравнения",
  render: (args: Record<string, unknown>) => (
    <ResourceBarDemo effect="flame" args={args} />
  ),
};
