import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export default function RoleRoute({ allow = [], children }) {
  const { role } = useAuth();
  if (!allow.includes(role)) {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
}
