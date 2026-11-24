import { useEffect, useRef } from "react";
export function useDialog(onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusable = () =>
      [
        ...(ref.current?.querySelectorAll<HTMLElement>(
          'button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex="0"]',
        ) ?? []),
      ].filter((el) => el.getClientRects().length > 0);
    focusable()[0]?.focus({ preventScroll: true });
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
      if (event.key === "Tab") {
        const items = focusable();
        const first = items[0];
        const last = items.at(-1);
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    // Make background branches inert, including when the dialog is nested in a route.
    const background: { element: HTMLElement; inert: boolean }[] = [];
    let branch: HTMLElement | null =
      ref.current?.closest<HTMLElement>('[role="dialog"]') || ref.current;
    while (branch?.parentElement) {
      for (const sibling of branch.parentElement.children) {
        if (
          sibling !== branch &&
          sibling instanceof HTMLElement &&
          !["SCRIPT", "STYLE"].includes(sibling.tagName)
        ) {
          background.push({ element: sibling, inert: sibling.inert });
          sibling.inert = true;
        }
      }
      if (branch.parentElement === document.body) break;
      branch = branch.parentElement;
    }
    document.addEventListener("keydown", keyboard);
    return () => {
      document.removeEventListener("keydown", keyboard);
      document.body.style.overflow = overflow;
      for (const { element, inert } of background) element.inert = inert;
      previous?.focus({ preventScroll: true });
    };
  }, [onClose]);
  return ref;
}
