import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { db } from "../lib/supabase";
import { useAuth } from "../auth/AuthProvider";
import { safeNext } from "../auth/actions";
import { AuthForm } from "../auth/AuthForm";
import { Home } from "./PublicPages";

export default function Access() {
  const navigate = useNavigate();
  const close = useCallback(() => navigate("/"), [navigate]);
  return (
    <>
      <Home />
      <AuthForm onClose={close} />
    </>
  );
}
export function AuthCallback() {
  const [message, setMessage] = useState("Verificando tu sesión…");
  const navigate = useNavigate();
  const { refresh } = useAuth();
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void (async () => {
      try {
        const result = await db().auth.getSession();
        if (result.error || !result.data.session) throw new Error();
        const {
          data: { user },
          error,
        } = await db().auth.getUser();
        if (error || !user) throw new Error();
        await refresh();
        const next = safeNext(sessionStorage.getItem("auth-next"));
        sessionStorage.removeItem("auth-next");
        window.history.replaceState({}, "", "/auth/callback");
        navigate(next === "/" ? "/acceso" : next, { replace: true });
      } catch {
        setMessage("No se pudo verificar el acceso. Vuelve a iniciar sesión.");
      }
    })();
  }, [navigate, refresh]);
  return (
    <section className="contacto-page">
      <div className="container">
        <div className="contacto-card">
          <h1 className="contacto__title">Acceso</h1>
          <p role="status">{message}</p>
          <Link className="btn btn--outline" to="/acceso">
            Volver a iniciar sesión
          </Link>
        </div>
      </div>
    </section>
  );
}
