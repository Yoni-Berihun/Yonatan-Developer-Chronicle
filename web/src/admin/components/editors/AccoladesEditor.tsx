import { useState } from "react";
import type { Accolade, Section } from "../../../lib/types";
import ImagePicker from "../ImagePicker";
import { Card, EmptyState } from "../ui";
import { moveInList, useCrud } from "./useCrud";

type Draft = Pick<
  Accolade,
  "dateLabel" | "title" | "issuer" | "description" | "imageUrl" | "imageAlt" | "imagePublicId" | "isPublished"
>;

const emptyDraft = (): Draft => ({
  dateLabel: "",
  title: "",
  issuer: "",
  description: "",
  imageUrl: "",
  imageAlt: "",
  imagePublicId: null,
  isPublished: true,
});

export default function AccoladesEditor({ section }: { section: Section }) {
  const accolades = section.accolades ?? [];
  const crud = useCrud("/admin/portfolio/accolades", section.id);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<Draft>(emptyDraft());

  const reset = () => {
    setEditingId(null);
    setAdding(false);
    setDraft(emptyDraft());
  };

  const save = () => {
    const body = { ...draft, sectionId: section.id };
    if (editingId) crud.update.mutate({ id: editingId, body }, { onSuccess: reset });
    else crud.create.mutate(body, { onSuccess: reset });
  };

  const form = (
    <div className="admin-item-form">
      <div className="admin-form-row">
        <label className="admin-field">
          <span>Date label</span>
          <input
            value={draft.dateLabel}
            placeholder="May 2025"
            onChange={(event) => setDraft({ ...draft, dateLabel: event.target.value })}
          />
        </label>
        <label className="admin-field">
          <span>Title</span>
          <input
            value={draft.title}
            placeholder="Certificate Of Appreciation"
            onChange={(event) => setDraft({ ...draft, title: event.target.value })}
          />
        </label>
      </div>

      <label className="admin-field">
        <span>Issued by</span>
        <input
          value={draft.issuer}
          placeholder="As Awarded By Hawassa University"
          onChange={(event) => setDraft({ ...draft, issuer: event.target.value })}
        />
      </label>

      <label className="admin-field">
        <span>Description</span>
        <textarea
          rows={4}
          value={draft.description}
          onChange={(event) => setDraft({ ...draft, description: event.target.value })}
        />
      </label>

      <ImagePicker
        label="Certificate image"
        value={draft.imageUrl}
        folder="awards"
        onChange={(url, publicId) => setDraft({ ...draft, imageUrl: url, imagePublicId: publicId })}
      />

      <div className="admin-item-actions">
        <button
          type="button"
          className="admin-button admin-button--primary"
          disabled={
            !draft.title.trim() ||
            !draft.dateLabel.trim() ||
            !draft.issuer.trim() ||
            !draft.description.trim() ||
            !draft.imageUrl.trim()
          }
          onClick={save}
        >
          Save award
        </button>
        <button type="button" className="admin-button admin-button--ghost" onClick={reset}>
          Cancel
        </button>
      </div>
    </div>
  );

  return (
    <Card title={`Awards (${accolades.length})`}>
      {accolades.length === 0 && !adding ? <EmptyState message="No awards yet." /> : null}

      <div className="admin-item-list">
        {accolades.map((accolade, index) => (
          <div key={accolade.id} className="admin-item">
            {editingId === accolade.id ? (
              form
            ) : (
              <div className="admin-item-summary">
                <img className="admin-item-thumb" src={accolade.imageUrl} alt="" />
                <div className="admin-item-text">
                  <strong>{accolade.title}</strong>
                  <span className="admin-hint">
                    {accolade.dateLabel} · {accolade.issuer}
                  </span>
                </div>
                <div className="admin-item-buttons">
                  <button
                    type="button"
                    aria-label="Move up"
                    disabled={index === 0}
                    onClick={() => {
                      const ids = moveInList(accolades, index, -1);
                      if (ids) crud.reorder.mutate(ids);
                    }}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    aria-label="Move down"
                    disabled={index === accolades.length - 1}
                    onClick={() => {
                      const ids = moveInList(accolades, index, 1);
                      if (ids) crud.reorder.mutate(ids);
                    }}
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    className="admin-button"
                    onClick={() => {
                      setAdding(false);
                      setEditingId(accolade.id);
                      setDraft({
                        dateLabel: accolade.dateLabel,
                        title: accolade.title,
                        issuer: accolade.issuer,
                        description: accolade.description,
                        imageUrl: accolade.imageUrl,
                        imageAlt: accolade.imageAlt,
                        imagePublicId: accolade.imagePublicId,
                        isPublished: accolade.isPublished,
                      });
                    }}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="admin-button admin-button--danger"
                    onClick={() => {
                      if (window.confirm(`Delete "${accolade.title}"?`)) {
                        crud.remove.mutate(accolade.id);
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
          Add award
        </button>
      )}
    </Card>
  );
}
