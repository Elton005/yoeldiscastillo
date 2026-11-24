import { lazy, Suspense, useEffect, useRef } from "react";
import { Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { authReturnDetected } from "./lib/supabase";
import { Layout } from "./components/Layout";
import { Seo } from "./components/Seo";
import {
  About,
  Articles,
  Books,
  Contact,
  Detail,
  Home,
  NotFound,
} from "./pages/PublicPages";
const Admin = lazy(() => import("./admin/Admin"));
const Access = lazy(() => import("./pages/Access"));
const Callback = lazy(() =>
  import("./pages/Access").then((module) => ({ default: module.AuthCallback })),
);
function OAuthLanding() {
  const navigate = useNavigate();
  const handled = useRef(false);
  useEffect(() => {
    if (handled.current) return;
    handled.current = true;
    // Also recover a provider fallback to Site URL or a legacy /admin.html
    // return. Run after hydration; the SDK remains the only PKCE-code owner.
    if (
      authReturnDetected &&
      !/\/auth\/callback\/?$/.test(window.location.pathname)
    )
      navigate("/auth/callback", { replace: true });
  }, [navigate]);
  return null;
}
export function App() {
  return (
    <>
      <OAuthLanding />
      <Seo />
      <Suspense
        fallback={
          <p className="container notice" role="status">
            Cargando página…
          </p>
        }
      >
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="index.html" element={<Navigate to="/" replace />} />
            <Route path="sobre-mi.html" element={<About />} />
            <Route path="libros.html" element={<Books />} />
            <Route path="articulos.html" element={<Articles />} />
            <Route path="contacto.html" element={<Contact />} />
            <Route path="libros/:id" element={<Detail table="libros" />} />
            <Route
              path="articulos/:id"
              element={<Detail table="articulos" />}
            />
            <Route path="acceso" element={<Access />} />
            <Route path="auth/callback" element={<Callback />} />
            <Route path="admin.html" element={<Admin />} />
            <Route path="admin/*" element={<Admin />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </Suspense>
    </>
  );
}
