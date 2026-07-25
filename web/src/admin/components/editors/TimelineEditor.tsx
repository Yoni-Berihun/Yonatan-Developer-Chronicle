import { useState } from "react";
import type { Section, TimelineEntry } from "../../../lib/types";
import ImagePicker from "../ImagePicker";
import { Card, EmptyState } from "../ui";
import { moveInList, useCrud } from "./useCrud";

type Draft = Pick<
  TimelineEntry,
  "dateLabel" | "title" | "description" | "logoUrl" | "logoAlt" | "isPublished"
>;

const emptyDraft = (): Draft => ({
  dateLabel: "",
  title: "",
  description: "",
  logoUrl: "",
  logoAlt: "",
  isPublished: true,
});

export default function TimelineEditor({ section }: { section: Section }) {
  const entries = useCrud("/admin/portfolio/timeline", section.id);
  const stats = useCrud("/admin/portfolio/stats", section.id);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<Draft>(emptyDraft());

  const [statValue, setStatValue] = useState("");
  const [statLabel, setStatLabel] = useState("");

  const reset = () => {
    setEditingId(null);
    setAdding(false);
    setDraft(emptyDraft());
  };

  const save = () => {
    const body = { ...draft, sectionId: section.id, logoUrl: draft.logoUrl || null };
    if (editingId) entries.update.mutate({ id: editingId, body }, { onSuccess: reset });
    else entries.create.mutate(body, { onSuccess: reset });
  };

  const form = (
    <div className="admin-item-form">
      <div className="admin-form-row">
        <label className="admin-field">
          <span>Date label</span>
          <input
            value={draft.dateLabel}
            placeholder="2025 - Present"
            onChange={(event) => setDraft({ ...draft, dateLabel: event.target.value })}
          />
        </label>
        <label className="admin-field">
          <span>Title</span>
          <input
            value={draft.title}
            placeholder="Hawassa University | Hawassa, Ethiopia"
            onChange={(event) => setDraft({ ...draft, title: event.target.value })}
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

      <ImagePicker
        label="Logo"
        value={draft.logoUrl ?? ""}
        folder="logos"
        onChange={(url) => setDraft({ ...draft, logoUrl: url })}
      />

      <div className="admin-item-actions">
        <button
          type="button"
          className="admin-button admin-button--primary"
          disabled={!draft.title.trim() || !draft.dateLabel.trim()}
          onClick={save}
        >
          Save entry
        </button>
        <button type="button" className="admin-button admin-button--ghost" onClick={reset}>
          Cancel
        </button>
      </div>
    </div>
  );

  return (
    <>
      <Card title={`Timeline entries (${section.timelineEntries.length})`}>
        {section.timelineEntries.length === 0 && !adding ? (
          <EmptyState message="No entries yet." />
        ) : null}

        <div className="admin-item-list">
          {section.timelineEntries.map((entry, index) => (
            <div key={entry.id} className="admin-item">
              {editingId === entry.id ? (
                form
              ) : (
                <div className="admin-item-summary">
                  {entry.logoUrl ? (
                    <img className="admin-item-thumb admin-item-thumb--round" src={entry.logoUrl} alt="" />
                  ) : null}
                  <div className="admin-item-text">
                    <strong>{entry.title}</strong>
                    <span className="admin-hint">{entry.dateLabel}</span>
                  </div>
                  <div className="admin-item-buttons">
                    <button
                      type="button"
                      aria-label="Move up"
                      disabled={index === 0}
                      onClick={() => {
                        const ids = moveInList(section.timelineEntries, index, -1);
                        if (ids) entries.reorder.mutate(ids);
                      }}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      aria-label="Move down"
                      disabled={index === section.timelineEntries.length - 1}
                      onClick={() => {
                        const ids = moveInList(section.timelineEntries, index, 1);
                        if (ids) entries.reorder.mutate(ids);
                      }}
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      className="admin-button"
                      onClick={() => {
                        setAdding(false);
                        setEditingId(entry.id);
                        setDraft({
                          dateLabel: entry.dateLabel,
                          title: entry.title,
                          description: entry.description,
                          logoUrl: entry.logoUrl ?? "",
                          logoAlt: entry.logoAlt,
                          isPublished: entry.isPublished,
                        });
                      }}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="admin-button admin-button--danger"
                      onClick={() => {
                        if (window.confirm(`Delete "${entry.title}"?`)) {
                          entries.remove.mutate(entry.id);
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
          <div className="admin-item">{form}</div>
        ) : (
          <button
            type="button"
            className="admin-button admin-button--primary"
            onClick={() => {
              reset();
              setAdding(true);
            }}
          >
            Add entry
          </button>
        )}
      </Card>

      <Card title={`By the Numbers (${section.stats.length})`}>
        <div className="admin-stat-editor">
          {section.stats.map((stat) => (
            <div key={stat.id} className="admin-stat-chip">
              <strong>{stat.value}</strong>
              <span>{stat.label}</span>
              <button
                type="button"
                aria-label={`Delete ${stat.label}`}
                onClick={() => stats.remove.mutate(stat.id)}
              >
                ×
              </button>
            </div>
          ))}
        </div>

        <div className="admin-form-row admin-form-row--tight">
          <input
            value={statValue}
            placeholder="6+"
            onChange={(event) => setStatValue(event.target.value)}
          />
          <input
            value={statLabel}
            placeholder="Programming Languages"
            onChange={(event) => setStatLabel(event.target.value)}
          />
          <button
            type="button"
            className="admin-button admin-button--primary"
            disabled={!statValue.trim() || !statLabel.trim()}
            onClick={() =>
              stats.create.mutate(
                { sectionId: section.id, value: statValue, label: statLabel },
                {
                  onSuccess: () => {
                    setStatValue("");
                    setStatLabel("");
                  },
                },
              )
            }
          >
            Add
          </button>
        </div>
      </Card>
    </>
  );
}
