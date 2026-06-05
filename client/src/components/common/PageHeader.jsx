export default function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center sm:justify-between gap-3 gap-y-2 mb-4">
      <div className="min-w-0 flex-1">
        <h1 className="text-xl sm:text-2xl font-bold text-primary truncate">{title}</h1>
        {subtitle && <p className="text-sm text-neutral-500 mt-1 break-words">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}
