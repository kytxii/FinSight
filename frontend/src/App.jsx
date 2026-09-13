import { lazy, Suspense, useSyncExternalStore } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { AuthProvider } from "./context/AuthContext";
import ErrorBoundary from "./components/shared/ErrorBoundary";
import ProtectedRoute from "./components/shared/ProtectedRoute";
import { HOME_BG } from "./components/shared/categoryVisuals";
import Login from "./pages/Login";
import Register from "./pages/Register";

// Only one of these ever renders, and they're the two largest files in the
// app - Dashboard also being the only thing that pulls in recharts. Static
// imports meant a phone downloaded the whole desktop dashboard to render
// none of it, and vice versa (#170). Login/Register stay eager: they're the
// first paint for a logged-out visitor, so splitting them would just add a
// round trip to the critical path.
const Dashboard = lazy(() => import("./pages/Dashboard"));
const MobileDashboard = lazy(() => import("./pages/MobileDashboard"));

// The pages paint their own backgrounds and index.css sets none on body, so
// without this the chunk fetch flashes white on the way in.
function DashboardFallback() {
  return <div style={{ minHeight: "100dvh", backgroundColor: HOME_BG }} />;
}

const MOBILE_QUERY = "(max-width: 767px)";
// Long enough to swallow a drag that wobbles back and forth over the
// boundary, short enough that a deliberate resize or a tablet rotation still
// feels immediate.
const BREAKPOINT_SETTLE_MS = 250;

// Dashboard and MobileDashboard are separate trees, so every flip between
// them unmounts one and mounts the other from scratch - losing local state
// and re-fetching everything. Two things keep that from happening more than
// it has to (#184): matchMedia fires only when the breakpoint is actually
// crossed, where the old `resize` listener re-ran the check on every pixel
// of every drag; and the debounce means a drag that wobbles across 768px
// settles into a single swap instead of thrashing through several. State is
// still lost on a real crossing - preserving it needs the two dashboards
// unified first (#177), since they share no filter-state model today.
//
// Read through useSyncExternalStore rather than useState + useEffect: the
// viewport is external state that can change between render and effect
// commit, which the hook resolves by design instead of needing a catch-up
// write. `settledMobile` is module-level because the breakpoint is a
// property of the window, not of any one subscriber.
let settledMobile = null;

function getIsMobileSnapshot() {
  if (settledMobile === null) settledMobile = window.matchMedia(MOBILE_QUERY).matches;
  return settledMobile;
}

function subscribeToBreakpoint(onChange) {
  const mql = window.matchMedia(MOBILE_QUERY);
  let timer;

  const handler = () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      settledMobile = mql.matches;
      onChange();
    }, BREAKPOINT_SETTLE_MS);
  };

  mql.addEventListener("change", handler);
  return () => {
    clearTimeout(timer);
    mql.removeEventListener("change", handler);
  };
}

function useIsMobile() {
  return useSyncExternalStore(subscribeToBreakpoint, getIsMobileSnapshot);
}

function ResponsiveDashboard() {
  const isMobile = useIsMobile();
  return isMobile ? <MobileDashboard /> : <Dashboard />;
}

export default function App() {
  return (
    <>
      {/* Two levels on purpose: the inner one keeps a dashboard crash from
          taking the router with it, the outer one catches everything else
          (auth bootstrap, routing, the login pages). */}
      <ErrorBoundary>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    {/* Suspense sits inside the boundary on purpose: a chunk
                        that fails to load (offline, or a stale tab after a
                        deploy) throws, and the boundary turns that into the
                        recoverable "reload" screen rather than a blank page. */}
                    <ErrorBoundary>
                      <Suspense fallback={<DashboardFallback />}>
                        <ResponsiveDashboard />
                      </Suspense>
                    </ErrorBoundary>
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </ErrorBoundary>
      <Analytics />
      <SpeedInsights />
    </>
  );
}
