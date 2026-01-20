import React, { useEffect, useMemo, useRef, useState } from "react";
import "../css/ExhibitForm.css";

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

  // local stored path
  const cleanedPath = trimmed.replace(/\\/g, "/");
  const imagePrefix = "/images/";
  const idx = cleanedPath.indexOf(imagePrefix);

  if (idx !== -1) {
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
  const [imageUrl, setImageUrl] = useState("");
  const [exhibitId, setExhibitId] = useState("");
  const [error, setError] = useState("");

  // group exhibits by exhibition (same UX as ExhibitForm)
  const exhibitGroups = useMemo(() => {
    const map = new Map<
      string,
      { exhibitionTitle: string; items: ExhibitOption[] }
    >();

    for (const ex of exhibits) {
      if (!map.has(ex.exhibitionId)) {
        map.set(ex.exhibitionId, {
          exhibitionTitle: ex.exhibitionTitle,
          items: [],
        });
      }
      map.get(ex.exhibitionId)!.items.push(ex);
    }

    return Array.from(map.entries())
      .map(([exhibitionId, data]) => ({
        exhibitionId,
        exhibitionTitle: data.exhibitionTitle,
        items: data.items.sort((a, b) =>
          a.exhibitTitle.localeCompare(b.exhibitTitle)
        ),
      }))
      .sort((a, b) =>
        a.exhibitionTitle.localeCompare(b.exhibitionTitle)
      );
  }, [exhibits]);

  const didInitRef = useRef(false);

  useEffect(() => {
    // EDIT: always rehydrate
    if (mode === "edit") {
      const v = { ...DEFAULT_VALUES, ...initialValues } as BadgeFormValues;
      setName(v.name ?? "");
      setDescription(v.description ?? "");
      setStyle((v.style ?? "").trim());
      setImageUrl(v.imageUrl ?? "");
      setExhibitId(v.exhibitId ?? "");
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
      setStyle(v.style?.trim() || styles[0] || "");
      setExhibitId(v.exhibitId || exhibits[0]?.exhibitId || "");
      setError("");
    }
  }, [mode, initialValues, styles, exhibits]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) return setError("Please enter a badge name.");
    if (!description.trim())
      return setError("Please enter a description.");
    if (!style.trim()) return setError("Please select a style.");
    if (!exhibitId) return setError("Please select an exhibit.");
    if (!imageUrl.trim())
      return setError("Please enter an image URL.");

    setError("");
    await onSubmit({
      name: name.trim(),
      description: description.trim(),
      style: style.trim(),
      imageUrl: imageUrl.trim(),
      exhibitId,
    });
  };

  const previewSrc = getBadgeImageUrl(imageUrl);

  const shouldShowPreview =
    mode === "edit" || imageUrl.trim().length > 0;

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
            <optgroup
              key={grp.exhibitionId}
              label={grp.exhibitionTitle}
            >
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
        <input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={submitting}
          required
        />
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
        <label htmlFor="style">Badge Style</label>

        <input
            id="style"
            className="form-input"
            value={style}
            onChange={(e) => setStyle(e.target.value)}
            disabled={submitting}
            placeholder="e.g. cute, funny, cool, vip..."
            list="badge-style-options"
            required
        />

        <datalist id="badge-style-options">
            {styles.map((s) => (
            <option key={s} value={s} />
            ))}
        </datalist>

        <p className="form-hint">
            You can type a new style. Existing styles are shown as suggestions.
        </p>
      </div>


      {/* Image */}
      <div className="form-section">
        <h3>Badge Image</h3>

        <div className="form-group">
          <label htmlFor="imageUrl">Image URL</label>
          <input
            id="imageUrl"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            disabled={submitting}
            placeholder="/images/badge.png or https://..."
          />
        </div>

        {shouldShowPreview ? (
          <div className="existing-image-item" style={{ marginTop: "0.5rem" }}>
            <img src={previewSrc} alt="Badge preview" />
          </div>
        ) : (
          <p className="form-hint" style={{ marginTop: "0.5rem" }}>
            Add an image URL to preview the badge image.
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="form-actions">
        <button
          type="button"
          className="button-secondary"
          onClick={onCancel}
          disabled={submitting}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="button-primary"
          disabled={submitting}
        >
          {mode === "edit" ? "Save Changes" : "Create Badge"}
        </button>
      </div>
    </form>
  );
};

export default BadgeForm;
