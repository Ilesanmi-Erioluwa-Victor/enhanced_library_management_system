import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import ProtectedRoute from "./ProtectedRoute.jsx";
import RoleRoute from "./RoleRoute.jsx";
import { useAuth } from "../hooks/useAuth";

import AuthLayout from "../components/layout/AuthLayout.jsx";
import PageWrapper from "../components/layout/PageWrapper.jsx";
import PageLoader from "../components/common/PageLoader.jsx";

const Login = lazy(() => import("../pages/auth/Login.jsx"));
const ForgotPassword = lazy(() => import("../pages/auth/ForgotPassword.jsx"));
const ResetPassword = lazy(() => import("../pages/auth/ResetPassword.jsx"));

const Dashboard = lazy(() => import("../pages/admin/Dashboard.jsx"));
const UserManagement = lazy(() => import("../pages/admin/UserManagement.jsx"));
const Reports = lazy(() => import("../pages/admin/Reports.jsx"));
const AuditLogs = lazy(() => import("../pages/admin/AuditLogs.jsx"));
const Settings = lazy(() => import("../pages/admin/Settings.jsx"));
const Payments = lazy(() => import("../pages/admin/Payments.jsx"));

const BookList = lazy(() => import("../pages/librarian/BookList.jsx"));
const AddBook = lazy(() => import("../pages/librarian/AddBook.jsx"));
const EditBook = lazy(() => import("../pages/librarian/EditBook.jsx"));
const IssueBook = lazy(() => import("../pages/librarian/IssueBook.jsx"));
const ReturnBook = lazy(() => import("../pages/librarian/ReturnBook.jsx"));
const MemberList = lazy(() => import("../pages/librarian/MemberList.jsx"));
const AddMember = lazy(() => import("../pages/librarian/AddMember.jsx"));
const EditMember = lazy(() => import("../pages/librarian/EditMember.jsx"));
const Transactions = lazy(() => import("../pages/librarian/Transactions.jsx"));
const OverdueList = lazy(() => import("../pages/librarian/OverdueList.jsx"));

const MyBorrowedBooks = lazy(() => import("../pages/member/MyBorrowedBooks.jsx"));
const MyHistory = lazy(() => import("../pages/member/MyHistory.jsx"));
const MyFines = lazy(() => import("../pages/member/MyFines.jsx"));
const PaymentCallback = lazy(() => import("../pages/member/PaymentCallback.jsx"));
const Profile = lazy(() => import("../pages/Profile.jsx"));

const wrap = (el) => <Suspense fallback={<PageLoader />}>{el}</Suspense>;
const auth = (el) => <AuthLayout><Suspense fallback={<PageLoader />}>{el}</Suspense></AuthLayout>;
const page = (el) => <PageWrapper><Suspense fallback={<PageLoader />}>{el}</Suspense></PageWrapper>;

export default function AppRoutes() {
  const { role, isAuthenticated } = useAuth();

  const home = () => {
    if (!isAuthenticated) return <Navigate to="/login" replace />;
    if (role === "member") return <Navigate to="/my-books" replace />;
    return <Navigate to="/dashboard" replace />;
  };

  return (
    <Routes>
      <Route path="/" element={home()} />
      <Route path="/login" element={auth(<Login />)} />
      <Route path="/forgot-password" element={auth(<ForgotPassword />)} />
      <Route path="/reset-password/:token" element={auth(<ResetPassword />)} />

      <Route path="/dashboard" element={page(<Dashboard />)} />
      <Route path="/profile" element={page(<Profile />)} />

      <Route path="/admin/users"      element={wrap(<ProtectedRoute><RoleRoute allow={["admin"]}>{page(<UserManagement />)}</RoleRoute></ProtectedRoute>)} />
      <Route path="/admin/reports"    element={wrap(<ProtectedRoute><RoleRoute allow={["admin"]}>{page(<Reports />)}</RoleRoute></ProtectedRoute>)} />
      <Route path="/admin/audit-logs" element={wrap(<ProtectedRoute><RoleRoute allow={["admin"]}>{page(<AuditLogs />)}</RoleRoute></ProtectedRoute>)} />
      <Route path="/admin/settings"   element={wrap(<ProtectedRoute><RoleRoute allow={["admin"]}>{page(<Settings />)}</RoleRoute></ProtectedRoute>)} />
      <Route path="/admin/payments"   element={wrap(<ProtectedRoute><RoleRoute allow={["admin","librarian"]}>{page(<Payments />)}</RoleRoute></ProtectedRoute>)} />

      <Route path="/books"            element={page(<BookList />)} />
      <Route path="/books/new"        element={wrap(<ProtectedRoute><RoleRoute allow={["admin","librarian"]}>{page(<AddBook />)}</RoleRoute></ProtectedRoute>)} />
      <Route path="/books/:id/edit"   element={wrap(<ProtectedRoute><RoleRoute allow={["admin","librarian"]}>{page(<EditBook />)}</RoleRoute></ProtectedRoute>)} />
      <Route path="/members"          element={wrap(<ProtectedRoute><RoleRoute allow={["admin","librarian"]}>{page(<MemberList />)}</RoleRoute></ProtectedRoute>)} />
      <Route path="/members/new"      element={wrap(<ProtectedRoute><RoleRoute allow={["admin","librarian"]}>{page(<AddMember />)}</RoleRoute></ProtectedRoute>)} />
      <Route path="/members/:id/edit" element={wrap(<ProtectedRoute><RoleRoute allow={["admin","librarian"]}>{page(<EditMember />)}</RoleRoute></ProtectedRoute>)} />
      <Route path="/transactions"           element={page(<Transactions />)} />
      <Route path="/transactions/issue"     element={wrap(<ProtectedRoute><RoleRoute allow={["admin","librarian"]}>{page(<IssueBook />)}</RoleRoute></ProtectedRoute>)} />
      <Route path="/transactions/return"    element={wrap(<ProtectedRoute><RoleRoute allow={["admin","librarian"]}>{page(<ReturnBook />)}</RoleRoute></ProtectedRoute>)} />
      <Route path="/transactions/overdue"   element={page(<OverdueList />)} />

      <Route path="/my-books" element={wrap(<ProtectedRoute><RoleRoute allow={["member"]}>{page(<MyBorrowedBooks />)}</RoleRoute></ProtectedRoute>)} />
      <Route path="/my-history" element={wrap(<ProtectedRoute><RoleRoute allow={["member"]}>{page(<MyHistory />)}</RoleRoute></ProtectedRoute>)} />
      <Route path="/my-fines" element={wrap(<ProtectedRoute><RoleRoute allow={["member"]}>{page(<MyFines />)}</RoleRoute></ProtectedRoute>)} />
      <Route path="/payment/callback" element={wrap(<ProtectedRoute>{page(<PaymentCallback />)}</ProtectedRoute>)} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
