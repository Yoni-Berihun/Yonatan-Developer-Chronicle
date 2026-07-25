import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ApiError, api } from "../../lib/api";
import type { AdminPostDetail, AdminPostSummary, Category } from "../../lib/types";
import ImagePicker from "../components/ImagePicker";
import { Card, PageHeader, Spinner } from "../components/ui";

interface Draft {
  title: string;
  slug: string;
  excerpt: string;
  contentMarkdown: string;
  coverImageUrl: string;
  coverImageAlt: string;
  coverPublicId: string | null;
  status: "DRAFT" | "PUBLISHED";
  isFeatured: boolean;
  metaTitle: string;
  metaDescription: string;
  categoryId: string;
  tagNames: string[];
  relatedPostIds: string[];
}

const emptyDraft = (): Draft => ({
  title: "",
  slug: "",
  excerpt: "",
  contentMarkdown: "",
  coverImageUrl: "",
  coverImageAlt: "",
  coverPublicId: null,
  status: "DRAFT",
  isFeatured: false,
  metaTitle: "",
  metaDescription: "",
  categoryId: "",
  tagNames: [],
  relatedPostIds: [],
});

export default function PostEditorPage() {
  const { id } = useParams();
  const isNew = !id || id === "new";
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [draft, setDraft] = useState<Draft>(emptyDraft());
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const existing = useQuery({
    queryKey: ["admin", "post", id],
    queryFn: () => api.get<{ post: AdminPostDetail }>(`/admin/blog/posts/${id}`),
    enabled: !isNew,
  });

  const categories = useQuery({
    queryKey: ["admin", "categories"],
    queryFn: () => api.get<{ categories: Category[] }>("/admin/blog/categories"),
  });

  const allPosts = useQuery({
    queryKey: ["admin", "posts"],
    queryFn: () => api.get<{ posts: AdminPostSummary[] }>("/admin/blog/posts"),
  });

  useEffect(() => {
    if (!existing.data) return;
    const post = existing.data.post;
    setDraft({
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt,
      contentMarkdown: post.contentMarkdown,
      coverImageUrl: post.coverImageUrl ?? "",
      coverImageAlt: post.coverImageAlt,
      coverPublicId: post.coverPublicId,
      status: post.status,
      isFeatured: post.isFeatured,
      metaTitle: post.metaTitle ?? "",
      metaDescription: post.metaDescription ?? "",
      categoryId: post.categoryId ?? "",
      tagNames: post.tags.map((tag) => tag.name),
      relatedPostIds: post.relatedPostIds,
    });
  }, [existing.data]);

  const save = useMutation({
    mutationFn: (status: "DRAFT" | "PUBLISHED") => {
      const body = {
        ...draft,
        status,
        slug: draft.slug || undefined,
        excerpt: draft.excerpt || undefined,
        coverImageUrl: draft.coverImageUrl || null,
        metaTitle: draft.metaTitle || null,
        metaDescription: draft.metaDescription || null,
        categoryId: draft.categoryId || null,
      };
      return isNew
        ? api.post<{ post: AdminPostDetail }>("/admin/blog/posts", body)
        : api.put<{ post: AdminPostDetail }>(`/admin/blog/posts/${id}`, body);
    },
    onSuccess: (result) => {
      setError("");
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2500);
      void queryClient.invalidateQueries({ queryKey: ["admin", "posts"] });
      if (isNew) navigate(`/admin/blog/${result.post.id}`, { replace: true });
    },
    onError: (caught) => {
      setError(caught instanceof ApiError ? caught.message : "Could not save the article.");
    },
  });

  if (!isNew && existing.isLoading) return <Spinner />;

  return (
    <>
      <PageHeader
        title={isNew ? "New article" : "Edit article"}
        description={
          draft.status === "PUBLISHED"
            ? "This article is live. Changes publish as soon as you save."
            : "This is a draft. Nobody can see it until you publish."
        }
        actions={
          <Link to="/admin/blog" className="admin-button admin-button--ghost">
            ← All articles
          </Link>
        }
      />

      {error ? <p className="admin-error">{error}</p> : null}

      <div className="admin-editor-grid">
        <div className="admin-editor-main">
          <Card>
            <label className="admin-field">
              <span>Headline</span>
              <input
                className="admin-title-input"
                value={draft.title}
                placeholder="What is this article about?"
                onChange={(event) => setDraft({ ...draft, title: event.target.value })}
              />
            </label>

            <label className="admin-field">
              <span>Standfirst</span>
              <textarea
                rows={2}
                value={draft.excerpt}
                placeholder="One or two sentences shown on cards and in search results."
                onChange={(event) => setDraft({ ...draft, excerpt: event.target.value })}
              />
              <small className="admin-hint">
                Leave blank to generate it from the opening of the article.
              </small>
            </label>

            <div className="admin-editor-toolbar">
              <span className="admin-field-label">Body (Markdown)</span>
              <button
                type="button"
                className="admin-button admin-button--ghost"
                onClick={() => setShowPreview((open) => !open)}
              >
                {showPreview ? "Write" : "Preview"}
              </button>
            </div>

            {showPreview ? (
              <div className="admin-preview article-body">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {draft.contentMarkdown || "_Nothing written yet._"}
                </ReactMarkdown>
              </div>
            ) : (
              <textarea
                className="admin-markdown"
                rows={22}
                value={draft.contentMarkdown}
                placeholder={"## A heading\n\nWrite in Markdown. **Bold**, _italic_, [links](https://example.com), lists and code blocks all work."}
                onChange={(event) => setDraft({ ...draft, contentMarkdown: event.target.value })}
              />
            )}
          </Card>
        </div>

        <div className="admin-editor-side">
          <Card title="Publishing">
            <div className="admin-item-actions admin-item-actions--stack">
              <button
                type="button"
                className="admin-button admin-button--primary"
                disabled={!draft.title.trim() || save.isPending}
                onClick={() => save.mutate("PUBLISHED")}
              >
                {draft.status === "PUBLISHED" ? "Update live article" : "Publish"}
              </button>
              <button
                type="button"
                className="admin-button"
                disabled={!draft.title.trim() || save.isPending}
                onClick={() => save.mutate("DRAFT")}
              >
                Save as draft
              </button>
              {saved ? <span className="admin-saved-note">Saved</span> : null}
            </div>

            <label className="admin-checkbox">
              <input
                type="checkbox"
                checked={draft.isFeatured}
                onChange={(event) => setDraft({ ...draft, isFeatured: event.target.checked })}
              />
              Feature on the front page
            </label>
          </Card>

          <Card title="Organisation">
            <label className="admin-field">
              <span>Category</span>
              <select
                value={draft.categoryId}
                onChange={(event) => setDraft({ ...draft, categoryId: event.target.value })}
              >
                <option value="">No category</option>
                {categories.data?.categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="admin-field">
              <span>Tags</span>
              <input
                value={draft.tagNames.join(", ")}
                placeholder="python, telegram, learning"
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    tagNames: event.target.value
                      .split(",")
                      .map((tag) => tag.trim())
                      .filter(Boolean),
                  })
                }
              />
              <small className="admin-hint">Comma separated. New tags are created for you.</small>
            </label>

            <label className="admin-field">
              <span>URL slug</span>
              <input
                value={draft.slug}
                placeholder="generated-from-the-headline"
                onChange={(event) => setDraft({ ...draft, slug: event.target.value })}
              />
            </label>
          </Card>

          <Card title="Cover image">
            <ImagePicker
              label=""
              value={draft.coverImageUrl}
              folder="articles"
              onChange={(url, publicId) =>
                setDraft({ ...draft, coverImageUrl: url, coverPublicId: publicId })
              }
            />
            <label className="admin-field">
              <span>Alt text</span>
              <input
                value={draft.coverImageAlt}
                onChange={(event) => setDraft({ ...draft, coverImageAlt: event.target.value })}
              />
            </label>
          </Card>

          <Card title="Related reading">
            <p className="admin-hint">
              Pick up to six articles. Leave empty and the site suggests others from the same
              category.
            </p>
            <div className="admin-checkbox-list">
              {allPosts.data?.posts
                .filter((post) => post.id !== id)
                .map((post) => (
                  <label key={post.id} className="admin-checkbox">
                    <input
                      type="checkbox"
                      checked={draft.relatedPostIds.includes(post.id)}
                      onChange={(event) =>
                        setDraft({
                          ...draft,
                          relatedPostIds: event.target.checked
                            ? [...draft.relatedPostIds, post.id].slice(0, 6)
                            : draft.relatedPostIds.filter((value) => value !== post.id),
                        })
                      }
                    />
                    {post.title}
                  </label>
                ))}
            </div>
          </Card>

          <Card title="Search appearance">
            <label className="admin-field">
              <span>Meta title</span>
              <input
                value={draft.metaTitle}
                placeholder={draft.title}
                onChange={(event) => setDraft({ ...draft, metaTitle: event.target.value })}
              />
            </label>
            <label className="admin-field">
              <span>Meta description</span>
              <textarea
                rows={3}
                value={draft.metaDescription}
                placeholder={draft.excerpt}
                onChange={(event) => setDraft({ ...draft, metaDescription: event.target.value })}
              />
            </label>
          </Card>
        </div>
      </div>
    </>
  );
}
