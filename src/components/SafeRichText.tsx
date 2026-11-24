import { sanitizeRichHtml } from "../lib/sanitize";

export default function SafeRichText({ html }: { html: string }) {
  return (
    <div
      className="prose"
      dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(html) }}
    />
  );
}
