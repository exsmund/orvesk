import "@/app/styles/style.css";
import React from "react";
import { cssColor } from "@/shared/lib/css-color";
import { createRoot } from "react-dom/client";
import { App } from "@/app/App/App";

document
  .querySelector('meta[name="theme-color"]')
  ?.setAttribute("content", cssColor("--color-background-page"));

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
