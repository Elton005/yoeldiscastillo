import { publicAsset } from "../models/content";
export function AuthorImage({ hero = false }: { hero?: boolean }) {
  return (
    <picture>
      <source
        type="image/webp"
        srcSet={publicAsset(
          "/img/optimized/autor-360.webp 360w, /img/optimized/autor-674.webp 674w",
        )}
        sizes="(max-width: 900px) min(90vw, 280px), 350px"
      />
      <img
        src={publicAsset("/img/autor.jpg")}
        alt="Retrato de Yoeldis Castillo Quiala"
        width="674"
        height="656"
        fetchPriority={hero ? "high" : "auto"}
        loading={hero ? "eager" : "lazy"}
      />
    </picture>
  );
}
