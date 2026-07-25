import { useState } from "react";
import type { Project, Section } from "../../../lib/types";
import ImagePicker from "../ImagePicker";
import { Card, EmptyState } from "../ui";
import { moveInList, useCrud } from "./useCrud";

type Draft = Omit<Project, "id" | "order" | "sectionId">;

const emptyDraft = (): Draft => ({
  title: "",
  category: "",
  description: "",
  techTags: [],
  imageUrl: "",
  imageAlt: "",
  imagePublicId: null,
  linkUrl: "",
  linkLabel: "View Live Demo",
  isArchived: false,
  featured: false,
  isPublished: true,
});

function ProjectForm({
  draft,
  setDraft,
  onSave,
  onCancel,
  saving,
}: {
  draft: Draft;
  setDraft: (draft: Draft) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
}) {
  return (
    <div className="admin-item-form">
      <div className="admin-form-row">
        <label className="admin-field">
          <span>Title</span>
          <input
            value={draft.title}
            onChange={(event) => setDraft({ ...draft, title: event.target.value })}
          />
        </label>
        <label className="admin-field">
          <span>Category</span>
          <input
            value={draft.category}
            placeholder="e.g. Telegram Bot"
            onChange={(event) => setDraft({ ...draft, category: event.target.value })}
          />
        </label>
      </div>

      <label className="admin-field">
        <span>Description</span>
        <textarea
          rows={3}
          value={draft.description}
          onChange={(event) => setDraft({ ...draft, description: event.target.value })}
        />
      </label>

      <label className="admin-field">
        <span>Technologies</span>
        <input
          value={draft.techTags.join(", ")}
          placeholder="Python, Telegram API, Regex"
          onChange={(event) =>
            setDraft({
              ...draft,
              techTags: event.target.value
                .split(",")
                .map((tag) => tag.trim())
                .filter(Boolean),
            })
          }
        />
        <small className="admin-hint">Separate with commas.</small>
      </label>

      <ImagePicker
        label="Screenshot"
        value={draft.imageUrl}
        folder="projects"
        onChange={(url, publicId) => setDraft({ ...draft, imageUrl: url, imagePublicId: publicId })}
      />

      <div className="admin-form-row">
        <label className="admin-field">
          <span>Link</span>
          <input
            value={draft.linkUrl ?? ""}
            placeholder="https://github.com/…"
            onChange={(event) => setDraft({ ...draft, linkUrl: event.target.value })}
          />
        </label>
        <label className="admin-field">
          <span>Link label</span>
          <input
            value={draft.linkLabel}
            onChange={(event) => setDraft({ ...draft, linkLabel: event.target.value })}
          />
        </label>
      </div>

      <div className="admin-checkbox-row">
        <label>
          <input
            type="checkbox"
            checked={draft.isArchived}
            onChange={(event) => setDraft({ ...draft, isArchived: event.target.checked })}
          />
          Archived (shows a muted label instead of a link)
        </label>
        <label>
          <input
            type="checkbox"
            checked={draft.featured}
            onChange={(event) => setDraft({ ...draft, featured: event.target.checked })}
          />
          Featured
        </label>
        <label>
          <input
            type="checkbox"
            checked={draft.isPublished}
            onChange={(event) => setDraft({ ...draft, isPublished: event.target.checked })}
          />
          Visible
        </label>
      </div>

      <div className="admin-item-actions">
        <button
          type="button"
          className="admin-button admin-button--primary"
          onClick={onSave}
          disabled={
            saving ||
            !draft.title.trim() ||
            !draft.category.trim() ||
            !draft.description.trim() ||
            !draft.imageUrl.trim()
          }
        >
          {saving ? "Saving…" : "Save project"}
        </button>
        <button type="button" className="admin-button admin-button--ghost" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}

export default function ProjectsEditor({ section }: { section: Section }) {
  const projects = section.projects ?? [];
  const crud = useCrud("/admin/portfolio/projects", section.id);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft());
  const [adding, setAdding] = useState(false);

  const startEdit = (project: Project) => {
    setAdding(false);
    setEditingId(project.id);
    setDraft({
      title: project.title,
      category: project.category,
      description: project.description,
      techTags: project.techTags,
      imageUrl: project.imageUrl,
      imageAlt: project.imageAlt,
      imagePublicId: project.imagePublicId,
      linkUrl: project.linkUrl ?? "",
      linkLabel: project.linkLabel,
      isArchived: project.isArchived,
      featured: project.featured,
      isPublished: project.isPublished,
    });
  };

  const reset = () => {
    setEditingId(null);
    setAdding(false);
    setDraft(emptyDraft());
  };

  const save = () => {
    const body = { ...draft, sectionId: section.id, linkUrl: draft.linkUrl || null };
    if (editingId) crud.update.mutate({ id: editingId, body }, { onSuccess: reset });
    else crud.create.mutate(body, { onSuccess: reset });
  };

  return (
    <Card title={`Projects (${projects.length})`}>
      {projects.length === 0 && !adding ? (
        <EmptyState message="No projects in this section yet." />
      ) : null}

      <div className="admin-item-list">
        {projects.map((project, index) => (
          <div key={project.id} className="admin-item">
            {editingId === project.id ? (
              <ProjectForm
                draft={draft}
                setDraft={setDraft}
                onSave={save}
                onCancel={reset}
                saving={crud.update.isPending}
              />
            ) : (
              <div className="admin-item-summary">
                {project.imageUrl ? (
                  <img className="admin-item-thumb" src={project.imageUrl} alt="" />
                ) : null}
                <div className="admin-item-text">
                  <strong>{project.title}</strong>
                  <span className="admin-hint">
                    {project.category}
                    {project.isArchived ? " · archived" : ""}
                    {project.isPublished ? "" : " · hidden"}
                  </span>
                </div>
                <div className="admin-item-buttons">
                  <button
                    type="button"
                    aria-label="Move up"
                    disabled={index === 0}
                    onClick={() => {
                      const ids = moveInList(projects, index, -1);
                      if (ids) crud.reorder.mutate(ids);
                    }}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    aria-label="Move down"
                    disabled={index === projects.length - 1}
                    onClick={() => {
                      const ids = moveInList(projects, index, 1);
                      if (ids) crud.reorder.mutate(ids);
                    }}
                  >
                    ↓
                  </button>
                  <button type="button" className="admin-button" onClick={() => startEdit(project)}>
                    Edit
                  </button>
                  <button
                    type="button"
                    className="admin-button admin-button--danger"
                    onClick={() => {
                      if (window.confirm(`Delete "${project.title}"?`)) {
                        crud.remove.mutate(project.id);
                      }
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {adding ? (
        <div className="admin-item">
          <ProjectForm
            draft={draft}
            setDraft={setDraft}
            onSave={save}
            onCancel={reset}
            saving={crud.create.isPending}
          />
        </div>
      ) : (
        <button
          type="button"
          className="admin-button admin-button--primary"
          onClick={() => {
            reset();
            setAdding(true);
          }}
        >
          Add project
        </button>
      )}
    </Card>
  );
}
