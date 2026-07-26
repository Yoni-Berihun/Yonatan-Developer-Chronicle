import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../../lib/api";
import type { BlockType, ContentBlock, Section } from "../../../lib/types";
import ImagePicker from "../ImagePicker";
import { Card, EmptyState } from "../ui";

const BLOCK_TYPES: { value: BlockType; label: string }[] = [
  { value: "HEADING", label: "Heading" },
  { value: "PARAGRAPH", label: "Paragraph" },
  { value: "IMAGE", label: "Image" },
  { value: "QUOTE", label: "Pull quote" },
  { value: "LIST", label: "Bulleted list" },
  { value: "BUTTON", label: "Button" },
  { value: "DIVIDER", label: "Divider" },
  { value: "HTML", label: "Raw HTML" },
];

const defaultData = (type: BlockType): Record<string, unknown> => {
  switch (type) {
    case "HEADING":
      return { text: "A new heading" };
    case "PARAGRAPH":
      return { text: "" };
    case "IMAGE":
      return { url: "", alt: "", caption: "" };
    case "QUOTE":
      return { text: "", attribution: "" };
    case "LIST":
      return { items: [""] };
    case "BUTTON":
      return { label: "Read more", url: "" };
    case "HTML":
      return { html: "" };
    default:
      return {};
  }
};

const str = (value: unknown): string => (typeof value === "string" ? value : "");

function BlockFields({
  type,
  data,
  onChange,
}: {
  type: BlockType;
  data: Record<string, unknown>;
  onChange: (data: Record<string, unknown>) => void;
}) {
  switch (type) {
    case "HEADING":
      return (
        <label className="admin-field">
          <span>Heading text</span>
          <input value={str(data.text)} onChange={(e) => onChange({ ...data, text: e.target.value })} />
        </label>
      );

    case "PARAGRAPH":
      return (
        <label className="admin-field">
          <span>Text</span>
          <textarea
            rows={4}
            value={str(data.text)}
            onChange={(e) => onChange({ ...data, text: e.target.value })}
          />
        </label>
      );

    case "IMAGE":
      return (
        <>
          <ImagePicker
            label="Image"
            value={str(data.url)}
            folder="sections"
            onChange={(url) => onChange({ ...data, url })}
          />
          <div className="admin-form-row">
            <label className="admin-field">
              <span>Alt text</span>
              <input value={str(data.alt)} onChange={(e) => onChange({ ...data, alt: e.target.value })} />
            </label>
            <label className="admin-field">
              <span>Caption</span>
              <input
                value={str(data.caption)}
                onChange={(e) => onChange({ ...data, caption: e.target.value })}
              />
            </label>
          </div>
        </>
      );

    case "QUOTE":
      return (
        <>
          <label className="admin-field">
            <span>Quote</span>
            <textarea
              rows={3}
              value={str(data.text)}
              onChange={(e) => onChange({ ...data, text: e.target.value })}
            />
          </label>
          <label className="admin-field">
            <span>Attribution</span>
            <input
              value={str(data.attribution)}
              onChange={(e) => onChange({ ...data, attribution: e.target.value })}
            />
          </label>
        </>
      );

    case "LIST": {
      const items = Array.isArray(data.items) ? data.items.map(str) : [];
      return (
        <label className="admin-field">
          <span>List items</span>
          <textarea
            rows={5}
            value={items.join("\n")}
            placeholder="One item per line"
            onChange={(e) =>
              onChange({ ...data, items: e.target.value.split("\n").filter((line) => line.trim()) })
            }
          />
          <small className="admin-hint">One item per line.</small>
        </label>
      );
    }

    case "BUTTON":
      return (
        <div className="admin-form-row">
          <label className="admin-field">
            <span>Label</span>
            <input
              value={str(data.label)}
              onChange={(e) => onChange({ ...data, label: e.target.value })}
            />
          </label>
          <label className="admin-field">
            <span>URL</span>
            <input value={str(data.url)} onChange={(e) => onChange({ ...data, url: e.target.value })} />
          </label>
        </div>
      );

    case "HTML":
      return (
        <label className="admin-field">
          <span>HTML</span>
          <textarea
            rows={6}
            className="admin-mono"
            value={str(data.html)}
            onChange={(e) => onChange({ ...data, html: e.target.value })}
          />
          <small className="admin-hint">Inserted as-is. Only use markup you trust.</small>
        </label>
      );

    default:
      return <p className="admin-hint">This block has no settings.</p>;
  }
};

