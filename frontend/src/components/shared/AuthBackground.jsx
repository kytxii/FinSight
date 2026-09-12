import { HOME_BG, ACCENT } from "./categoryVisuals";
import Plasma from "./Plasma";

// Shared full-screen backdrop for Login/Register (#135, redesigned #163 -
// no dots, no grid, no radial glow). A plasma raymarch effect (see Plasma)
// tinted to the brand jade, over a solid dark base - the base is also the
// fallback if WebGL2 is unavailable.

export default function AuthBackground() {
  return (
    <div style={{ position: "fixed", inset: 0, overflow: "hidden", zIndex: 0, backgroundColor: HOME_BG }}>
      <Plasma
        color={ACCENT}
        speed={0.5}
        scale={1.1}
        opacity={0.6}
        mouseInteractive={false}
        iterations={20}
        renderScale={0.35}
        maxDpr={1}
        targetFps={30}
      />
    </div>
  );
}
