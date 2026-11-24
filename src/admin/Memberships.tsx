import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { db } from "../lib/supabase";
import { requireEditor } from "../services/content";
import { ContentState } from "../components/ContentState";
const membership = z.object({
  user_id: z.string(),
  email: z.string(),
  role: z.enum(["admin", "editor"]),
  nombre: z.string().nullish(),
});
const schema = z.object({
  email: z.email(),
  role: z.enum(["admin", "editor"]),
  nombre: z.string().max(150),
});
export default function Memberships() {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const query = useQuery({
    queryKey: ["memberships", "admin"],
    queryFn: async () => {
      await requireEditor(true);
      const { data, error } = await db().rpc("list_editor_memberships");
      if (error)
        throw new Error("No se pudieron cargar las personas autorizadas.");
      return z.array(membership).parse(data);
    },
  });
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", role: "editor", nombre: "" },
  });
  return (
    <>
      <p>
        El correo debe corresponder a una cuenta registrada y confirmada. Los
        permisos se asignan a su identidad verificada.
      </p>
      <form
        className="role-form libro-detalle"
        onSubmit={handleSubmit(async (values) => {
          setMessage("");
          try {
            await requireEditor(true);
            const { error } = await db().rpc("manage_editor_membership", {
              operation: "grant",
              target_email: values.email.trim().toLowerCase(),
              assigned_role: values.role,
              target_user_id: null,
              target_name: values.nombre,
            });
            if (error) throw error;
            await query.refetch();
            reset();
            setMessage("Permisos actualizados.");
          } catch {
            setMessage(
              "No se pudo asignar el permiso. Comprueba la cuenta y vuelve a intentarlo más tarde.",
            );
          }
        })}
      >
        <label>
          Correo electrónico
          <input
            className="admin-input"
            type="email"
            autoComplete="off"
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? "member-email-error" : undefined}
            {...register("email")}
          />
          {errors.email && (
            <span id="member-email-error" className="field-error" role="alert">
              Escribe un correo válido.
            </span>
          )}
        </label>
        <label>
          Nombre (opcional)
          <input
            className="admin-input"
            maxLength={150}
            aria-invalid={Boolean(errors.nombre)}
            aria-describedby={errors.nombre ? "member-name-error" : undefined}
            {...register("nombre")}
          />
          {errors.nombre && (
            <span id="member-name-error" className="field-error" role="alert">
              Usa un nombre de hasta 150 caracteres.
            </span>
          )}
        </label>
        <label>
          Permiso
          <select className="select-input" {...register("role")}>
            <option value="editor">Editor: gestiona publicaciones</option>
            <option value="admin">
              Administrador: también gestiona personas
            </option>
          </select>
        </label>
        <button className="btn btn--solid" disabled={isSubmitting || busy}>
          Conceder / actualizar permiso
        </button>
      </form>
      <ContentState
        loading={query.isPending}
        error={query.error}
        empty={!query.data?.length}
        retry={query.refetch}
      >
        <div className="admin-list">
          {query.data?.map((person) => (
            <article className="admin-item-admin" key={person.user_id}>
              <div>
                <h3>{person.email}</h3>
                {person.nombre && <p>{person.nombre}</p>}
                <span className="admin-badge">{person.role}</span>
              </div>
              <button
                className="btn btn--outline"
                disabled={busy || isSubmitting}
                onClick={() => {
                  if (
                    !window.confirm(`¿Retirar los permisos de ${person.email}?`)
                  )
                    return;
                  setBusy(true);
                  setMessage("");
                  void requireEditor(true)
                    .then(async () => {
                      const { error } = await db().rpc(
                        "manage_editor_membership",
                        {
                          operation: "revoke",
                          target_user_id: person.user_id,
                          target_email: null,
                          assigned_role: null,
                        },
                      );
                      if (error) throw error;
                      await query.refetch();
                      setMessage("Permisos retirados.");
                    })
                    .catch(() =>
                      setMessage(
                        "No se pudo retirar el permiso. No se permite eliminar al último administrador.",
                      ),
                    )
                    .finally(() => setBusy(false));
                }}
              >
                Retirar permiso
              </button>
            </article>
          ))}
        </div>
      </ContentState>
      {message && (
        <p className="notice" role="status">
          {message}
        </p>
      )}
    </>
  );
}
