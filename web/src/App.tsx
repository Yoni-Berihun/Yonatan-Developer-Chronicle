import { Suspense, lazy } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import ScrollToTop from "./components/ScrollToTop";
import HomePage from "./pages/HomePage";
import NotFoundPage from "./pages/NotFoundPage";

// The admin bundle is only ever loaded by one person, so it should never be
// part of what a visitor downloads. The article pages are split out too, so the
// markdown renderer only loads for someone who actually opens an article.
const AdminApp = lazy(() => import("./admin/AdminApp"));
const BlogIndexPage = lazy(() => import("./pages/BlogIndexPage"));
const PostPage = lazy(() => import("./pages/PostPage"));

const pageFallback = (
  <div className="boot-screen">
    <p className="boot-title">THE YONATAN TIMES</p>
    <p className="boot-note">The presses are warming up…</p>
  </div>
);

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Suspense fallback={pageFallback}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/edition" element={<BlogIndexPage />} />
          <Route path="/edition/category/:categorySlug" element={<BlogIndexPage />} />
          <Route path="/edition/tag/:tagSlug" element={<BlogIndexPage />} />
          <Route path="/edition/:slug" element={<PostPage />} />
          <Route
            path="/admin/*"
            element={
              <Suspense fallback={<div className="admin-boot">Loading the newsroom…</div>}>
                <AdminApp />
              </Suspense>
            }
          />
          <Route path="/blog" element={<Navigate to="/edition" replace />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </>
  );
}
