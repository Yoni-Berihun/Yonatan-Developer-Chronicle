import { useState } from "react";
import type { Section, SkillCategory, SkillItem } from "../../../lib/types";
import { Card, EmptyState } from "../ui";
import { useCrud } from "./useCrud";

function ItemRow({
  item,
  sectionId,
  onDone,
}: {
  item: SkillItem;
  sectionId: string;
  onDone: () => void;
}) {
  const crud = useCrud("/admin/portfolio/skill-items", sectionId);
  const [editing, setEditing] = useState(false);
  const [heading, setHeading] = useState(item.heading);
  const [description, setDescription] = useState(item.description);

  if (!editing) {
    return (
      <div className="admin-item-summary">
        <div className="admin-item-text">
          <strong>{item.heading}</strong>
          <span className="admin-hint">{item.description.slice(0, 90)}…</span>
        </div>
        <div className="admin-item-buttons">
          <button type="button" className="admin-button" onClick={() => setEditing(true)}>
            Edit
          </button>
          <button
            type="button"
            className="admin-button admin-button--danger"
            onClick={() => {
              if (window.confirm(`Delete "${item.heading}"?`)) crud.remove.mutate(item.id);
            }}
          >
            Delete
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-item-form">
      <label className="admin-field">
        <span>Lead-in (shown in bold)</span>
        <input value={heading} onChange={(event) => setHeading(event.target.value)} />
      </label>
      <label className="admin-field">
        <span>Description</span>
        <textarea
          rows={3}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />
      </label>
      <div className="admin-item-actions">
        <button
          type="button"
          className="admin-button admin-button--primary"
          onClick={() =>
            crud.update.mutate(
              { id: item.id, body: { heading, description } },
              {
                onSuccess: () => {
                  setEditing(false);
                  onDone();
                },
              },
            )
          }
        >
          Save
        </button>
        <button
          type="button"
          className="admin-button admin-button--ghost"
          onClick={() => setEditing(false)}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function CategoryBlock({ category, sectionId }: { category: SkillCategory; sectionId: string }) {
  const categoryCrud = useCrud("/admin/portfolio/skill-categories", sectionId);
  const itemCrud = useCrud("/admin/portfolio/skill-items", sectionId);

  const [title, setTitle] = useState(category.title);
  const [adding, setAdding] = useState(false);
  const [heading, setHeading] = useState("");
  const [description, setDescription] = useState("");

  return (
    <div className="admin-subcard">
      <div className="admin-subcard-header">
        <input
          className="admin-inline-input"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          onBlur={() => {
            if (title.trim() && title !== category.title) {
              categoryCrud.update.mutate({ id: category.id, body: { title } });
            }
          }}
        />
        <button
          type="button"
          className="admin-button admin-button--danger"
          onClick={() => {
            if (window.confirm(`Delete the "${category.title}" column and its entries?`)) {
              categoryCrud.remove.mutate(category.id);
            }
          }}
        >
          Delete column
        </button>
      </div>

      <div className="admin-item-list">
        {category.items.map((item) => (
          <div key={item.id} className="admin-item">
            <ItemRow item={item} sectionId={sectionId} onDone={() => undefined} />
          </div>
        ))}
      </div>

      {adding ? (
        <div className="admin-item-form">
          <label className="admin-field">
            <span>Lead-in (shown in bold)</span>
            <input
              value={heading}
              placeholder="e.g. Python"
              onChange={(event) => setHeading(event.target.value)}
            />
          </label>
          <label className="admin-field">
            <span>Description</span>
            <textarea
              rows={3}
              value={description}
              placeholder="is my go-to language for automation…"
              onChange={(event) => setDescription(event.target.value)}
            />
          </label>
          <div className="admin-item-actions">
            <button
              type="button"
              className="admin-button admin-button--primary"
              disabled={!heading.trim() || !description.trim()}
              onClick={() =>
                itemCrud.create.mutate(
                  { categoryId: category.id, heading, description },
                  {
                    onSuccess: () => {
                      setHeading("");
                      setDescription("");
                      setAdding(false);
                    },
                  },
                )
              }
            >
              Add entry
            </button>
            <button
              type="button"
              className="admin-button admin-button--ghost"
              onClick={() => setAdding(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button type="button" className="admin-button" onClick={() => setAdding(true)}>
          Add entry
        </button>
      )}
    </div>
  );
}

export default function SkillsEditor({ section }: { section: Section }) {
  const crud = useCrud("/admin/portfolio/skill-categories", section.id);
  const [newTitle, setNewTitle] = useState("");

  return (
    <Card title={`Skill columns (${section.skillCategories.length})`}>
      {section.skillCategories.length === 0 ? (
        <EmptyState message="No columns yet. Add one to get started." />
      ) : null}

      {section.skillCategories.map((category) => (
        <CategoryBlock key={category.id} category={category} sectionId={section.id} />
      ))}

      <div className="admin-form-row admin-form-row--tight">
        <input
          value={newTitle}
          placeholder="New column title, e.g. Developer Tools"
          onChange={(event) => setNewTitle(event.target.value)}
        />
        <button
          type="button"
          className="admin-button admin-button--primary"
          disabled={!newTitle.trim()}
          onClick={() =>
            crud.create.mutate(
              { sectionId: section.id, title: newTitle },
              { onSuccess: () => setNewTitle("") },
            )
          }
        >
          Add column
        </button>
      </div>
    </Card>
  );
}
