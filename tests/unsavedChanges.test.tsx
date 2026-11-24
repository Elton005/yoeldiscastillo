import { cleanup, render } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import {
  confirmLeave,
  useUnsavedChanges,
} from "../src/hooks/useUnsavedChanges";
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
function Form({ dirty }: { dirty: boolean }) {
  useUnsavedChanges(dirty);
  return null;
}
it("permite cancelar la salida con un borrador y deja salir cuando se confirma", () => {
  const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
  const view = render(<Form dirty />);
  expect(confirmLeave()).toBe(false);
  confirm.mockReturnValue(true);
  expect(confirmLeave()).toBe(true);
  view.rerender(<Form dirty={false} />);
  confirm.mockClear();
  expect(confirmLeave()).toBe(true);
  expect(confirm).not.toHaveBeenCalled();
});