function summarise(block: ContentBlock): string {
  const { data } = block;
  if (typeof data.text === "string" && data.text) return data.text.slice(0, 70);
  if (typeof data.label === "string" && data.label) return data.label;
  if (typeof data.url === "string" && data.url) return data.url;
  if (Array.isArray(data.items)) return `${data.items.length} items`;
  return "—";
}

export default function BlocksEditor({ section }: { section: Section }) {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftData, setDraftData] = useState<Record<string, unknown>>({});
  const [newType, setNewType] = useState<BlockType>("PARAGRAPH");

  const invalidate = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["admin", "section", section.id] }),
      queryClient.invalidateQueries({ queryKey: ["site"] }),
    ]);
  };

  const create = useMutation({
    mutationFn: (type: BlockType) =>
      api.post(`/admin/sections/${section.id}/blocks`, { type, data: defaultData(type) }),
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      api.put(`/admin/sections/blocks/${id}`, { data }),
    onSuccess: () => {
      setEditingId(null);
      void invalidate();
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.del(`/admin/sections/blocks/${id}`),
    onSuccess: invalidate,
  });

  const reorder = useMutation({
    mutationFn: (ids: string[]) => api.post(`/admin/sections/${section.id}/blocks/reorder`, { ids }),
    onSuccess: invalidate,
  });

  const blocks = section.blocks ?? [];

  const move = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= blocks.length) return;
    const ids = blocks.map((block) => block.id);
    const next = [...ids];
    const [moved] = next.splice(index, 1);
    next.splice(target, 0, moved!);
    reorder.mutate(next);
  };

  return (
    <Card title={`Content blocks (${blocks.length})`}>
      {blocks.length === 0 ? (
        <EmptyState message="This section is empty. Add a block below to start writing." />
      ) : null}

      <div className="admin-item-list">
        {blocks.map((block, index) => (
          <div key={block.id} className="admin-item">
            {editingId === block.id ? (
              <div className="admin-item-form">
                <BlockFields type={block.type} data={draftData} onChange={setDraftData} />
                <div className="admin-item-actions">
                  <button
                    type="button"
                    className="admin-button admin-button--primary"
                    onClick={() => update.mutate({ id: block.id, data: draftData })}
                  >
                    Save block
                  </button>
                  <button
                    type="button"
                    className="admin-button admin-button--ghost"
                    onClick={() => setEditingId(null)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="admin-item-summary">
                <span className="admin-block-type">
                  {BLOCK_TYPES.find((option) => option.value === block.type)?.label ?? block.type}
                </span>
                <div className="admin-item-text">
                  <span className="admin-hint">{summarise(block)}</span>
                </div>
                <div className="admin-item-buttons">
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
                    disabled={index === blocks.length - 1}
                    onClick={() => move(index, 1)}
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    className="admin-button"
                    onClick={() => {
                      setEditingId(block.id);
                      setDraftData(block.data);
                    }}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="admin-button admin-button--danger"
                    onClick={() => remove.mutate(block.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="admin-form-row admin-form-row--tight">
        <select value={newType} onChange={(event) => setNewType(event.target.value as BlockType)}>
          {BLOCK_TYPES.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="admin-button admin-button--primary"
          onClick={() => create.mutate(newType)}
        >
          Add block
        </button>
      </div>
    </Card>
  );
}
