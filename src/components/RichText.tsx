import { sanitizeRichHtml } from "../lib/sanitize";
export function RichText({ html }: { html: string }) {
  return (
    <div
      className="prose"
      dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(html) }}
    />
  );
}
