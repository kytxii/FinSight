import { lazy, Suspense, useState, useEffect } from "react";
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

function useIsMobile() {
  const [mobile, setMobile] = useState(() => window.innerWidth < 768);
  useEffect(() => {
    const handler = () => setMobile(window.innerWidth < 768);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return mobile;
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
