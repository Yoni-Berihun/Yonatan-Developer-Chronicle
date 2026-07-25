import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError, apiRequest } from "../../lib/api";
import type { MediaAsset } from "../../lib/types";

interface Props {
  label: string;
  value: string;
  onChange: (url: string, publicId: string | null) => void;
  folder?: string;
  hint?: string;
}

export default function ImagePicker({ label, value, onChange, folder, hint }: Props) {
  const [showLibrary, setShowLibrary] = useState(false);
  const [error, setError] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const library = useQuery({
    queryKey: ["admin", "media"],
    queryFn: () => apiRequest<{ assets: MediaAsset[] }>("/admin/media"),
    enabled: showLibrary,
  });

  const upload = useMutation({
    mutationFn: (file: File) => {
      const form = new FormData();
      form.append("file", file);
      if (folder) form.append("folder", folder);
      return apiRequest<{ asset: MediaAsset }>("/admin/media/upload", {
        method: "POST",
        body: form,
      });
    },
    onSuccess: (result) => {
      onChange(result.asset.url, result.asset.publicId);
      setError("");
      void queryClient.invalidateQueries({ queryKey: ["admin", "media"] });
    },
    onError: (caught) => {
      setError(caught instanceof ApiError ? caught.message : "Upload failed.");
    },
  });

  return (
    <div className="admin-image-picker">
      <span className="admin-field-label">{label}</span>

      <div className="admin-image-picker-body">
        <div className="admin-image-preview">
          {value ? <img src={value} alt="" /> : <span>No image</span>}
        </div>

        <div className="admin-image-controls">
          <input
            type="url"
            value={value}
            placeholder="https://… or /images/example.png"
            onChange={(event) => onChange(event.target.value, null)}
          />

          <div className="admin-image-buttons">
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
              className="admin-button"
              onClick={() => fileInput.current?.click()}
              disabled={upload.isPending}
            >
              {upload.isPending ? "Uploading…" : "Upload"}
            </button>
            <button
              type="button"
              className="admin-button admin-button--ghost"
              onClick={() => setShowLibrary((open) => !open)}
            >
              {showLibrary ? "Hide library" : "Choose existing"}
            </button>
            {value ? (
              <button
                type="button"
                className="admin-button admin-button--ghost"
                onClick={() => onChange("", null)}
              >
                Clear
              </button>
            ) : null}
          </div>

          {hint ? <small className="admin-hint">{hint}</small> : null}
          {error ? <small className="admin-error-inline">{error}</small> : null}
        </div>
      </div>

      {showLibrary ? (
        <div className="admin-media-strip">
          {library.isLoading ? <p className="admin-loading">Loading library…</p> : null}
          {library.data?.assets.map((asset) => (
            <button
              key={asset.id}
              type="button"
              className="admin-media-thumb"
              title={asset.alt || asset.publicId}
              onClick={() => {
                onChange(asset.url, asset.publicId);
                setShowLibrary(false);
              }}
            >
              <img src={asset.url} alt={asset.alt} />
            </button>
          ))}
          {library.data && library.data.assets.length === 0 ? (
            <p className="admin-hint">Nothing uploaded yet.</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
