import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api } from "../../lib/api";
import { formatDateTime } from "../../lib/format";
import type { AdminPostSummary, AdminSectionSummary, ContactMessage } from "../../lib/types";
import { Card, PageHeader, Spinner } from "../components/ui";
import { useAdminAuth } from "../useAdminAuth";

export default function DashboardPage() {
  const { admin } = useAdminAuth();

  const sections = useQuery({
    queryKey: ["admin", "sections"],
    queryFn: () => api.get<{ sections: AdminSectionSummary[] }>("/admin/sections"),
  });

  const posts = useQuery({
    queryKey: ["admin", "posts"],
    queryFn: () => api.get<{ posts: AdminPostSummary[] }>("/admin/blog/posts"),
  });

  const inbox = useQuery({
    queryKey: ["admin", "inbox"],
    queryFn: () => api.get<{ messages: ContactMessage[]; unreadCount: number }>("/admin/inbox"),
  });

  const published = posts.data?.posts.filter((p) => p.status === "PUBLISHED").length ?? 0;
  const drafts = posts.data?.posts.filter((p) => p.status === "DRAFT").length ?? 0;

  return (
    <>
      <PageHeader
        title={`Good to see you, ${admin?.name?.split(" ")[0] ?? "editor"}`}
        description="Everything on the site is editable from here. Nothing needs a code change."
      />

      <div className="admin-stat-grid">
        <div className="admin-stat">
          <span className="admin-stat-value">{sections.data?.sections.length ?? "—"}</span>
          <span className="admin-stat-label">Sections</span>
        </div>
        <div className="admin-stat">
          <span className="admin-stat-value">{published}</span>
          <span className="admin-stat-label">Published articles</span>
        </div>
        <div className="admin-stat">
          <span className="admin-stat-value">{drafts}</span>
          <span className="admin-stat-label">Drafts</span>
        </div>
        <div className="admin-stat">
          <span className="admin-stat-value">{inbox.data?.unreadCount ?? "—"}</span>
          <span className="admin-stat-label">Unread messages</span>
        </div>
      </div>

      <div className="admin-columns">
        <Card title="Recent articles">
          {posts.isLoading ? (
            <Spinner />
          ) : posts.data && posts.data.posts.length > 0 ? (
            <ul className="admin-list">
              {posts.data.posts.slice(0, 5).map((post) => (
                <li key={post.id}>
                  <Link to={`/admin/blog/${post.id}`}>{post.title}</Link>
                  <span className={`admin-pill admin-pill--${post.status.toLowerCase()}`}>
                    {post.status === "PUBLISHED" ? "Published" : "Draft"}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="admin-hint">No articles yet.</p>
          )}
          <Link to="/admin/blog" className="admin-inline-link">
            Manage the edition →
          </Link>
        </Card>

        <Card title="Latest messages">
          {inbox.isLoading ? (
            <Spinner />
          ) : inbox.data && inbox.data.messages.length > 0 ? (
            <ul className="admin-list">
              {inbox.data.messages.slice(0, 5).map((message) => (
                <li key={message.id}>
                  <span>
                    <strong>{message.name}</strong> — {message.subject}
                  </span>
                  <span className="admin-hint">{formatDateTime(message.createdAt)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="admin-hint">The inbox is empty.</p>
          )}
          <Link to="/admin/inbox" className="admin-inline-link">
            Open the inbox →
          </Link>
        </Card>
      </div>
    </>
  );
}
