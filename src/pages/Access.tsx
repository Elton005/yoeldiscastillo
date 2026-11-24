import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { clearAuthNext, readAuthNext } from "../auth/actions";
import { recoverIdentity } from "../auth/session";
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
  const [retryNext, setRetryNext] = useState("/");
  const navigate = useNavigate();
  const { refresh } = useAuth();
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    // Match the prerendered document first; read browser-only intent after
    // hydration rather than rendering a different href from local storage.
    setRetryNext(readAuthNext());
    void (async () => {
      try {
        const user = await recoverIdentity(true);
        if (!user) throw new Error();
        await refresh();
        const next = readAuthNext();
        clearAuthNext();
        window.history.replaceState(
          window.history.state,
          "",
          `${import.meta.env.BASE_URL}auth/callback`,
        );
        navigate(next === "/" ? "/acceso" : next, { replace: true });
      } catch {
        // No raw provider errors, authorization codes or session details.
        window.history.replaceState(
          window.history.state,
          "",
          `${import.meta.env.BASE_URL}auth/callback`,
        );
        setMessage(
          "No se pudo verificar el acceso. Reinicia el acceso en este mismo navegador y dominio www.",
        );
      }
    })();
  }, [navigate, refresh]);
  return (
    <section className="contacto-page">
      <div className="container">
        <div className="contacto-card">
          <h1 className="contacto__title">Acceso</h1>
          <p role="status">{message}</p>
          <Link
            className="btn btn--outline"
            to={`/acceso?next=${encodeURIComponent(retryNext)}`}
          >
            Volver a iniciar sesión
          </Link>
        </div>
      </div>
    </section>
  );
}
