// Test double SOLO LOCAL. No implementa ni demuestra RLS real; ver rls.test.ts.
import http from "node:http";
import { readFileSync } from "node:fs";
const initial = {
  site_settings: [{ id: 1, content: {}, revision: 1 }],
  administradores: [
    {
      id: 1,
      email: "admin@example.test",
      nombre: "Administrador de prueba",
      creado_en: "2026-01-01T00:00:00Z",
    },
  ],
  libros: [
    {
      id: 1,
      titulo: "Conócete",
      subtitulo: "Un espejo, 8 dimensiones",
      descripcion: "Contenido de prueba del catálogo.",
      prologo: "Prólogo de prueba",
      imagen_url: "/img/libros/conocete.jpg",
      estado: "publicado",
      amazon_url: "",
      apk_url: "",
      fecha_publicacion: null,
      orden: 1,
      visible: true,
      creado_en: "2026-01-01T00:00:00Z",
    },
  ],
  articulos: [
    {
      id: 7,
      titulo: "Artículo de prueba",
      categoria: "Pruebas locales",
      resumen: "Contenido exclusivo de pruebas automatizadas.",
      contenido:
        '<h2>Contenido antiguo</h2><p>Texto <strong>compatible</strong>.</p><img src="x" onerror="window.xss=true"><script>window.xss=true</script>',
      publicado: true,
      orden: 1,
      creado_en: "2026-01-01T00:00:00Z",
    },
  ],
  destacados: [
    {
      id: 3,
      titulo: "Recurso de prueba",
      tipo: "libro",
      url_boton: "/libros/1",
      texto_boton: "Explorar",
      activo: true,
      orden: 1,
    },
  ],
};
if (process.env.VISUAL_REFERENCE_SNAPSHOT) {
  const snapshot = JSON.parse(
    readFileSync(process.env.VISUAL_REFERENCE_SNAPSHOT, "utf8"),
  );
  for (const table of ["libros", "articulos", "destacados"]) {
    if (!Array.isArray(snapshot.tables?.[table]))
      throw new Error("Invalid public reference");
    initial[table] = snapshot.tables[table];
  }
}
let records = structuredClone(initial);
let counter = 100;
const user = (role) => ({
  id:
    role === "admin"
      ? "11111111-1111-4111-8111-111111111111"
      : "22222222-2222-4222-8222-222222222222",
  email: `${role}@example.test`,
  aud: "authenticated",
  role: "authenticated",
  app_metadata: { provider: "email" },
  user_metadata: {},
  created_at: "2026-01-01T00:00:00Z",
});
http
  .createServer(async (req, res) => {
    res.setHeader(
      "Access-Control-Allow-Origin",
      [
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5177",
        "http://127.0.0.1:54330",
        "http://127.0.0.1:4173",
      ].includes(req.headers.origin)
        ? req.headers.origin
        : "http://127.0.0.1:5173",
    );
    res.setHeader(
      "Access-Control-Allow-Headers",
      req.headers["access-control-request-headers"] ||
        "authorization,apikey,content-type,x-client-info,prefer",
    );
    res.setHeader(
      "Access-Control-Allow-Methods",
      "GET,POST,PATCH,DELETE,OPTIONS",
    );
    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }
    res.setHeader("Content-Type", "application/json");
    const url = new URL(req.url, "http://localhost");
    let raw = "";
    for await (const chunk of req) raw += chunk;
    const body =
      raw && req.headers["content-type"]?.includes("json")
        ? JSON.parse(raw)
        : {};
    const role = req.headers.authorization?.includes("fixture-admin")
      ? "admin"
      : req.headers.authorization?.includes("fixture-reader")
        ? "reader"
        : null;
    const send = (value, status = 200) => {
      res.writeHead(status);
      res.end(JSON.stringify(value));
    };
    if (url.pathname === "/test/reset") {
      records = structuredClone(initial);
      counter = 100;
      send({ ok: true });
      return;
    }
    if (url.pathname === "/auth/v1/token") {
      const kind = body.email?.startsWith("admin") ? "admin" : "reader";
      send({
        access_token: `fixture-${kind}`,
        refresh_token: `refresh-${kind}`,
        token_type: "bearer",
        expires_in: 3600,
        user: user(kind),
      });
      return;
    }
    if (url.pathname === "/auth/v1/user") {
      send(role ? user(role) : { message: "Unauthorized" }, role ? 200 : 401);
      return;
    }
    if (url.pathname === "/auth/v1/logout") {
      res.writeHead(204);
      res.end();
      return;
    }
    if (url.pathname === "/rest/v1/rpc/current_editor_role") {
      send(role === "admin" ? "admin" : null);
      return;
    }
    if (url.pathname === "/rest/v1/rpc/save_site_settings") {
      if (role !== "admin") {
        send({ code: "42501", message: "denied" }, 403);
        return;
      }
      const row = records.site_settings[0];
      if (row.revision !== body.expected_revision) {
        send({ code: "40001", message: "Settings changed" }, 409);
        return;
      }
      row.content = body.payload;
      row.revision += 1;
      send({ content: row.content, revision: row.revision });
      return;
    }
    if (url.pathname === "/rest/v1/rpc/reorder_editorial_content") {
      if (
        role !== "admin" ||
        !["libros", "articulos", "destacados"].includes(body.table_name)
      ) {
        send({ code: "42501" }, 403);
        return;
      }
      const items = records[body.table_name];
      items.sort(
        (a, b) =>
          (a.orden ?? 0) - (b.orden ?? 0) || Number(a.id) - Number(b.id),
      );
      const current = items.findIndex(
        (row) => String(row.id) === body.record_id,
      );
      const next = current + (body.direction === "up" ? -1 : 1);
      if (current >= 0 && next >= 0 && next < items.length) {
        [items[current], items[next]] = [items[next], items[current]];
        items.forEach((row, index) => {
          row.orden = index + 1;
        });
      }
      send(null);
      return;
    }
    if (url.pathname === "/rest/v1/rpc/list_editor_memberships") {
      send(
        role === "admin"
          ? [
              {
                user_id: user("admin").id,
                email: "admin@example.test",
                role: "admin",
              },
            ]
          : [],
        role === "admin" ? 200 : 403,
      );
      return;
    }
    if (url.pathname === "/rest/v1/rpc/manage_editor_membership") {
      send(null, role === "admin" ? 200 : 403);
      return;
    }
    if (url.pathname === "/functions/v1/upload-editorial-image") {
      send(
        { path: `${user("admin").id}/fixture.jpg`, url: "/img/autor.jpg" },
        role === "admin" ? 201 : 403,
      );
      return;
    }
    const table = url.pathname.split("/")[3];
    if (!records[table]) {
      send({ message: "Not found" }, 404);
      return;
    }
    const filter = url.searchParams.get("id")?.replace("eq.", "");
    let rows = records[table].filter(
      (row) => !filter || String(row.id) === filter,
    );
    if (req.method === "GET") {
      if (
        process.env.VISUAL_REFERENCE_SNAPSHOT &&
        table === "libros" &&
        url.searchParams.get("select")?.split(",").includes("visible") &&
        !Object.hasOwn(records.libros[0] || {}, "visible")
      ) {
        send(
          { code: "42703", message: "column libros.visible does not exist" },
          400,
        );
        return;
      }
      for (const flag of ["visible", "publicado", "activo"])
        if (url.searchParams.get(flag) === "eq.true")
          rows = rows.filter((row) => row[flag]);
      const ordering = url.searchParams.get("order")?.split(",") || [];
      rows.sort((a, b) => {
        for (const expression of ordering) {
          const [field, direction, nulls] = expression.split(".");
          const x = a[field],
            y = b[field];
          if (x === y) continue;
          if (x == null) return nulls === "nullsfirst" ? -1 : 1;
          if (y == null) return nulls === "nullsfirst" ? 1 : -1;
          const result =
            typeof x === "number" && typeof y === "number"
              ? x - y
              : String(x).localeCompare(String(y));
          if (result) return direction === "desc" ? -result : result;
        }
        return 0;
      });
      const limit = Number(url.searchParams.get("limit"));
      if (limit > 0) rows = rows.slice(0, limit);
      send(rows);
      return;
    }
    if (role !== "admin") {
      send({ code: "42501", message: "denied" }, 403);
      return;
    }
    if (req.method === "POST") {
      const row = { ...body, id: ++counter, creado_en: "2026-01-01T00:00:00Z" };
      records[table].push(row);
      send({ id: row.id }, 201);
      return;
    }
    if (req.method === "PATCH") {
      for (const row of rows) Object.assign(row, body);
      send(rows[0] ? { id: rows[0].id } : null);
      return;
    }
    if (req.method === "DELETE") {
      records[table] = records[table].filter((row) => !rows.includes(row));
      send(rows[0] ? { id: rows[0].id } : null);
      return;
    }
    send({ message: "Not supported" }, 405);
  })
  .listen(54329, "127.0.0.1", () =>
    console.log("Fixture backend: http://127.0.0.1:54329"),
  );
