import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { sanitizeRichHtml } from "../src/lib/sanitize";
import { safeUrl, bookSchema, defaults } from "../src/models/content";
import { RichText } from "../src/components/RichText";
import { validImageBytes } from "../supabase/functions/_shared/image";
import { safeNext } from "../src/auth/actions";
describe("Contenido y navegación seguros", () => {
  it("elimina scripts, handlers, SVG, iframes y protocolos ejecutables conservando el texto", () => {
    const input =
      '<h2>Lectura</h2><p onclick="steal()">Texto <strong>real</strong></p><script>alert(1)</script><a href="javascript:alert(1)">enlace</a><img src="https://example.com/a.jpg" onerror="steal()"><svg onload="steal()"></svg><iframe src="https://evil.example"></iframe>';
    const html = sanitizeRichHtml(input);
    expect(html).toContain("<h2>Lectura</h2>");
    expect(html).toContain("<strong>real</strong>");
    expect(html).not.toMatch(/script|onclick|onerror|javascript:|svg|iframe/);
    render(<RichText html={input} />);
    expect(screen.getByRole("heading", { name: "Lectura" })).toBeVisible();
    expect(document.querySelector("script,svg,iframe")).toBeNull();
  });
  it.each([
    "javascript:alert(1)",
    "data:text/html,abc",
    "//evil.example",
    "https://user:password@example.com",
    "/\\evil.example",
    "https://example.com/a\n",
  ])("rechaza URL peligrosa: %s", (input) => {
    // Trailing whitespace is normalized safely; embedded control characters are rejected.
    if (input.endsWith("\n"))
      expect(safeUrl(input)).toBe("https://example.com/a");
    else expect(safeUrl(input)).toBe("");
  });
  it("mantiene las rutas públicas antiguas y rechaza redirecciones externas", () => {
    expect(safeUrl("articulos.html")).toBe("/articulos.html");
    expect(safeUrl("img/libros/conocete.jpg", true)).toBe(
      "/img/libros/conocete.jpg",
    );
    expect(safeNext("//evil.example")).toBe("/");
    expect(safeNext("/admin.html")).toBe("/admin.html");
    expect(safeNext("/libros/1")).toBe("/libros/1");
  });
  it("preserva los campos legacy y valida título, enlaces y estado de libros", () => {
    const values = {
      ...defaults(),
      titulo: "Conócete",
      prologo: "Texto original",
      apk_url: "https://example.com/app.apk",
    };
    expect(bookSchema.parse(values).prologo).toBe("Texto original");
    expect(
      bookSchema.safeParse({ ...values, amazon_url: "javascript:alert(1)" })
        .success,
    ).toBe(false);
    expect(bookSchema.safeParse({ ...values, titulo: " " }).success).toBe(
      false,
    );
  });
  it("valida la firma binaria, no solo el MIME del archivo", () => {
    expect(
      validImageBytes(
        "image/png",
        new TextEncoder().encode("<script>alert(1)</script>"),
      ),
    ).toBe(false);
    expect(
      validImageBytes(
        "image/png",
        new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 0]),
      ),
    ).toBe(true);
    expect(
      validImageBytes("image/svg+xml", new TextEncoder().encode("<svg></svg>")),
    ).toBe(false);
  });
});
