import React, { useEffect, useMemo, useRef, useState } from "react";
import "../css/BadgeForm.css";
import { Loader2 } from "lucide-react";

const BACKEND_URL = import.meta.env.VITE_API_TARGET || "";
const DEFAULT_BADGE_IMAGE_URL = `${BACKEND_URL}/public/images/Badge.jpg`;

// Convert stored imageUrl to browser-usable URL
const getBadgeImageUrl = (imageUrl: string | null | undefined): string => {
  if (!imageUrl) return DEFAULT_BADGE_IMAGE_URL;

  const trimmed = imageUrl.trim();
  if (!trimmed) return DEFAULT_BADGE_IMAGE_URL;

  // absolute URL
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }

  // local stored path: "/images/xxx" or "\images\xxx"
  const cleanedPath = trimmed.replace(/\\/g, "/");
  const imagePrefix = "/images/";
  const idx = cleanedPath.indexOf(imagePrefix);

  if (idx !== -1) {
    // IMPORTANT: your backend serves images from /public/images
    // If stored path is "/images/badge/xxx.png" => filename is "badge/xxx.png"
    const filename = cleanedPath.substring(idx + imagePrefix.length);
    return `${BACKEND_URL}/public/images/${filename}`;
  }

  return DEFAULT_BADGE_IMAGE_URL;
};

export interface ExhibitOption {
  exhibitId: string;
  exhibitTitle: string;
  exhibitionId: string;
  exhibitionTitle: string;
}

export interface BadgeFormValues {
  name: string;
  description: string;
  style: string;
  imageUrl: string;
  exhibitId: string;
  imageFile?: File | null;
}

interface BadgeFormProps {
  mode: "create" | "edit";
  styles: string[];
  exhibits: ExhibitOption[];
  initialValues?: Partial<BadgeFormValues>;
  onCancel: () => void;
  onSubmit: (values: BadgeFormValues) => Promise<void> | void;
  submitting?: boolean;
}

const DEFAULT_VALUES: BadgeFormValues = {
  name: "",
  description: "",
  style: "",
  imageUrl: "",
  exhibitId: "",
  imageFile: null,
};

