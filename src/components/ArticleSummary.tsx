import { sanitizeRichHtml } from "../lib/sanitize";

export default function ArticleSummary({ html }: { html: string }) {
  return (
    <p className="articulo-card__resumen">
      {sanitizeRichHtml(html)
        .replace(/<[^>]+>/g, "")
        .slice(0, 120)}
    </p>
  );
}
