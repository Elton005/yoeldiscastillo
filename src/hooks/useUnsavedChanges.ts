import { useEffect } from "react";

const leaveEvent = "editorial:before-leave";
export function confirmLeave() {
  return window.dispatchEvent(new Event(leaveEvent, { cancelable: true }));
}
export function useUnsavedChanges(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return;
    const unload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    const leave = (event: Event) => {
      if (
        !event.defaultPrevented &&
        !window.confirm(
          "Hay cambios sin guardar. ¿Quieres salir y descartarlos?",
        )
      )
        event.preventDefault();
    };
    window.addEventListener("beforeunload", unload);
    window.addEventListener(leaveEvent, leave);
    return () => {
      window.removeEventListener("beforeunload", unload);
      window.removeEventListener(leaveEvent, leave);
    };
  }, [dirty]);
}
