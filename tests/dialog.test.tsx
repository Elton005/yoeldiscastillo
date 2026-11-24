import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { useDialog } from "../src/hooks/useDialog";
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
it("incluye select y textarea en el foco y restaura el fondo al cerrar", () => {
  vi.spyOn(HTMLElement.prototype, "getClientRects").mockReturnValue([
    {},
  ] as unknown as DOMRectList);
  const outside = document.createElement("button");
  outside.textContent = "Fondo";
  document.body.append(outside);
  outside.focus();
  function Dialog() {
    const ref = useDialog(() => {});
    return (
      <div role="dialog" ref={ref}>
        <button>Primero</button>
        <select aria-label="Tipo">
          <option>Libro</option>
        </select>
        <textarea aria-label="Descripción" />
      </div>
    );
  }
  const view = render(<Dialog />);
  expect(outside.inert).toBe(true);
  screen.getByLabelText("Descripción").focus();
  fireEvent.keyDown(document, { key: "Tab" });
  expect(screen.getByText("Primero")).toHaveFocus();
  fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
  expect(screen.getByLabelText("Descripción")).toHaveFocus();
  view.unmount();
  expect(outside.inert).toBeFalsy();
  expect(outside).toHaveFocus();
  outside.remove();
});
