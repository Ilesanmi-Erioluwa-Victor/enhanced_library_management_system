import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.js";
import MyProfile from "./member/MyProfile.jsx";
import StaffProfile from "./staff/StaffProfile.jsx";

export default function Profile() {
  const { role, isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (role === "member") return <MyProfile />;
  return <StaffProfile />;
}
