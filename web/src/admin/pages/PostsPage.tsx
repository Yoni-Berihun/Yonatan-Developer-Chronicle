import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api } from "../../lib/api";
import { formatDateTime } from "../../lib/format";
import type { AdminPostSummary } from "../../lib/types";
import { EmptyState, PageHeader, Spinner } from "../components/ui";

export default function PostsPage() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "posts"],
    queryFn: () => api.get<{ posts: AdminPostSummary[] }>("/admin/blog/posts"),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.del(`/admin/blog/posts/${id}`),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin", "posts"] }),
        queryClient.invalidateQueries({ queryKey: ["posts"] }),
      ]);
    },
  });

  return (
    <>
      <PageHeader
        title="The Latest Edition"
        description="Write, edit and publish articles. Drafts stay private until you publish them."
        actions={
          <Link to="/admin/blog/new" className="admin-button admin-button--primary">
            Write an article
          </Link>
        }
      />

      {isLoading ? (
        <Spinner />
      ) : !data || data.posts.length === 0 ? (
        <EmptyState
          message="No articles yet."
          action={
            <Link to="/admin/blog/new" className="admin-button admin-button--primary">
              Write the first one
            </Link>
          }
        />
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Status</th>
              <th>Category</th>
              <th>Views</th>
              <th>Updated</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {data.posts.map((post) => (
              <tr key={post.id}>
                <td>
                  <Link to={`/admin/blog/${post.id}`} className="admin-table-title">
                    {post.title}
                  </Link>
                  {post.isFeatured ? <span className="admin-pill">Front page</span> : null}
                </td>
                <td>
                  <span className={`admin-pill admin-pill--${post.status.toLowerCase()}`}>
                    {post.status === "PUBLISHED" ? "Published" : "Draft"}
                  </span>
                </td>
                <td>{post.category?.name ?? "—"}</td>
                <td>{post.viewCount}</td>
                <td className="admin-hint">{formatDateTime(post.updatedAt)}</td>
                <td className="admin-table-actions">
                  {post.status === "PUBLISHED" ? (
                    <a
                      href={`/edition/${post.slug}`}
                      target="_blank"
                      rel="noreferrer"
                      className="admin-button admin-button--ghost"
                    >
                      View
                    </a>
                  ) : null}
                  <Link to={`/admin/blog/${post.id}`} className="admin-button">
                    Edit
                  </Link>
                  <button
                    type="button"
                    className="admin-button admin-button--danger"
                    onClick={() => {
                      if (window.confirm(`Delete "${post.title}"? This cannot be undone.`)) {
                        remove.mutate(post.id);
                      }
                    }}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
