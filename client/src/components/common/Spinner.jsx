export default function Spinner({ size = "md" }) {
  const s = size === "sm" ? "h-4 w-4" : size === "lg" ? "h-8 w-8" : "h-6 w-6";
  return (
    <div className={`${s} inline-block animate-spin rounded-full border-2 border-neutral-200 border-t-primary`} role="status" aria-label="Loading" />
  );
}
