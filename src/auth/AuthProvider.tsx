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
type AuthState = {
  user: User | null;
  role: "admin" | "editor" | null;
  loading: boolean;
  refresh: () => Promise<void>;
};
const AuthContext = createContext<AuthState>({
  user: null,
  role: null,
  loading: true,
  refresh: async () => {},
});
export const useAuth = () => useContext(AuthContext);
export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Omit<AuthState, "refresh">>({
    user: null,
    role: null,
    loading: true,
  });
  const cache = useQueryClient();
  const verifiedIdentity = useRef<string | null>(null);
  const verificationVersion = useRef(0);
  const refresh = useCallback(async () => {
    const version = ++verificationVersion.current;
    try {
      if (!supabase) {
        verifiedIdentity.current = null;
        setState({ user: null, role: null, loading: false });
        return;
      }
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();
      if (version !== verificationVersion.current) return;
      if (error || !user) {
        verifiedIdentity.current = null;
        cache.removeQueries({
          predicate: (query) => query.queryKey.includes("admin"),
        });
        setState({ user: null, role: null, loading: false });
        return;
      }
      const { data, error: roleError } = await supabase.rpc(
        "current_editor_role",
      );
      if (version !== verificationVersion.current) return;
      verifiedIdentity.current = user.id;
      if (roleError || !["admin", "editor"].includes(data))
        cache.removeQueries({
          predicate: (query) => query.queryKey.includes("admin"),
        });
      setState({
        user,
        role:
          !roleError && (data === "admin" || data === "editor") ? data : null,
        loading: false,
      });
    } catch {
      if (version !== verificationVersion.current) return;
      verifiedIdentity.current = null;
      cache.removeQueries({
        predicate: (query) => query.queryKey.includes("admin"),
      });
      setState({ user: null, role: null, loading: false });
    }
  }, [cache]);
  useEffect(() => {
    void refresh();
    // Do not call Auth methods synchronously inside the Auth callback (lock contention).
    const subscription = supabase?.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        ++verificationVersion.current;
        verifiedIdentity.current = null;
        setState({ user: null, role: null, loading: false });
        cache.removeQueries({
          predicate: (query) => query.queryKey.includes("admin"),
        });
        return;
      }
      // Preserve a verified same-user editor during token refresh or cross-tab events.
      // Every mutation still revalidates the user and server role; changed identities fail closed.
      if (!session || session.user.id !== verifiedIdentity.current) {
        ++verificationVersion.current;
        verifiedIdentity.current = null;
        setState({ user: null, role: null, loading: true });
        cache.removeQueries({
          predicate: (query) => query.queryKey.includes("admin"),
        });
      }
      setTimeout(() => {
        void refresh();
      }, 0);
    });
    return () => {
      ++verificationVersion.current;
      subscription?.data.subscription.unsubscribe();
    };
  }, [cache, refresh]);
  return <AuthContext value={{ ...state, refresh }}>{children}</AuthContext>;
}
