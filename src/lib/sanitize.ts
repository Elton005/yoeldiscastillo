import sanitize from "sanitize-html";
import { publicAsset } from "../models/content";
export function sanitizeRichHtml(html: string): string {
  return sanitize(html, {
    allowedTags: [
      "p",
      "br",
      "strong",
      "b",
      "em",
      "i",
      "u",
      "s",
      "h2",
      "h3",
      "h4",
      "h5",
      "h6",
      "ul",
      "ol",
      "li",
      "blockquote",
      "a",
      "img",
      "figure",
      "figcaption",
      "hr",
      "pre",
      "code",
      "table",
      "thead",
      "tbody",
      "tr",
      "th",
      "td",
      "span",
      "div",
      "sup",
      "sub",
    ],
    allowedAttributes: {
      a: ["href", "title"],
      img: ["src", "alt", "width", "height"],
      th: ["colspan", "rowspan"],
      td: ["colspan", "rowspan"],
    },
    allowedSchemes: ["https"],
    allowedSchemesByTag: { a: ["https", "mailto"] },
    allowProtocolRelative: false,
    transformTags: {
      img: (_tag, attributes) => ({
        tagName: "img",
        attribs: {
          ...attributes,
          src: publicAsset(attributes.src || ""),
          loading: "lazy",
        },
      }),
    },
    exclusiveFilter: (frame) =>
      frame.tag === "img" &&
      (!frame.attribs.src || /(?:\.svg|^data:)/i.test(frame.attribs.src)),
  });
}
