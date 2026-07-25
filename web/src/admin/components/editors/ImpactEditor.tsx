import { useState } from "react";
import type { ImpactStory, Section } from "../../../lib/types";
import ImagePicker from "../ImagePicker";
import { Card, EmptyState } from "../ui";
import { moveInList, useCrud } from "./useCrud";

type Draft = Pick<
  ImpactStory,
  "dateLabel" | "title" | "summary" | "imageUrl" | "imageAlt" | "imagePublicId" | "isPublished"
>;

const emptyDraft = (): Draft => ({
  dateLabel: "",
  title: "",
  summary: "",
  imageUrl: "",
  imageAlt: "",
  imagePublicId: null,
  isPublished: true,
});

export default function ImpactEditor({ section }: { section: Section }) {
  const stories = useCrud("/admin/portfolio/impact-stories", section.id);
  const metrics = useCrud("/admin/portfolio/impact-metrics", section.id);
  const impactStories = section.impactStories ?? [];
  const impactMetrics = section.impactMetrics ?? [];

  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<Draft>(emptyDraft());
  const [metricValue, setMetricValue] = useState("");
  const [metricLabel, setMetricLabel] = useState("");
  const saveError =
    (stories.create.error ?? stories.update.error ?? metrics.create.error) instanceof Error
      ? (stories.create.error ?? stories.update.error ?? metrics.create.error)?.message
      : null;

  const reset = () => {
    setEditingId(null);
    setAdding(false);
    setDraft(emptyDraft());
  };

  const save = () => {
    const body = { ...draft, sectionId: section.id };
    if (editingId) stories.update.mutate({ id: editingId, body }, { onSuccess: reset });
    else stories.create.mutate(body, { onSuccess: reset });
  };

  const form = (
    <div className="admin-item-form">
      <div className="admin-form-row">
        <label className="admin-field">
          <span>Date / kicker</span>
          <input
            value={draft.dateLabel}
            placeholder="Ongoing"
            onChange={(event) => setDraft({ ...draft, dateLabel: event.target.value })}
          />
        </label>
        <label className="admin-field">
          <span>Title</span>
          <input
            value={draft.title}
            placeholder="Digital Literacy Trainings"
            onChange={(event) => setDraft({ ...draft, title: event.target.value })}
          />
        </label>
      </div>

      <label className="admin-field">
        <span>Summary</span>
        <textarea
          rows={4}
          value={draft.summary}
          placeholder="What happened, who it served, why it matters."
          onChange={(event) => setDraft({ ...draft, summary: event.target.value })}
        />
      </label>

      <ImagePicker
        label="Carousel image"
        value={draft.imageUrl}
        folder="impact"
        onChange={(url, publicId) =>
          setDraft({ ...draft, imageUrl: url, imagePublicId: publicId ?? null })
        }
      />

      <label className="admin-field">
        <span>Image alt text</span>
        <input
          value={draft.imageAlt}
          onChange={(event) => setDraft({ ...draft, imageAlt: event.target.value })}
        />
      </label>

      <div className="admin-item-actions">
        <button
          type="button"
          className="admin-button admin-button--primary"
          disabled={
            !draft.title.trim() ||
            !draft.dateLabel.trim() ||
            !draft.summary.trim() ||
            !draft.imageUrl.trim()
          }
          onClick={save}
        >
          Save story
        </button>
        <button type="button" className="admin-button admin-button--ghost" onClick={reset}>
          Cancel
        </button>
      </div>
    </div>
  );

  return (
    <>
      <Card title={`Impact stories (${impactStories.length})`}>
        <p className="admin-hint">
          These slides power the public image carousel. Upload real workshop photos when you have
          them — placeholders work until then.
        </p>
        {saveError ? <p className="admin-error-inline">{saveError}</p> : null}

        {impactStories.length === 0 && !adding ? (
          <EmptyState message="No impact stories yet." />
        ) : null}

        <div className="admin-item-list">
          {impactStories.map((story, index) => (
            <div key={story.id} className="admin-item">
              {editingId === story.id ? (
                form
              ) : (
                <div className="admin-item-summary">
                  <img className="admin-item-thumb" src={story.imageUrl} alt="" />
                  <div className="admin-item-text">
                    <strong>{story.title}</strong>
                    <span className="admin-hint">{story.dateLabel}</span>
                  </div>
                  <div className="admin-item-buttons">
                    <button
                      type="button"
                      aria-label="Move up"
                      disabled={index === 0}
                      onClick={() => {
                        const ids = moveInList(impactStories, index, -1);
                        if (ids) stories.reorder.mutate(ids);
                      }}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      aria-label="Move down"
                      disabled={index === impactStories.length - 1}
                      onClick={() => {
                        const ids = moveInList(impactStories, index, 1);
                        if (ids) stories.reorder.mutate(ids);
                      }}
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      className="admin-button"
                      onClick={() => {
                        setAdding(false);
                        setEditingId(story.id);
                        setDraft({
                          dateLabel: story.dateLabel,
                          title: story.title,
                          summary: story.summary,
                          imageUrl: story.imageUrl,
                          imageAlt: story.imageAlt,
                          imagePublicId: story.imagePublicId,
                          isPublished: story.isPublished,
                        });
                      }}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="admin-button admin-button--danger"
                      onClick={() => {
                        if (window.confirm(`Delete "${story.title}"?`)) {
                          stories.remove.mutate(story.id);
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
            Add story
          </button>
        )}
      </Card>

      <Card title={`Impact metrics (${impactMetrics.length})`}>
        <p className="admin-hint">
          Number-first figures shown above the carousel. Put the digit in Value (30+, 15+) and the
          description in Label so you can update counts anytime.
        </p>

        <div className="admin-item-list">
          {impactMetrics.map((metric, index) => (
            <div key={metric.id} className="admin-item">
              <div className="admin-item-summary">
                <div className="admin-item-text">
                  <strong>
                    {metric.value} — {metric.label}
                  </strong>
                </div>
                <div className="admin-item-buttons">
                  <button
                    type="button"
                    aria-label="Move up"
                    disabled={index === 0}
                    onClick={() => {
                      const ids = moveInList(impactMetrics, index, -1);
                      if (ids) metrics.reorder.mutate(ids);
                    }}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    aria-label="Move down"
                    disabled={index === impactMetrics.length - 1}
                    onClick={() => {
                      const ids = moveInList(impactMetrics, index, 1);
                      if (ids) metrics.reorder.mutate(ids);
                    }}
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    className="admin-button admin-button--danger"
                    onClick={() => {
                      if (window.confirm(`Delete metric "${metric.label}"?`)) {
                        metrics.remove.mutate(metric.id);
                      }
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="admin-form-row" style={{ marginTop: "1rem" }}>
          <label className="admin-field">
            <span>Value</span>
            <input
              value={metricValue}
              placeholder="30+"
              onChange={(event) => setMetricValue(event.target.value)}
            />
          </label>
          <label className="admin-field">
            <span>Label</span>
            <input
              value={metricLabel}
              placeholder="Students mentored"
              onChange={(event) => setMetricLabel(event.target.value)}
            />
          </label>
        </div>
        <button
          type="button"
          className="admin-button admin-button--primary"
          disabled={!metricValue.trim() || !metricLabel.trim()}
          onClick={() => {
            metrics.create.mutate(
              { sectionId: section.id, value: metricValue.trim(), label: metricLabel.trim() },
              {
                onSuccess: () => {
                  setMetricValue("");
                  setMetricLabel("");
                },
              },
            );
          }}
        >
          Add metric
        </button>
      </Card>
    </>
  );
}
