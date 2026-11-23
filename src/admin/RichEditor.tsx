import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import { safeUrl } from "../models/content";
import { sanitizeRichHtml } from "../lib/sanitize";
import { useEffect } from "react";
import { TableKit } from "@tiptap/extension-table";
export default function RichEditor({
  value,
  onChange,
  addImage,
}: {
  value: string;
  onChange: (html: string) => void;
  addImage: () => void;
}) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        link: { openOnClick: false, protocols: ["https"] },
      }),
      TableKit,
      Image.configure({ allowBase64: false }),
    ],
    content: sanitizeRichHtml(value),
    immediatelyRender: false,
    editorProps: {
      attributes: {
        role: "textbox",
        "aria-label": "Contenido del artículo",
        "aria-multiline": "true",
      },
    },
    onUpdate: ({ editor: updated }) => onChange(updated.getHTML()),
  });
  useEffect(() => {
    if (editor && value !== editor.getHTML())
      editor.commands.setContent(sanitizeRichHtml(value), {
        emitUpdate: false,
      });
  }, [editor, value]);
  if (!editor) return <p>Cargando editor…</p>;
  return (
    <div className="rich-editor">
      <div className="toolbar" aria-label="Formato del artículo">
        <button
          type="button"
          aria-pressed={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          Negrita
        </button>
        <button
          type="button"
          aria-pressed={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          Cursiva
        </button>
        <button
          type="button"
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 2 }).run()
          }
        >
          Encabezado
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          Lista
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          Lista numerada
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        >
          Cita
        </button>
        <button
          type="button"
          onClick={() => {
            const input = window.prompt(
              "URL HTTPS del enlace",
              (editor.getAttributes("link").href as string) || "",
            );
            if (input === "") editor.chain().focus().unsetLink().run();
            else if (input && safeUrl(input))
              editor
                .chain()
                .focus()
                .setLink({ href: safeUrl(input) })
                .run();
          }}
        >
          Enlace
        </button>
        <button
          type="button"
          onClick={() => {
            const input = window.prompt("URL HTTPS de la imagen");
            if (input && safeUrl(input, true))
              editor
                .chain()
                .focus()
                .setImage({
                  src: safeUrl(input, true),
                  alt: window.prompt("Descripción de la imagen") || "",
                })
                .run();
          }}
        >
          Imagen por URL
        </button>
        <button type="button" onClick={addImage}>
          Subir imagen
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().undo().run()}
        >
          Deshacer
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().redo().run()}
        >
          Rehacer
        </button>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
