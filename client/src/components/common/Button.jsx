export default function Button({ variant = "primary", className = "", children, ...rest }) {
  const cls = variant === "danger" ? "btn-danger" : variant === "secondary" ? "btn-secondary" : "btn-primary";
  return <button className={`${cls} ${className}`} {...rest}>{children}</button>;
}
