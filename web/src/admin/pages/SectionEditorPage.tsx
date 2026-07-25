import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { api } from "../../lib/api";
import type { Section } from "../../lib/types";
import AccoladesEditor from "../components/editors/AccoladesEditor";
import BlocksEditor from "../components/editors/BlocksEditor";
import CtaEditor from "../components/editors/CtaEditor";
import ImpactEditor from "../components/editors/ImpactEditor";
import ProjectsEditor from "../components/editors/ProjectsEditor";
import SkillsEditor from "../components/editors/SkillsEditor";
import TimelineEditor from "../components/editors/TimelineEditor";
import { Card, PageHeader, Spinner } from "../components/ui";

export default function SectionEditorPage() {
  const { id } = useParams();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "section", id],
    queryFn: () => api.get<{ section: Section }>(`/admin/sections/${id}`),
    enabled: Boolean(id),
  });

  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [navLabel, setNavLabel] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!data) return;
    setTitle(data.section.title);
    setSubtitle(data.section.subtitle ?? "");
    const configured = data.section.config?.navLabel;
    setNavLabel(typeof configured === "string" ? configured : "");
  }, [data]);

  const save = useMutation({
    mutationFn: () =>
      api.put(`/admin/sections/${id}`, {
        title,
        subtitle: subtitle || null,
        config: (() => {
          const next = { ...(data?.section.config ?? {}) };
          if (navLabel.trim()) next.navLabel = navLabel.trim();
          else delete next.navLabel;
          return Object.keys(next).length > 0 ? next : null;
        })(),
      }),
    onSuccess: () => {
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2500);
      void queryClient.invalidateQueries({ queryKey: ["admin", "section", id] });
      void queryClient.invalidateQueries({ queryKey: ["admin", "sections"] });
    },
  });

  if (isLoading) return <Spinner />;
  if (!data) return <p className="admin-error">That section could not be loaded.</p>;

  const { section } = data;

  return (
    <>
      <PageHeader
        title={section.title}
        description={`Anchor: #${section.slug}`}
        actions={
          <Link to="/admin/sections" className="admin-button admin-button--ghost">
            ← All sections
          </Link>
        }
      />

      <Card title="Section heading">
        <div className="admin-form-row">
          <label className="admin-field">
            <span>Title</span>
            <input value={title} onChange={(event) => setTitle(event.target.value)} />
          </label>
          <label className="admin-field">
            <span>Menu label</span>
            <input
              value={navLabel}
              placeholder={section.slug}
              onChange={(event) => setNavLabel(event.target.value)}
            />
            <small className="admin-hint">Short text for the navigation bar.</small>
          </label>
        </div>

        <label className="admin-field">
          <span>Subtitle</span>
          <input
            value={subtitle}
            placeholder="Optional line under the heading"
            onChange={(event) => setSubtitle(event.target.value)}
          />
        </label>

        <div className="admin-item-actions">
          <button
            type="button"
            className="admin-button admin-button--primary"
            onClick={() => save.mutate()}
            disabled={save.isPending || !title.trim()}
          >
            {save.isPending ? "Saving…" : "Save heading"}
          </button>
          {saved ? <span className="admin-saved-note">Saved</span> : null}
        </div>
      </Card>

      {section.type === "PROJECTS" ? <ProjectsEditor section={section} /> : null}
      {section.type === "SKILLS" ? <SkillsEditor section={section} /> : null}
      {section.type === "TIMELINE" ? <TimelineEditor section={section} /> : null}
      {section.type === "ACCOLADES" ? <AccoladesEditor section={section} /> : null}
      {section.type === "IMPACT" ? <ImpactEditor section={section} /> : null}
      {section.type === "CTA" ? <CtaEditor section={section} /> : null}
      {section.type === "CUSTOM" ? <BlocksEditor section={section} /> : null}
      {section.type === "BLOG_TEASER" ? (
        <Card title="Blog teaser">
          <p className="admin-hint">
            This section automatically shows the three most recent published articles. Manage them
            under <Link to="/admin/blog">The Edition</Link>.
          </p>
        </Card>
      ) : null}
    </>
  );
}
