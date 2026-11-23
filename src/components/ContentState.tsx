import type { ReactNode } from "react";
export function ContentState({
  loading,
  error,
  empty,
  retry,
  children,
}: {
  loading: boolean;
  error: Error | null;
  empty: boolean;
  retry: () => unknown;
  children: ReactNode;
}) {
  if (loading)
    return (
      <p className="notice" role="status">
        Cargando contenido…
      </p>
    );
  if (error)
    return (
      <div className="notice" role="alert">
        <p>{error.message}</p>
        <button
          onClick={() => {
            void retry();
          }}
        >
          Volver a intentar
        </button>
      </div>
    );
  if (empty)
    return (
      <p className="notice">Todavía no hay publicaciones en esta sección.</p>
    );
  return children;
}
