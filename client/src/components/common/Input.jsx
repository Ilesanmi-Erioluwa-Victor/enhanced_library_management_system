export const Input = (props) => <input {...props} className={`input ${props.className || ""}`} />;
export const Textarea = (props) => <textarea {...props} className={`input ${props.className || ""}`} />;
export const Select = ({ children, ...rest }) => <select {...rest} className={`input ${rest.className || ""}`}>{children}</select>;

export function Field({ label, children, hint, error }) {
  return (
    <div className="mb-3">
      {label && <label className="label">{label}</label>}
      {children}
      {hint && <p className="text-xs text-neutral-500 mt-1">{hint}</p>}
      {error && <p className="text-xs text-status-danger mt-1">{error}</p>}
    </div>
  );
}
