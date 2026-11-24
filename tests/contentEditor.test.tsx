import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import ContentEditor from "../src/admin/ContentEditor";

it("conserva contexto visible y avisa antes de recargar un borrador editorial", async () => {
  const dirty = vi.fn();
  const view = render(
    <ContentEditor
      table="libros"
      related={{ libro: [], articulo: [] }}
      onSaved={async () => {}}
      onClose={() => {}}
      onDirtyChange={dirty}
    />,
  );
  expect(window.dispatchEvent(new Event("beforeunload", { cancelable: true }))).toBe(true);
  const title = screen.getByLabelText("Título *", { exact: true }) as HTMLInputElement;
  expect(title.labels?.[0]).not.toHaveClass("visually-hidden");
  fireEvent.change(title, { target: { value: "Mi borrador" } });
  await waitFor(() => expect(dirty).toHaveBeenLastCalledWith(true));
  expect(window.dispatchEvent(new Event("beforeunload", { cancelable: true }))).toBe(false);
  view.unmount();
  expect(window.dispatchEvent(new Event("beforeunload", { cancelable: true }))).toBe(true);
});

it("relaciona el error de validación con el campo que debe corregirse", async () => {
  render(
    <ContentEditor
      table="libros"
      related={{ libro: [], articulo: [] }}
      onSaved={async () => {}}
      onClose={() => {}}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));
  const title = screen.getByLabelText("Título *", { exact: true });
  await waitFor(() => expect(title).toHaveAttribute("aria-invalid", "true"));
  expect(document.getElementById(title.getAttribute("aria-describedby")!)).toHaveTextContent("Escribe un título.");
});
