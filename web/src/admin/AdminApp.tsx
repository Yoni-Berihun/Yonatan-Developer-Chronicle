import { Navigate, Route, Routes } from "react-router-dom";
import Seo from "../components/Seo";
import AdminLayout from "./components/AdminLayout";
import DashboardPage from "./pages/DashboardPage";
import InboxPage from "./pages/InboxPage";
import LoginPage from "./pages/LoginPage";
import MediaPage from "./pages/MediaPage";
import PostEditorPage from "./pages/PostEditorPage";
import PostsPage from "./pages/PostsPage";
import SectionEditorPage from "./pages/SectionEditorPage";
import SectionsPage from "./pages/SectionsPage";
import SettingsPage from "./pages/SettingsPage";
import { AdminAuthProvider, useAdminAuth } from "./useAdminAuth";

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { admin, isLoading } = useAdminAuth();

  if (isLoading) return <div className="admin-boot">Checking your credentials…</div>;
  if (!admin) return <Navigate to="/admin/login" replace />;
  return <>{children}</>;
}

export default function AdminApp() {
  return (
    <AdminAuthProvider>
      {/* The newsroom must never appear in search results. */}
      <Seo title="Newsroom | The Yonatan Times" description="Private editorial area." noIndex />

      <Routes>
        <Route path="login" element={<LoginPage />} />
        <Route
          element={
            <RequireAuth>
              <AdminLayout />
            </RequireAuth>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="sections" element={<SectionsPage />} />
          <Route path="sections/:id" element={<SectionEditorPage />} />
          <Route path="blog" element={<PostsPage />} />
          <Route path="blog/new" element={<PostEditorPage />} />
          <Route path="blog/:id" element={<PostEditorPage />} />
          <Route path="media" element={<MediaPage />} />
          <Route path="inbox" element={<InboxPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </AdminAuthProvider>
  );
}