const BadgeForm: React.FC<BadgeFormProps> = ({
  mode,
  styles,
  exhibits,
  initialValues,
  onCancel,
  onSubmit,
  submitting = false,
}) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [style, setStyle] = useState("");
  const [imageUrl, setImageUrl] = useState(""); // DB path: /images/badge/xxx.png
  const [exhibitId, setExhibitId] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [styleMode, setStyleMode] = useState<"select" | "custom">("select");
  const [customStyle, setCustomStyle] = useState("");

  // group exhibits by exhibition
  const exhibitGroups = useMemo(() => {
    const map = new Map<string, { exhibitionTitle: string; items: ExhibitOption[] }>();

    for (const ex of exhibits) {
      if (!map.has(ex.exhibitionId)) {
        map.set(ex.exhibitionId, { exhibitionTitle: ex.exhibitionTitle, items: [] });
      }
      map.get(ex.exhibitionId)!.items.push(ex);
    }

    return Array.from(map.entries())
      .map(([exhibitionId, data]) => ({
        exhibitionId,
        exhibitionTitle: data.exhibitionTitle,
        items: data.items.sort((a, b) => a.exhibitTitle.localeCompare(b.exhibitTitle)),
      }))
      .sort((a, b) => a.exhibitionTitle.localeCompare(b.exhibitionTitle));
  }, [exhibits]);

  const didInitRef = useRef(false);

  useEffect(() => {
    // EDIT: always rehydrate
    if (mode === "edit") {
      const v = { ...DEFAULT_VALUES, ...initialValues } as BadgeFormValues;

      setName(v.name ?? "");
      setDescription(v.description ?? "");

      const initStyle = (v.style ?? "").trim();
      setStyle(initStyle);

      // Select style or custom
      const styleLower = initStyle.toLowerCase();
      const hasInList = styles.some((s) => s.toLowerCase() === styleLower);

      if (initStyle && hasInList) {
        setStyleMode("select");
        setCustomStyle("");
      } else if (initStyle) {
        setStyleMode("custom");
        setCustomStyle(initStyle);
      } else {
        setStyleMode("select");
        setCustomStyle("");
      }

      setImageUrl(v.imageUrl ?? "");
      setExhibitId(v.exhibitId ?? "");
      setImageFile(null);
      setError("");
      return;
    }

    // CREATE: init only once
    if (mode === "create" && !didInitRef.current) {
      didInitRef.current = true;
      const v = { ...DEFAULT_VALUES, ...initialValues } as BadgeFormValues;

      setName(v.name ?? "");
      setDescription(v.description ?? "");
      setImageUrl(v.imageUrl ?? "");

      const initStyle = (v.style?.trim() || styles[0] || "").trim();
      setStyle(initStyle);

      const styleLower = initStyle.toLowerCase();
      const hasInList = styles.some((s) => s.toLowerCase() === styleLower);

      if (initStyle && hasInList) {
        setStyleMode("select");
        setCustomStyle("");
      } else if (initStyle) {
        setStyleMode("custom");
        setCustomStyle(initStyle);
      } else {
        setStyleMode("select");
        setCustomStyle("");
      }

      setExhibitId(v.exhibitId || exhibits[0]?.exhibitId || "");
      setImageFile(null);
      setError("");
    }
  }, [mode, initialValues, styles, exhibits]);

  // - selected file => show file preview
  // - else => show existing stored imageUrl (edit) or default
  const previewSrc = useMemo(() => {
    if (imageFile) return URL.createObjectURL(imageFile);
    return getBadgeImageUrl(imageUrl);
  }, [imageFile, imageUrl]);

  // cleanup object URL
  useEffect(() => {
    if (!imageFile) return;
    const objUrl = URL.createObjectURL(imageFile);
    return () => URL.revokeObjectURL(objUrl);
  }, [imageFile]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;

    if (!file) {
      setImageFile(null);
      if (mode === "create") setImageUrl("");
      return;
    }

    if (!file.type.startsWith("image/")) {
      setError("Please upload a valid image file.");
      e.target.value = "";
      setImageFile(null);
      if (mode === "create") setImageUrl("");
      return;
    }

    setError("");
    setImageFile(file);

    const safeName = file.name.replace(/\\/g, "/").split("/").pop() || file.name;
    setImageUrl(`/images/badge/${safeName}`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (submitting) return;
    if (!name.trim()) return setError("Please enter a badge name.");
    if (!description.trim()) return setError("Please enter a description.");
    if (!style.trim()) return setError("Please select a style.");
    if (!exhibitId) return setError("Please select an exhibit.");

    if (mode === "create") {
      if (!imageFile) return setError("Please upload an image.");
      if (!imageUrl.trim()) return setError("Missing imageUrl (auto-generated). Please re-select an image.");
    }

    setError("");

    await onSubmit({
      name: name.trim(),
      description: description.trim(),
      style: style.trim(),
      imageUrl: imageUrl.trim(),
      exhibitId,
      imageFile,
    });
  };

  const shouldShowPreview = mode === "edit" || !!imageFile;

  return (
    <form onSubmit={handleSubmit} className="exhibit-form">
      {error && <p className="form-error">{error}</p>}

      {/* Assign Exhibit */}
      <div className="form-group">
        <label htmlFor="exhibitId">Assign to Exhibit</label>
        <select
          id="exhibitId"
          value={exhibitId}
          onChange={(e) => setExhibitId(e.target.value)}
          disabled={submitting || exhibits.length === 0}
          required
        >
          <option value="" disabled>
            -- Select an Exhibit --
          </option>

          {exhibitGroups.map((grp) => (
            <optgroup key={grp.exhibitionId} label={grp.exhibitionTitle}>
              {grp.items.map((ex) => (
                <option key={ex.exhibitId} value={ex.exhibitId}>
                  {ex.exhibitTitle}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>

      {/* Badge fields */}
      <div className="form-group">
        <label htmlFor="name">Badge Name</label>
        <input id="name" value={name} onChange={(e) => setName(e.target.value)} disabled={submitting} required />
      </div>

      <div className="form-group">
        <label htmlFor="description">Badge Description</label>
        <textarea
          id="description"
          rows={4}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={submitting}
        />
      </div>

      <div className="form-group">
        <label htmlFor="styleSelect">Badge Style</label>

        <select
          id="styleSelect"
          value={styleMode === "select" ? (style || "") : "__custom__"}
          onChange={(e) => {
            const v = e.target.value;

            if (v === "__custom__") {
              setStyleMode("custom");
              setStyle(customStyle || "");
            } else {
              setStyleMode("select");
              setStyle(v);
              setCustomStyle("");
            }
          }}
          disabled={submitting}
          required
        >
          <option value="" disabled>
            -- Select a style --
          </option>

          {styles.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}

          <option value="__custom__">Custom...</option>
        </select>

        {styleMode === "custom" && (
          <input
            className="form-input"
            value={customStyle}
            onChange={(e) => {
              const v = e.target.value;
              setCustomStyle(v);
              setStyle(v);
            }}
            disabled={submitting}
            placeholder="Type a new style..."
            required
            style={{ marginTop: "0.5rem" }}
          />
        )}

        <p className="form-hint">Select an existing style, or choose Custom... to type a new one.</p>
      </div>

      {/* Image Upload */}
      <div className="form-section">
        <h3>Badge Image</h3>

        <div className="form-group">
          <label htmlFor="badgeImage">Upload Image</label>
          <input id="badgeImage" type="file" accept="image/*" onChange={handleFileChange} disabled={submitting} />

          {imageUrl ? (
            <p className="form-hint" style={{ marginTop: "0.5rem" }}>
              imageUrl (auto): <code>{imageUrl}</code>
            </p>
          ) : (
            <p className="form-hint" style={{ marginTop: "0.5rem" }}>
              {mode === "create" ? "Please upload an image (required)." : "Upload a new image to replace the current one (optional)."}
            </p>
          )}
        </div>

        {shouldShowPreview ? (
          <div className="existing-image-item" style={{ marginTop: "0.5rem" }}>
            <img src={previewSrc} alt="Badge preview" />
          </div>
        ) : (
          <p className="form-hint" style={{ marginTop: "0.5rem" }}>
            No image selected yet.
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="form-actions">
        <button type="button" className="button-secondary" onClick={onCancel} disabled={submitting}>
          Cancel
        </button>

        <button type="submit" className="button-primary" disabled={submitting}>
          {submitting ? (
            <>
              <Loader2 className="animate-spin" size={16} />
              {mode === "edit" ? "Saving..." : "Creating..."}
            </>
          ) : mode === "edit" ? (
            "Save Changes"
          ) : (
            "Create Badge"
          )}
        </button>
      </div>
    </form>
  );
};

export default BadgeForm;
