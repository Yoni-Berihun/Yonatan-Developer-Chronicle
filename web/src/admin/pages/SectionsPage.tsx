import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api } from "../../lib/api";
import type { AdminSectionSummary, SectionType } from "../../lib/types";
import { Card, EmptyState, PageHeader, Spinner } from "../components/ui";

const SECTION_TYPES: { value: SectionType; label: string; description: string }[] = [
  { value: "PROJECTS", label: "Projects", description: "A grid of project cards." },
  { value: "SKILLS", label: "Skills", description: "Columns of written skill descriptions." },
  { value: "TIMELINE", label: "Timeline", description: "Dated entries plus a statistics sidebar." },
  { value: "ACCOLADES", label: "Accolades", description: "A carousel of awards and certificates." },
  {
    value: "IMPACT",
    label: "Impact",
    description: "Community impact — metrics plus an image carousel of stories.",
  },
  { value: "CTA", label: "Banner", description: "A headline with a single call-to-action button." },
  { value: "BLOG_TEASER", label: "Blog teaser", description: "The three most recent articles." },
  {
    value: "CUSTOM",
    label: "Custom",
    description: "Build freely from headings, text and images — appears on the home page when published.",
  },
];

export default function SectionsPage() {
  const queryClient = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [type, setType] = useState<SectionType>("CUSTOM");

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "sections"],
    queryFn: () => api.get<{ sections: AdminSectionSummary[] }>("/admin/sections"),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["admin", "sections"] });

  const create = useMutation({
    mutationFn: () => api.post("/admin/sections", { title, type }),
    onSuccess: () => {
      setTitle("");
      setCreating(false);
      void invalidate();
    },
  });

  const togglePublish = useMutation({
    mutationFn: (section: AdminSectionSummary) =>
      api.put(`/admin/sections/${section.id}`, { isPublished: !section.isPublished }),
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.del(`/admin/sections/${id}`),
    onSuccess: invalidate,
  });

  const reorder = useMutation({
    mutationFn: (ids: string[]) => api.post("/admin/sections/reorder", { ids }),
    onSuccess: invalidate,
  });

  const move = (index: number, delta: number) => {
    if (!data) return;
    const ids = data.sections.map((section) => section.id);
    const target = index + delta;
    if (target < 0 || target >= ids.length) return;
    const next = [...ids];
    const [moved] = next.splice(index, 1);
    next.splice(target, 0, moved!);
    reorder.mutate(next);
  };

  return (
    <>
      <PageHeader
        title="Sections"
        description="These are the blocks of the front page, in the order visitors see them."
        actions={
          <button
            type="button"
            className="admin-button admin-button--primary"
            onClick={() => setCreating((open) => !open)}
          >
            {creating ? "Cancel" : "New section"}
          </button>
        }
      />

      {creating ? (
        <Card title="Create a section">
          <div className="admin-form-row">
            <label className="admin-field">
              <span>Title</span>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="e.g. From The Technology Desk"
              />
            </label>

            <label className="admin-field">
              <span>Type</span>
              <select value={type} onChange={(event) => setType(event.target.value as SectionType)}>
                {SECTION_TYPES.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <p className="admin-hint">
            {SECTION_TYPES.find((option) => option.value === type)?.description}
          </p>

          <button
            type="button"
            className="admin-button admin-button--primary"
            disabled={!title.trim() || create.isPending}
            onClick={() => create.mutate()}
          >
            {create.isPending ? "Creating…" : "Create section"}
          </button>
        </Card>
      ) : null}

      {isLoading ? (
        <Spinner />
      ) : !data || data.sections.length === 0 ? (
        <EmptyState message="No sections yet. Create one to start building the page." />
      ) : (
        <div className="admin-section-list">
          {data.sections.map((section, index) => (
            <article key={section.id} className="admin-section-row">
              <div className="admin-section-order">
                <button
                  type="button"
                  aria-label="Move up"
                  disabled={index === 0}
                  onClick={() => move(index, -1)}
                >
                  ↑
                </button>
                <button
                  type="button"
                  aria-label="Move down"
                  disabled={index === data.sections.length - 1}
                  onClick={() => move(index, 1)}
                >
                  ↓
                </button>
              </div>

              <div className="admin-section-main">
                <h3>
                  <Link to={`/admin/sections/${section.id}`}>{section.title}</Link>
                </h3>
                <p className="admin-hint">
                  <code>#{section.slug}</code> ·{" "}
                  {SECTION_TYPES.find((option) => option.value === section.type)?.label ??
                    section.type}
                  {section.type === "PROJECTS" ? ` · ${section._count.projects} projects` : ""}
                  {section.type === "SKILLS"
                    ? ` · ${section._count.skillCategories} categories`
                    : ""}
                  {section.type === "TIMELINE"
                    ? ` · ${section._count.timelineEntries} entries`
                    : ""}
                  {section.type === "ACCOLADES" ? ` · ${section._count.accolades} awards` : ""}
                  {section.type === "IMPACT"
                    ? ` · ${section._count.impactStories ?? 0} stories`
                    : ""}
                </p>
              </div>

              <div className="admin-section-actions">
                <span
                  className={`admin-pill admin-pill--${section.isPublished ? "published" : "draft"}`}
                >
                  {section.isPublished ? "Visible" : "Hidden"}
                </span>
                <button
                  type="button"
                  className="admin-button admin-button--ghost"
                  onClick={() => togglePublish.mutate(section)}
                >
                  {section.isPublished ? "Hide" : "Show"}
                </button>
                <Link to={`/admin/sections/${section.id}`} className="admin-button">
                  Edit
                </Link>
                <button
                  type="button"
                  className="admin-button admin-button--danger"
                  onClick={() => {
                    if (
                      window.confirm(
                        `Delete "${section.title}" and everything inside it? This cannot be undone.`,
                      )
                    ) {
                      remove.mutate(section.id);
                    }
                  }}
                >
                  Delete
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
