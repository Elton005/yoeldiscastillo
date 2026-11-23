import { db } from "../lib/supabase";
import { requireEditor } from "./content";
import {
  imageExtensions,
  validImageBytes,
} from "../../supabase/functions/_shared/image";
export async function validateImage(file: File) {
  if (
    !imageExtensions[file.type] ||
    file.size > 5 * 1024 * 1024 ||
    file.size < 12
  )
    throw new Error(
      "Selecciona una imagen JPEG, PNG, WebP o AVIF de hasta 5 MB.",
    );
  const bytes = new Uint8Array(await file.slice(0, 32).arrayBuffer());
  if (!validImageBytes(file.type, bytes))
    throw new Error("El archivo no coincide con su tipo de imagen.");
}
export async function uploadImage(file: File) {
  await requireEditor();
  await validateImage(file);
  const { data, error } = await db().functions.invoke(
    "upload-editorial-image",
    { body: file, headers: { "Content-Type": file.type } },
  );
  if (error)
    throw new Error("No se pudo subir la imagen. Comprueba tus permisos.");
  if (!data || typeof data.url !== "string" || typeof data.path !== "string")
    throw new Error("Respuesta de imagen inválida.");
  return { url: data.url as string, path: data.path as string };
}
