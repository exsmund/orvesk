import "../stories/catalog.css";
import "@/app/styles/style.css";
import { useKeyboardInputFocus } from "@/shared/ui/useKeyboardInputFocus";
import type { ReactNode } from "react";
import type { Preview } from "@storybook/react-vite";
import { ComponentUsage } from "../stories/catalog";

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
