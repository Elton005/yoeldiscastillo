// @vitest-environment node
import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
const database = new PGlite();
const admin = "11111111-1111-4111-8111-111111111111";
const reader = "22222222-2222-4222-8222-222222222222";
const editor = "33333333-3333-4333-8333-333333333333";
let legacyColumnsPreserved = false;
let legacyCatalogueReadable = false;
beforeAll(async () => {
  await database.exec(await readFile("supabase/test-fixture.sql", "utf8"));
  await database.exec(
    await readFile(
      "supabase/migrations/202611220001_editorial_security.sql",
      "utf8",
    ),
  );
  legacyColumnsPreserved =
    (
      await database.query(
        "select column_name from information_schema.columns where table_schema='public' and table_name='libros' and column_name='visible'",
      )
    ).rows.length === 0;
  await database.exec(
    "insert into libros(titulo) values('Contrato original');set role anon;",
  );
  legacyCatalogueReadable =
    (await database.query<{ titulo: string }>("select titulo from libros"))
      .rows[0].titulo === "Contrato original";
  await database.exec(
    "reset role;delete from libros where titulo='Contrato original';",
  );
  await database.exec(
    await readFile(
      "supabase/migrations/202611220002_editorial_order.sql",
      "utf8",
    ),
  );
  await database.exec(
    await readFile(
      "supabase/migrations/202611220004_site_settings.sql",
      "utf8",
    ),
  );
  await database.exec(
    await readFile(
      "supabase/migrations/202611220005_hero_settings.sql",
      "utf8",
    ),
  );
  await database.exec(
    await readFile(
      "supabase/optional/202611220003_book_visibility.sql",
      "utf8",
    ),
  );
  await database.exec(
    `insert into auth.users(id,email,email_confirmed_at) values ('${admin}','admin@example.test',now()),('${reader}','reader@example.test',now()),('${editor}','editor@example.test',now());insert into public.editor_memberships(user_id,role) values('${admin}','admin'),('${editor}','editor');insert into libros(titulo,visible) values('Público',true),('Oculto',false);insert into articulos(titulo,publicado,contenido) values('Artículo',true,'<p>Contenido antiguo</p>'),('Borrador',false,'Secreto');insert into destacados(titulo,activo) values('Activo',true),('Inactivo',false);`,
  );
}, 30000);
afterAll(async () => database.close());
async function asRole<T>(
  role: "anon" | "authenticated",
  id: string,
  sql: string,
) {
  await database.exec(`set role ${role};set request.jwt.claim.sub='${id}';`);
  try {
    return await database.query<T>(sql);
  } finally {
    await database.exec("reset role;reset request.jwt.claim.sub;");
  }
}
describe("RLS ejecutada en PostgreSQL embebido, con políticas legacy permisivas", () => {
  it("solo editores guardan ajustes; bloquea escritura directa, datos inválidos y revisiones obsoletas", async () => {
    expect(
      (await asRole("anon", "", "select content from site_settings")).rows,
    ).toEqual([{ content: {} }]);
    for (const identity of [reader, editor]) {
      await expect(
        asRole(
          "authenticated",
          identity,
          "update site_settings set content='{}' where id=1",
        ),
      ).rejects.toThrow();
    }
    await expect(
      asRole("anon", "", "select save_site_settings('{}',1)"),
    ).rejects.toThrow();
    await expect(
      asRole("authenticated", reader, "select save_site_settings('{}',1)"),
    ).rejects.toThrow("Not authorized");
    for (const payload of [
      '{"homeImageSize":999}',
      '{"homeImageSize":320.5}',
      '{"homeImageShape":"invalid"}',
      '{"homeImage":"javascript:alert(1)"}',
      '{"homeImage":"https://example.com/a.svg"}',
      '{"facebook":"https://name:pass@example.com"}',
      '{"contactEmail":"bad"}',
      '{"role":"admin"}',
    ]) {
      await expect(
        asRole(
          "authenticated",
          editor,
          `select save_site_settings('${payload}',1)`,
        ),
      ).rejects.toThrow();
    }
    const saved = await asRole<{ save_site_settings: { revision: number } }>(
      "authenticated",
      editor,
      `select save_site_settings('{"homeTitle":"Título publicado","homeImageSize":640,"homeBackground":"/img/hero/library-1672.webp","homePrimaryUrl":"/libros.html","homeSecondaryUrl":"https://example.com/trayectoria"}',1)`,
    );
    expect(saved.rows[0].save_site_settings.revision).toBe(2);
    await expect(
      asRole(
        "authenticated",
        admin,
        `select save_site_settings('{"homeTitle":"Edición obsoleta"}',1)`,
      ),
    ).rejects.toThrow("Settings changed");
    expect(
      (
        await asRole<{ content: { homeTitle: string } }>(
          "anon",
          "",
          "select content from site_settings",
        )
      ).rows[0].content.homeTitle,
    ).toBe("Título publicado");
    expect(
      (
        await asRole(
          "authenticated",
          reader,
          "select * from site_settings_history",
        )
      ).rows,
    ).toEqual([]);
    expect(
      (
        await asRole(
          "authenticated",
          admin,
          "select revision from site_settings_history",
        )
      ).rows,
    ).toEqual([{ revision: 1 }]);
  });
  it("el núcleo de seguridad conserva las columnas y la lectura del catálogo original", () => {
    expect(legacyColumnsPreserved).toBe(true);
    expect(legacyCatalogueReadable).toBe(true);
  });
  it("reordena con autorización en una transacción y rechaza lectores o tablas fuera del catálogo", async () => {
    await expect(
      asRole(
        "authenticated",
        reader,
        "select reorder_editorial_content('libros','1','down')",
      ),
    ).rejects.toThrow("Not authorized");
    await expect(
      asRole(
        "authenticated",
        editor,
        "select reorder_editorial_content('administradores','1','down')",
      ),
    ).rejects.toThrow("Invalid input");
    const before = await asRole<{ id: string }>(
      "authenticated",
      editor,
      "select id::text from libros order by orden,id",
    );
    const moving = before.rows[1].id;
    await asRole(
      "authenticated",
      editor,
      `select reorder_editorial_content('libros','${moving}','up')`,
    );
    const after = await asRole<{ id: string }>(
      "authenticated",
      editor,
      "select id::text from libros order by orden,id",
    );
    expect(after.rows[0].id).toBe(moving);
  });
  it("anónimo solo lee filas públicas y no accede a membresías ni administradores", async () => {
    expect(
      (await asRole("anon", "", "select titulo from libros")).rows,
    ).toEqual([{ titulo: "Público" }]);
    expect(
      (await asRole("anon", "", "select titulo from articulos")).rows,
    ).toEqual([{ titulo: "Artículo" }]);
    expect(
      (await asRole("anon", "", "select titulo from destacados")).rows,
    ).toEqual([{ titulo: "Activo" }]);
    await expect(
      asRole("anon", "", "select * from administradores"),
    ).rejects.toThrow();
    await expect(
      asRole("anon", "", "select * from editor_memberships"),
    ).rejects.toThrow();
  });
  it.each(["libros", "articulos", "destacados"])(
    "deniega CRUD directo de %s a anónimos y lectores autenticados",
    async (table) => {
      await expect(
        asRole("anon", "", `insert into ${table}(titulo) values('Ataque')`),
      ).rejects.toThrow();
      await expect(
        asRole(
          "authenticated",
          reader,
          `insert into ${table}(titulo) values('Ataque')`,
        ),
      ).rejects.toThrow();
      expect(
        (
          await asRole(
            "authenticated",
            reader,
            `update ${table} set titulo='Ataque' returning id`,
          )
        ).rows,
      ).toEqual([]);
      expect(
        (
          await asRole(
            "authenticated",
            reader,
            `delete from ${table} returning id`,
          )
        ).rows,
      ).toEqual([]);
      await expect(
        asRole("authenticated", reader, `truncate ${table}`),
      ).rejects.toThrow();
    },
  );
  it("rechaza autoasignación, RPC de roles y acceso a auditoría desde cuentas comunes", async () => {
    await expect(
      asRole(
        "authenticated",
        reader,
        `insert into editor_memberships(user_id,role) values('${reader}','admin')`,
      ),
    ).rejects.toThrow();
    await expect(
      asRole(
        "authenticated",
        reader,
        "select manage_editor_membership('grant','reader@example.test','admin',null)",
      ),
    ).rejects.toThrow();
    await expect(
      asRole(
        "authenticated",
        editor,
        "select * from list_editor_memberships()",
      ),
    ).rejects.toThrow();
    await expect(
      asRole("authenticated", reader, "select * from editor_role_audit"),
    ).rejects.toThrow();
  });
  it("permite CRUD editorial autorizado, conservando HTML antiguo y campos de libros", async () => {
    const created = await asRole<{ id: number }>(
      "authenticated",
      editor,
      "insert into libros(titulo,prologo,subtitulo,apk_url,visible) values('Nuevo','Prólogo','Subtítulo','https://example.test/app.apk',false) returning id",
    );
    const id = created.rows[0].id;
    await asRole(
      "authenticated",
      editor,
      `update libros set titulo='Actualizado' where id=${id}`,
    );
    expect(
      (
        await asRole(
          "authenticated",
          editor,
          `select titulo,prologo from libros where id=${id}`,
        )
      ).rows,
    ).toEqual([{ titulo: "Actualizado", prologo: "Prólogo" }]);
    await asRole("authenticated", editor, `delete from libros where id=${id}`);
    expect(
      (
        await asRole(
          "authenticated",
          editor,
          "select contenido from articulos where publicado",
        )
      ).rows,
    ).toEqual([{ contenido: "<p>Contenido antiguo</p>" }]);
  });
  it("rechaza eliminar o degradar al último administrador en servidor", async () => {
    await expect(
      asRole(
        "authenticated",
        admin,
        `select manage_editor_membership('revoke',null,null,'${admin}')`,
      ),
    ).rejects.toThrow("last administrator");
    await expect(
      asRole(
        "authenticated",
        admin,
        "select manage_editor_membership('grant','admin@example.test','editor',null)",
      ),
    ).rejects.toThrow("last administrator");
  });
  it("admin asigna y retira roles por identidad confirmada; editor no puede promoverse", async () => {
    await asRole(
      "authenticated",
      admin,
      "select manage_editor_membership('grant','reader@example.test','editor',null)",
    );
    expect(
      (
        await asRole<{ current_editor_role: string }>(
          "authenticated",
          reader,
          "select current_editor_role()",
        )
      ).rows[0].current_editor_role,
    ).toBe("editor");
    await expect(
      asRole(
        "authenticated",
        reader,
        "select manage_editor_membership('grant','reader@example.test','admin',null)",
      ),
    ).rejects.toThrow();
    await asRole(
      "authenticated",
      admin,
      `select manage_editor_membership('revoke',null,null,'${reader}')`,
    );
  });
  it("no cuenta un administrador suspendido como respaldo activo", async () => {
    const suspended = "44444444-4444-4444-8444-444444444444";
    await database.exec(
      `insert into auth.users(id,email,email_confirmed_at,banned_until) values('${suspended}','suspended@example.test',now(),now()+interval '1 year');insert into editor_memberships(user_id,role) values('${suspended}','admin');`,
    );
    expect(
      (
        await asRole<{ current_editor_role: string | null }>(
          "authenticated",
          suspended,
          "select current_editor_role()",
        )
      ).rows[0].current_editor_role,
    ).toBeNull();
    await expect(
      asRole(
        "authenticated",
        admin,
        `select manage_editor_membership('revoke',null,null,'${admin}')`,
      ),
    ).rejects.toThrow("last administrator");
  });
  it("bloquea carga, sobrescritura y borrado directo en Storage incluso con políticas legacy permisivas", async () => {
    await expect(
      asRole(
        "authenticated",
        reader,
        `insert into storage.objects(id,bucket_id,name) values('${reader}','libros-imagenes','evil.svg')`,
      ),
    ).rejects.toThrow();
    await expect(
      asRole(
        "authenticated",
        editor,
        `insert into storage.objects(id,bucket_id,name) values('${editor}','libros-imagenes','fake.jpg')`,
      ),
    ).rejects.toThrow();
    expect(
      (
        await asRole(
          "authenticated",
          editor,
          "delete from storage.objects where bucket_id='libros-imagenes' returning id",
        )
      ).rows,
    ).toEqual([]);
  });
  it("rechaza protocolos maliciosos al escribir desde API y limita cargas en servidor", async () => {
    await expect(
      asRole(
        "authenticated",
        editor,
        "insert into libros(titulo,amazon_url) values('Ataque','javascript:alert(1)')",
      ),
    ).rejects.toThrow("Invalid URL");
    await expect(
      asRole("authenticated", reader, "select reserve_editorial_upload()"),
    ).rejects.toThrow();
    for (let i = 0; i < 30; i++)
      await asRole(
        "authenticated",
        editor,
        "select reserve_editorial_upload()",
      );
    await expect(
      asRole("authenticated", editor, "select reserve_editorial_upload()"),
    ).rejects.toThrow("limit");
  });
});
