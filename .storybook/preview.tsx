import { useKeyboardInputFocus } from "../src/shared/ui/useKeyboardInputFocus";
import type { ReactNode } from "react";
import type { Preview } from "@storybook/react-vite";
import { ComponentUsage } from "../stories/catalog";
import "../src/app/styles/style.css";
import "../src/features/characters/portraits.css";
import "../src/features/combat/combat-layout.css";
import "../src/features/combat/tactics.css";
import "../src/app/styles/ui-textures.css";
import "../stories/catalog.css";
function InputFocusProvider({ children }: { children: ReactNode }) {
  useKeyboardInputFocus();
  return <>{children}</>;
}
const preview: Preview = {
  parameters: { layout: "fullscreen" },
  decorators: [
    (Story, context) => (
      <InputFocusProvider>
        <div className="sb-canvas">
          {context.parameters.componentName && (
            <ComponentUsage name={context.parameters.componentName} />
          )}
          <div className="sb-example">
            <Story />
          </div>
        </div>
      </InputFocusProvider>
    ),
  ],
};
export default preview;
