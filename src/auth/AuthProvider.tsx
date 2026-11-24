import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  useRef,
  type ReactNode,
} from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import { useQueryClient } from "@tanstack/react-query";
import { recoverIdentity } from "./session";
import { clearAuthNext } from "./actions";
type AuthSnapshot = {
  user: User | null;
  role: "admin" | "editor" | null;
  loading: boolean;
  status: "initializing" | "authenticated" | "unauthenticated" | "error";
  error: {
    kind: "session" | "permissions" | "configuration";
    message: string;
  } | null;
};
const anonymous: AuthSnapshot = {
  user: null,
  role: null,
  loading: false,
  status: "unauthenticated",
  error: null,
};
const initial: AuthSnapshot = {
  ...anonymous,
  loading: true,
  status: "initializing",
};
type AuthState = AuthSnapshot & { refresh: () => Promise<void> };
const AuthContext = createContext<AuthState>({
  ...initial,
  refresh: async () => {},
});
export const useAuth = () => useContext(AuthContext);
export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthSnapshot>(initial);
  const cache = useQueryClient();
  const verifiedIdentity = useRef<string | null>(null);
  const verificationVersion = useRef(0);
  const clearPrivateCache = useCallback(
    () =>
      cache.removeQueries({
        predicate: (query) => query.queryKey.includes("admin"),
      }),
    [cache],
  );
  const refresh = useCallback(async () => {
    const version = ++verificationVersion.current;
    if (!verifiedIdentity.current)
      setState((s) => ({
        ...s,
        loading: true,
        status: "initializing",
        error: null,
      }));
    let user: User | null = null;
    try {
      if (!supabase) {
        setState({
          ...anonymous,
          status: "error",
          error: {
            kind: "configuration",
            message: "La conexión de acceso no está configurada.",
          },
        });
        return;
      }
      user = await recoverIdentity();
      if (version !== verificationVersion.current) return;
      if (!user) {
        verifiedIdentity.current = null;
        clearPrivateCache();
        setState(anonymous);
        return;
      }
      const { data, error } = await supabase.rpc("current_editor_role");
      if (version !== verificationVersion.current) return;
      if (error || (data !== null && data !== "admin" && data !== "editor")) {
        verifiedIdentity.current = null;
        clearPrivateCache();
        setState({
          user,
          role: null,
          loading: false,
          status: "error",
          error: {
            kind: "permissions",
            message:
              error?.code === "PGRST202"
                ? "El servicio de permisos no está configurado correctamente. Contacta con la administración."
                : "No se pudieron verificar los permisos de tu cuenta. Reintenta sin volver a iniciar sesión.",
          },
        });
        return;
      }
      verifiedIdentity.current = user.id;
      if (!data) clearPrivateCache();
      setState({
        user,
        role: data,
        loading: false,
        status: "authenticated",
        error: null,
      });
    } catch {
      if (version !== verificationVersion.current) return;
      verifiedIdentity.current = null;
      clearPrivateCache();
      setState({
        user,
        role: null,
        loading: false,
        status: "error",
        error: {
          kind: user ? "permissions" : "session",
          message: user
            ? "No se pudieron verificar los permisos de tu cuenta. Reintenta sin volver a iniciar sesión."
            : "No se pudo recuperar tu sesión. Reintenta o vuelve a iniciar sesión.",
        },
      });
    }
  }, [clearPrivateCache]);
  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    void refresh();
    const subscription = supabase?.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      if (event === "SIGNED_OUT") {
        clearTimeout(timer);
        ++verificationVersion.current;
        verifiedIdentity.current = null;
        clearAuthNext();
        setState(anonymous);
        clearPrivateCache();
        return;
      }
      if (!session || session.user.id !== verifiedIdentity.current) {
        ++verificationVersion.current;
        verifiedIdentity.current = null;
        setState(initial);
        clearPrivateCache();
      }
      // Keep Auth methods outside the SDK callback lock, coalesce events, and
      // cancel scheduled work on logout/unmount (including StrictMode mounts).
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (active) void refresh();
      }, 0);
    });
    return () => {
      active = false;
      clearTimeout(timer);
      ++verificationVersion.current;
      subscription?.data.subscription.unsubscribe();
    };
  }, [clearPrivateCache, refresh]);
  return <AuthContext value={{ ...state, refresh }}>{children}</AuthContext>;
}
