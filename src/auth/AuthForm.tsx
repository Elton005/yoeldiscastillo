import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { db, supabase } from "../lib/supabase";
import { useAuth } from "./AuthProvider";
import { googleLogin, safeNext } from "./actions";
import { useDialog } from "../hooks/useDialog";
import { Icon } from "../components/Icon";

const credentials = z.object({
  email: z.email("Escribe un correo válido."),
  password: z.string().min(6, "Usa al menos 6 caracteres."),
  nombre: z.string().max(150),
});
export function AuthForm({ onClose }: { onClose: () => void }) {
  const [registering, setRegistering] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const { user, role, loading } = useAuth();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const ref = useDialog(onClose);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<typeof credentials>>({
    resolver: zodResolver(credentials),
    defaultValues: { email: "", password: "", nombre: "" },
  });
  const next = safeNext(params.get("next"));
  useEffect(() => {
    if (user && !loading && params.has("next"))
      navigate(next, { replace: true });
  }, [user, loading, navigate, next, params]);
  return (
    <div
      id="modalAuth"
      className="modal-auth"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-heading"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="modal-auth__content" ref={ref}>
        <button
          className="modal-auth__close"
          aria-label="Cerrar acceso"
          onClick={onClose}
        >
          <Icon name="times" />
        </button>
        {user ? (
          <div className="modal-auth__form account-profile">
            <div className="profile-avatar-circle">
              <Icon name="user" />
            </div>
            <h3 id="auth-heading">Mi cuenta</h3>
            <p>{user.email}</p>
            <div className="modal-auth__divider">
              <span>¿Necesitas ayuda?</span>
            </div>
            <p>
              ¿Tienes preguntas sobre los libros o quieres colaborar? Escríbeme
              directamente.
            </p>
            <Link
              to="/contacto.html"
              onClick={onClose}
              className="btn btn--solid full"
            >
              <Icon name="envelope" /> Enviar mensaje
            </Link>
            {role && (
              <Link
                to="/admin.html"
                onClick={onClose}
                className="btn btn--solid full"
              >
                Entrar al panel
              </Link>
            )}
            <button
              className="btn btn--outline full"
              onClick={() => {
                void db()
                  .auth.signOut()
                  .then(({ error }) => {
                    if (error) setMessage("No se pudo cerrar sesión.");
                  });
              }}
            >
              <Icon name="sign-out-alt" /> Cerrar sesión
            </button>
          </div>
        ) : (
          <>
            <button
              className="btn btn--outline google-button"
              disabled={busy || !supabase}
              onClick={() => {
                setBusy(true);
                setMessage("");
                void googleLogin(next).catch(() => {
                  setMessage(
                    "No se pudo iniciar el acceso con Google. Inténtalo de nuevo.",
                  );
                  setBusy(false);
                });
              }}
            >
              <Icon name="google" brand /> Continuar con Google
            </button>
            <div className="modal-auth__divider">
              <span>o continúa con</span>
            </div>
            <div className="modal-auth__tabs">
              <button
                className={`modal-auth__tab${!registering ? " active" : ""}`}
                onClick={() => {
                  setRegistering(false);
                  setMessage("");
                }}
              >
                Iniciar Sesión
              </button>
              <button
                className={`modal-auth__tab${registering ? " active" : ""}`}
                onClick={() => {
                  setRegistering(true);
                  setMessage("");
                }}
              >
                Registrarse
              </button>
            </div>
            <form
              id={registering ? "formRegistro" : "formLogin"}
              className="modal-auth__form"
              onSubmit={handleSubmit(async (values) => {
                setMessage("");
                try {
                  const result = registering
                    ? await db().auth.signUp({
                        email: values.email,
                        password: values.password,
                        options: {
                          data: { nombre: values.nombre },
                          emailRedirectTo: `${window.location.origin}/auth/callback`,
                        },
                      })
                    : await db().auth.signInWithPassword({
                        email: values.email,
                        password: values.password,
                      });
                  if (result.error) throw result.error;
                  if (registering)
                    setMessage(
                      "Solicitud enviada. Si procede, recibirás un correo para confirmar tu cuenta.",
                    );
                } catch {
                  setMessage(
                    "No se pudo completar el acceso. Revisa tus datos y vuelve a intentarlo.",
                  );
                }
              })}
            >
              <h3 id="auth-heading">
                {registering ? "Crea tu cuenta" : "Bienvenido de vuelta"}
              </h3>
              {registering && (
                <>
                  <label className="visually-hidden" htmlFor="registroNombre">
                    Nombre
                  </label>
                  <input
                    id="registroNombre"
                    className="admin-input"
                    placeholder="Tu nombre"
                    autoComplete="name"
                    {...register("nombre")}
                  />
                </>
              )}
              <label className="visually-hidden" htmlFor="loginEmail">
                Correo electrónico
              </label>
              <input
                id="loginEmail"
                className="admin-input"
                placeholder="Tu correo electrónico"
                autoComplete="email"
                type="email"
                {...register("email")}
              />
              {errors.email && (
                <p className="field-error">{errors.email.message}</p>
              )}
              <label className="visually-hidden" htmlFor="loginPassword">
                Contraseña
              </label>
              <input
                id="loginPassword"
                className="admin-input"
                placeholder={
                  registering ? "Contraseña (mín. 6 caracteres)" : "Contraseña"
                }
                autoComplete={registering ? "new-password" : "current-password"}
                type="password"
                {...register("password")}
              />
              {errors.password && (
                <p className="field-error">{errors.password.message}</p>
              )}
              <button
                className="btn btn--solid auth-submit"
                disabled={isSubmitting || !supabase}
              >
                <Icon name={registering ? "user-plus" : "sign-in-alt"} />
                {isSubmitting
                  ? "Procesando…"
                  : registering
                    ? "Registrarse"
                    : "Iniciar Sesión"}
              </button>
            </form>
          </>
        )}
        {!supabase && (
          <p className="notice" role="alert">
            La conexión todavía no está configurada.
          </p>
        )}
        {message && (
          <p className="notice" role="status">
            {message}
          </p>
        )}
      </div>
    </div>
  );
}
