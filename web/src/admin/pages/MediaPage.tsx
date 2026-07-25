import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError, api, apiRequest } from "../../lib/api";
import { formatBytes, formatDateTime } from "../../lib/format";
import type { MediaAsset } from "../../lib/types";
import { EmptyState, PageHeader, Spinner } from "../components/ui";

export default function MediaPage() {
  const queryClient = useQueryClient();
  const fileInput = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "media"],
    queryFn: () => api.get<{ assets: MediaAsset[] }>("/admin/media"),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["admin", "media"] });

  const upload = useMutation({
    mutationFn: (file: File) => {
      const form = new FormData();
      form.append("file", file);
      return apiRequest<{ asset: MediaAsset }>("/admin/media/upload", {
        method: "POST",
        body: form,
      });
    },
    onSuccess: () => {
      setError("");
      void invalidate();
    },
    onError: (caught) =>
      setError(caught instanceof ApiError ? caught.message : "The upload failed."),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.del(`/admin/media/${id}`),
    onSuccess: invalidate,
  });

  return (
    <>
      <PageHeader
        title="Media"
        description="Images uploaded here are stored on Cloudinary and served from its CDN."
        actions={
          <>
            <input
              ref={fileInput}
              type="file"
              accept="image/*"
              hidden
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) upload.mutate(file);
                event.target.value = "";
              }}
            />
            <button
              type="button"
              className="admin-button admin-button--primary"
              onClick={() => fileInput.current?.click()}
              disabled={upload.isPending}
            >
              {upload.isPending ? "Uploading…" : "Upload image"}
            </button>
          </>
        }
      />

      {error ? <p className="admin-error">{error}</p> : null}

      {isLoading ? (
        <Spinner />
      ) : !data || data.assets.length === 0 ? (
        <EmptyState message="Nothing uploaded yet. Images referenced by path (like /images/lo.png) still work." />
      ) : (
        <div className="admin-media-grid">
          {data.assets.map((asset) => (
            <figure key={asset.id} className="admin-media-card">
              <img src={asset.url} alt={asset.alt} />
              <figcaption>
                <span className="admin-hint">
                  {asset.width}×{asset.height} · {formatBytes(asset.bytes)}
                </span>
                <span className="admin-hint">{formatDateTime(asset.createdAt)}</span>
                <div className="admin-media-card-actions">
                  <button
                    type="button"
                    className="admin-button admin-button--ghost"
                    onClick={() => {
                      void navigator.clipboard.writeText(asset.url);
                      setCopied(asset.id);
                      window.setTimeout(() => setCopied(null), 2000);
                    }}
                  >
                    {copied === asset.id ? "Copied" : "Copy URL"}
                  </button>
                  <button
                    type="button"
                    className="admin-button admin-button--danger"
                    onClick={() => {
                      if (window.confirm("Delete this image? Anything using it will break.")) {
                        remove.mutate(asset.id);
                      }
                    }}
                  >
                    Delete
                  </button>
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      )}
    </>
  );
}
