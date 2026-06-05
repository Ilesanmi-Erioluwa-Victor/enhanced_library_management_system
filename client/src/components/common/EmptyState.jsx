export default function EmptyState({ title = "Nothing here yet", description, icon, action }) {
  return (
    <div className="card p-10 text-center">
      {icon && <div className="text-5xl mb-3 text-neutral-300">{icon}</div>}
      <h3 className="text-lg font-semibold text-primary-dark">{title}</h3>
      {description && <p className="text-sm text-neutral-500 mt-1 max-w-md mx-auto">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
