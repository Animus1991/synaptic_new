import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import "@fontsource/playfair-display/400.css";
import "@fontsource/playfair-display/700.css";
import "@fontsource/playfair-display/700-italic.css";
import "@fontsource/jetbrains-mono/400.css";
import "@fontsource/jetbrains-mono/500.css";
import "@fontsource/lora/400.css";
import "@fontsource/lora/500.css";
import "@fontsource/lora/600.css";
import "@fontsource/nunito-sans/400.css";
import "@fontsource/nunito-sans/600.css";
import "@fontsource/nunito-sans/700.css";
import App from "./App";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { initThemeEarly } from "./lib/theme";
import { clearChunkReloadFlags } from "./lib/lazyWithRetry";
import { initSentry } from "./lib/sentryInit";
import { IconContext } from "@phosphor-icons/react";
import { LazyMotion, MotionConfig, domAnimation } from "framer-motion";

clearChunkReloadFlags();
void initSentry();

initThemeEarly();

// Apply the warm-bento editorial theme globally (was workspace-scoped only).
// Every page inherits the calmer Warm Sand tokens + Lora/Nunito Sans.
if (typeof document !== 'undefined') {
  document.documentElement.setAttribute('data-ws-theme', 'warm');
}


createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <MotionConfig reducedMotion="user">
        <LazyMotion features={domAnimation}>
          <IconContext.Provider value={{ weight: "thin", mirrored: false }}>
            <App />
          </IconContext.Provider>
        </LazyMotion>
      </MotionConfig>
    </ErrorBoundary>
  </StrictMode>,
);
