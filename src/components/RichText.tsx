import { lazy, Suspense } from "react";
const Content = lazy(() => import("./SafeRichText"));
export function RichText({ html }: { html: string }) {
  return (
    <Suspense
      fallback={
        <p className="notice" role="status">
          Cargando lectura…
        </p>
      }
    >
      <Content html={html} />
    </Suspense>
  );
}
