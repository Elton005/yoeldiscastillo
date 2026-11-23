import { afterEach, expect, it, vi } from "vitest";
import { publicAsset, safeUrl } from "../src/models/content";
afterEach(() => vi.unstubAllEnvs());
it("adapta imágenes y srcset al subdirectorio sin cambiar enlaces de Router ni URLs externas", () => {
  vi.stubEnv("BASE_URL", "/yoeldiscastillo/");
  expect(publicAsset("/img/autor.jpg")).toBe("/yoeldiscastillo/img/autor.jpg");
  expect(publicAsset("/img/a.webp 480w, /img/b.webp 768w")).toBe(
    "/yoeldiscastillo/img/a.webp 480w, /yoeldiscastillo/img/b.webp 768w",
  );
  expect(publicAsset("https://example.com/img/a.jpg")).toBe(
    "https://example.com/img/a.jpg",
  );
  expect(publicAsset("/yoeldiscastillo/img/a.jpg")).toBe(
    "/yoeldiscastillo/img/a.jpg",
  );
  expect(safeUrl("/img/a.jpg", true)).toBe("/yoeldiscastillo/img/a.jpg");
  expect(safeUrl("/libros.html")).toBe("/libros.html");
});
