import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../../lib/api";
import type { Section } from "../../../lib/types";
import { Card } from "../ui";

const ICONS = [
  { value: "download", label: "Download" },
  { value: "github", label: "GitHub" },
  { value: "link", label: "Link" },
  { value: "email", label: "Email" },
];

export default function CtaEditor({ section }: { section: Section }) {
  const queryClient = useQueryClient();
  const cta = section.cta;

  const [heading, setHeading] = useState(cta?.heading ?? section.title);
  const [subheading, setSubheading] = useState(cta?.subheading ?? "");
  const [buttonLabel, setButtonLabel] = useState(cta?.buttonLabel ?? "Open");
  const [buttonUrl, setButtonUrl] = useState(cta?.buttonUrl ?? "");
  const [icon, setIcon] = useState(cta?.icon ?? "link");
  const [decoration, setDecoration] = useState(cta?.decoration ?? "");
  const [saved, setSaved] = useState(false);

  const save = useMutation({
    mutationFn: () =>
      api.put(`/admin/sections/${section.id}/cta`, {
        heading,
        subheading: subheading || null,
        buttonLabel,
        buttonUrl,
        icon,
        decoration: decoration || null,
      }),
    onSuccess: () => {
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2500);
      void queryClient.invalidateQueries({ queryKey: ["admin", "section", section.id] });
      void queryClient.invalidateQueries({ queryKey: ["site"] });
    },
  });

  return (
    <Card title="Banner content">
      <div className="admin-form-row">
        <label className="admin-field">
          <span>Heading</span>
          <input value={heading} onChange={(event) => setHeading(event.target.value)} />
        </label>
        <label className="admin-field">
          <span>Button label</span>
          <input value={buttonLabel} onChange={(event) => setButtonLabel(event.target.value)} />
        </label>
      </div>

      <label className="admin-field">
        <span>Subheading</span>
        <input value={subheading} onChange={(event) => setSubheading(event.target.value)} />
      </label>

      <label className="admin-field">
        <span>Button link</span>
        <input
          value={buttonUrl}
          placeholder="https://…"
          onChange={(event) => setButtonUrl(event.target.value)}
        />
      </label>

      <div className="admin-form-row">
        <label className="admin-field">
          <span>Icon</span>
          <select value={icon} onChange={(event) => setIcon(event.target.value)}>
            {ICONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="admin-field">
          <span>Corner decoration</span>
          <input
            value={decoration}
            placeholder="📄"
            maxLength={4}
            onChange={(event) => setDecoration(event.target.value)}
          />
          <small className="admin-hint">A single emoji shown faintly in the corner.</small>
        </label>
      </div>

      <div className="admin-item-actions">
        <button
          type="button"
          className="admin-button admin-button--primary"
          disabled={!heading.trim() || !buttonUrl.trim() || save.isPending}
          onClick={() => save.mutate()}
        >
          {save.isPending ? "Saving…" : "Save banner"}
        </button>
        {saved ? <span className="admin-saved-note">Saved</span> : null}
      </div>
    </Card>
  );
}
