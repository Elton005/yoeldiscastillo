import {
  createContext,
  lazy,
  Suspense,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { useAuth } from "./AuthProvider";
const Form = lazy(() =>
  import("./AuthForm").then((module) => ({ default: module.AuthForm })),
);
const Dialogs = createContext({ openAuth: () => {} });
export const useAuthDialogs = () => useContext(Dialogs);
export function AuthDialogsProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const close = useCallback(() => setOpen(false), []);
  useEffect(() => {
    setOpen(false);
  }, [user?.id]);
  return (
    <Dialogs value={{ openAuth: () => setOpen(true) }}>
      {children}
      {open &&
        createPortal(
          <Suspense fallback={null}>
            <Form onClose={close} />
          </Suspense>,
          document.body,
        )}
    </Dialogs>
  );
}
