export function Icon({
  name,
  brand = false,
}: {
  name: string;
  brand?: boolean;
}) {
  return (
    <i className={`${brand ? "fab" : "fas"} fa-${name}`} aria-hidden="true" />
  );
}
