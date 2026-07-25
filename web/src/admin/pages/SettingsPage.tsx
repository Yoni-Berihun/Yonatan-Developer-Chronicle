import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { ApiError, api } from "../../lib/api";
import type { SiteSettings, SocialLink } from "../../lib/types";
import ImagePicker from "../components/ImagePicker";
import { Card, PageHeader, Spinner } from "../components/ui";
import { useAdminAuth } from "../useAdminAuth";

const PLATFORMS = ["github", "linkedin", "x", "telegram", "instagram", "email", "link"];

function SocialLinksCard() {
  const queryClient = useQueryClient();
  const [platform, setPlatform] = useState("github");
  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");

  const { data } = useQuery({
    queryKey: ["admin", "social"],
    queryFn: () => api.get<{ socialLinks: SocialLink[] }>("/admin/settings/social"),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["admin", "social"] });

  const create = useMutation({
    mutationFn: () => api.post("/admin/settings/social", { platform, label, url, isActive: true }),
    onSuccess: () => {
      setLabel("");
      setUrl("");
      void invalidate();
    },
  });

  const update = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<SocialLink> }) =>
      api.put(`/admin/settings/social/${id}`, body),
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.del(`/admin/settings/social/${id}`),
    onSuccess: invalidate,
  });

  return (
    <Card title="Social links">
      <div className="admin-item-list">
        {(data?.socialLinks ?? []).map((link) => (
          <div key={link.id} className="admin-item-summary">
            <div className="admin-item-text">
              <strong>{link.label}</strong>
              <span className="admin-hint">{link.url}</span>
            </div>
            <div className="admin-item-buttons">
              <button
                type="button"
                className="admin-button admin-button--ghost"
                onClick={() => update.mutate({ id: link.id, body: { isActive: !link.isActive } })}
              >
                {link.isActive ? "Hide" : "Show"}
              </button>
              <button
                type="button"
                className="admin-button admin-button--danger"
                onClick={() => remove.mutate(link.id)}
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="admin-form-row admin-form-row--tight">
        <select value={platform} onChange={(event) => setPlatform(event.target.value)}>
          {PLATFORMS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <input value={label} placeholder="Label" onChange={(e) => setLabel(e.target.value)} />
        <input value={url} placeholder="https://…" onChange={(e) => setUrl(e.target.value)} />
        <button
          type="button"
          className="admin-button admin-button--primary"
          disabled={!label.trim() || !url.trim()}
          onClick={() => create.mutate()}
        >
          Add
        </button>
      </div>
    </Card>
  );
}

function PasswordCard() {
  const navigate = useNavigate();
  const { logout } = useAdminAuth();
  const [currentPassword, setCurrent] = useState("");
  const [newPassword, setNext] = useState("");
  const [message, setMessage] = useState("");

  const change = useMutation({
    mutationFn: () => api.post("/auth/change-password", { currentPassword, newPassword }),
    onSuccess: async () => {
      setMessage("Password changed. Signing you out…");
      setCurrent("");
      setNext("");
      // Server already cleared the cookie — finish the client logout so we
      // never leave a zombie "signed in" admin UI with 401s on every click.
      await logout();
      navigate("/admin/login", { replace: true });
    },
    onError: (caught) =>
      setMessage(caught instanceof ApiError ? caught.message : "Could not change the password."),
  });

  return (
    <Card title="Password">
      <div className="admin-form-row">
        <label className="admin-field">
          <span>Current password</span>
          <input
            type="password"
            value={currentPassword}
            autoComplete="current-password"
            onChange={(event) => setCurrent(event.target.value)}
          />
        </label>
        <label className="admin-field">
          <span>New password</span>
          <input
            type="password"
            value={newPassword}
            autoComplete="new-password"
            onChange={(event) => setNext(event.target.value)}
          />
          <small className="admin-hint">At least 10 characters.</small>
        </label>
      </div>

      {message ? <p className="admin-hint">{message}</p> : null}

      <button
        type="button"
        className="admin-button admin-button--primary"
        disabled={!currentPassword || newPassword.length < 10 || change.isPending}
        onClick={() => change.mutate()}
      >
        Change password
      </button>
    </Card>
  );
}

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<SiteSettings | null>(null);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "settings"],
    queryFn: () => api.get<{ settings: SiteSettings }>("/admin/settings"),
  });

  useEffect(() => {
    if (data) setForm(data.settings);
  }, [data]);

  const save = useMutation({
    mutationFn: () => {
      if (!form) throw new Error("Nothing to save");
      if (!form.aboutParagraphs.length) {
        throw new ApiError(400, "Add at least one biography paragraph before saving.");
      }
      if (!form.portraitUrl.trim()) {
        throw new ApiError(400, "A portrait image is required.");
      }
      if (!form.cvUrl.trim()) {
        throw new ApiError(400, "A CV download URL is required.");
      }
      const { id: _id, ...body } = form;
      return api.put("/admin/settings", body);
    },
    onSuccess: () => {
      setError("");
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2500);
      void queryClient.invalidateQueries({ queryKey: ["admin", "settings"] });
    },
    onError: (caught) => {
      if (caught instanceof ApiError) {
        const fields = Object.values(caught.fieldErrors);
        setError(fields.length ? `${caught.message}: ${fields.join("; ")}` : caught.message);
        return;
      }
      setError("Could not save the settings.");
    },
  });

  if (isLoading || !form) return <Spinner />;

  const set = <K extends keyof SiteSettings>(key: K, value: SiteSettings[K]) =>
    setForm({ ...form, [key]: value });

  return (
    <>
      <PageHeader
        title="Settings"
        description="The masthead, the introduction, and everything in the footer."
      />

      <Card title="Masthead">
        <div className="admin-form-row">
          <label className="admin-field">
            <span>Publication title</span>
            <input value={form.siteTitle} onChange={(e) => set("siteTitle", e.target.value)} />
          </label>
          <label className="admin-field">
            <span>Strapline</span>
            <input
              value={form.siteSubtitle}
              onChange={(e) => set("siteSubtitle", e.target.value)}
            />
          </label>
        </div>

        <div className="admin-form-row">
          <label className="admin-field">
            <span>Volume</span>
            <input value={form.volumeLabel} onChange={(e) => set("volumeLabel", e.target.value)} />
          </label>
          <label className="admin-field">
            <span>Edition</span>
            <input
              value={form.editionLabel}
              onChange={(e) => set("editionLabel", e.target.value)}
            />
          </label>
          <label className="admin-field">
            <span>Place (shown with the live clock)</span>
            <input
              value={form.datelineText}
              onChange={(e) => set("datelineText", e.target.value)}
              placeholder="Ethiopia"
            />
          </label>
        </div>
        <p className="admin-hint">
          Date and time on the site update live (East Africa Time). Only the place
          line above is edited here — e.g. <code>Ethiopia</code>.
        </p>
      </Card>

      <Card title="Introduction">
        <div className="admin-form-row">
          <label className="admin-field">
            <span>Your name</span>
            <input value={form.authorName} onChange={(e) => set("authorName", e.target.value)} />
          </label>
          <label className="admin-field">
            <span>Your title</span>
            <input
              value={form.authorSubtitle}
              onChange={(e) => set("authorSubtitle", e.target.value)}
            />
          </label>
        </div>

        <label className="admin-field">
          <span>Biography</span>
          <textarea
            rows={10}
            value={form.aboutParagraphs.join("\n\n")}
            onChange={(e) =>
              set(
                "aboutParagraphs",
                e.target.value.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean),
              )
            }
          />
          <small className="admin-hint">
            Separate paragraphs with a blank line. The first letter becomes the drop cap.
          </small>
        </label>

        <ImagePicker
          label="Portrait"
          value={form.portraitUrl}
          folder="portrait"
          onChange={(url) => set("portraitUrl", url)}
        />

        <label className="admin-field">
          <span>Portrait alt text</span>
          <input value={form.portraitAlt} onChange={(e) => set("portraitAlt", e.target.value)} />
        </label>
      </Card>

      <Card title="CV banner">
        <div className="admin-form-row">
          <label className="admin-field">
            <span>CV title</span>
            <input value={form.cvTitle} onChange={(e) => set("cvTitle", e.target.value)} />
          </label>
          <label className="admin-field">
            <span>CV button label context</span>
            <input value={form.cvSubtitle} onChange={(e) => set("cvSubtitle", e.target.value)} />
          </label>
        </div>
        <label className="admin-field">
          <span>CV download URL</span>
          <input
            value={form.cvUrl}
            placeholder="https://…"
            onChange={(e) => set("cvUrl", e.target.value)}
          />
        </label>
        <label className="admin-checkbox">
          <input
            type="checkbox"
            checked={form.cvEnabled}
            onChange={(e) => set("cvEnabled", e.target.checked)}
          />
          Show the credentials banner on the site
        </label>
      </Card>

      <Card title="Contact and footer">
        <label className="admin-field">
          <span>Contact form introduction</span>
          <textarea
            rows={3}
            value={form.contactIntro}
            onChange={(e) => set("contactIntro", e.target.value)}
          />
        </label>

        <label className="admin-field">
          <span>About the publication (footer)</span>
          <textarea
            rows={4}
            value={form.footerAbout}
            onChange={(e) => set("footerAbout", e.target.value)}
          />
        </label>

        <label className="admin-field">
          <span>Copyright line</span>
          <input value={form.copyright} onChange={(e) => set("copyright", e.target.value)} />
        </label>
      </Card>

      <Card title="Search appearance">
        <label className="admin-field">
          <span>Meta title</span>
          <input value={form.metaTitle} onChange={(e) => set("metaTitle", e.target.value)} />
        </label>
        <label className="admin-field">
          <span>Meta description</span>
          <textarea
            rows={3}
            value={form.metaDescription}
            onChange={(e) => set("metaDescription", e.target.value)}
          />
        </label>
        <ImagePicker
          label="Share image"
          value={form.ogImageUrl ?? ""}
          folder="social"
          hint="Shown when the site is shared on LinkedIn, X or Telegram. 1200×630 works best."
          onChange={(url) => set("ogImageUrl", url || null)}
        />
      </Card>

      {error ? <p className="admin-error">{error}</p> : null}

      <div className="admin-sticky-save">
        <button
          type="button"
          className="admin-button admin-button--primary"
          onClick={() => save.mutate()}
          disabled={
            save.isPending ||
            !form.aboutParagraphs.length ||
            !form.portraitUrl.trim() ||
            !form.cvUrl.trim()
          }
        >
          {save.isPending ? "Saving…" : "Save settings"}
        </button>
        {saved ? <span className="admin-saved-note">Saved</span> : null}
      </div>

      <SocialLinksCard />
      <PasswordCard />
    </>
  );
}
