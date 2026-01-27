import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import apiClient from "../../utils/apiClient";
import {
  Loader2,
  Info,
  Languages,
  Mic,
  ImageIcon,
  Plus,
  CheckCircle2,
  Sparkles,
  Award,
} from "lucide-react";
import "../css/ExhibitForm.css";

const BACKEND_URL = import.meta.env.VITE_API_TARGET || "";
const DEFAULT_IMAGE_URL = `${BACKEND_URL}/public/images/Exhibit.jpg`;

const getImageUrl = (fileUrl: string | null): string => {
  if (!fileUrl) return DEFAULT_IMAGE_URL;
  const cleanedPath = fileUrl.replace(/\\/g, "/");
  const imagePrefix = "/images/";
  const pathIndex = cleanedPath.indexOf(imagePrefix);
  if (pathIndex !== -1) {
    const filename = cleanedPath.substring(pathIndex + imagePrefix.length);
    return `${BACKEND_URL}/public/images/${filename}`;
  }
  return DEFAULT_IMAGE_URL;
};

interface ExhibitImage {
  imageId: string;
  fileUrl: string;
  isPrimary: boolean;
}
interface ExhibitToEdit {
  exhibitId: string;
  title: string;
  description: string;
  additionalDescription: string;
  exhibitionId: string;
  images: ExhibitImage[];
  isArEnabled: boolean;
  arExperienceUrl: string;
  badgeId?: string | null;
}
interface Language {
  languageId: string;
  title: string;
  code: string;
  status?: { statusName: string } | null;
}

// Badge option type
interface BadgeOption {
  badgeId: string;
  name: string;
  style?: string | null;
}

const ExhibitForm: React.FC<{
  exhibitToEdit: ExhibitToEdit | null;
  onSave: () => void;
  onClose: () => void;
  preselectedExhibitionId?: string | null;
}> = ({ exhibitToEdit, onSave, onClose, preselectedExhibitionId }) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [additionalDescription, setAdditionalDescription] = useState("");
  const [exhibitionId, setExhibitionId] = useState("");
  const [images, setImages] = useState<ExhibitImage[]>([]);
  const [primaryImageFile, setPrimaryImageFile] = useState<File | null>(null);
  const [ttsText, setTtsText] = useState("");
  const [loading, setLoading] = useState(false);
  const [availableExhibitions, setAvailableExhibitions] = useState<any[]>([]);
  const [languages, setLanguages] = useState<Language[]>([]);
  const [selectedLanguageId, setSelectedLanguageId] = useState("");
  const [isTranslatorVisible, setIsTranslatorVisible] = useState(false);
  const [sourceText, setSourceText] = useState("");
  const [isTranslating, setIsTranslating] = useState(false);
  const [isArEnabled, setIsArEnabled] = useState(false);
  const [arExperienceUrl, setArExperienceUrl] = useState("");

  // Badge states
  const [badges, setBadges] = useState<BadgeOption[]>([]);
  const [selectedBadgeId, setSelectedBadgeId] = useState<string>("none"); // "none" = no badge

  useEffect(() => {
    apiClient
      .get("/exhibitions")
      .then((res) => setAvailableExhibitions(res.data));
    apiClient.get<Language[]>("/language").then((res) => {
      const active = res.data.filter((l) => l.status?.statusName === "Active");
      setLanguages(active);
      if (active.length) setSelectedLanguageId(active[0].languageId);
    });
  }, []);

  // helper: fetch badge options for dropdown
  const fetchBadges = async (exId: string) => {
    if (!exId) {
      setBadges([]);
      setSelectedBadgeId("none");
      return;
    }

    try {
      // Preferred API: /badges/options?exhibitionId=xxx
      const res = await apiClient.get("/badges/options", {
        params: { exhibitionId: exId },
      });
      const list = Array.isArray(res.data) ? res.data : [];
      setBadges(
        list.map((b: any) => ({
          badgeId: String(b.badgeId),
          name: b.name ?? `Badge #${b.badgeId}`,
          style: b.style ?? null,
        })),
      );
    } catch (err) {
      // Fallback: use /badges/allBadges then filter by exhibitionId
      try {
        const res2 = await apiClient.get("/badges/allBadges");
        const all = Array.isArray(res2.data) ? res2.data : [];
        const filtered = all.filter(
          (b: any) =>
            String(b?.exhibit?.exhibition?.exhibitionId) === String(exId),
        );
        setBadges(
          filtered.map((b: any) => ({
            badgeId: String(b.badgeId),
            name: b.name ?? `Badge #${b.badgeId}`,
            style: b.style ?? null,
          })),
        );
      } catch (err2) {
        console.error("Error fetching badges:", err2);
        setBadges([]);
      }
    }
  };

  useEffect(() => {
    if (exhibitToEdit) {
      setTitle(exhibitToEdit.title || "");
      setDescription(exhibitToEdit.description || "");
      setAdditionalDescription(exhibitToEdit.additionalDescription || "");
      setExhibitionId(exhibitToEdit.exhibitionId || "");
      setImages(exhibitToEdit.images || []);
      setIsArEnabled(exhibitToEdit.isArEnabled);
      setArExperienceUrl(exhibitToEdit.arExperienceUrl || "");

      // preload selected badge for edit
      if (exhibitToEdit.badgeId) {
        setSelectedBadgeId(String(exhibitToEdit.badgeId));
      } else {
        setSelectedBadgeId("none");
      }
    } else if (preselectedExhibitionId) {
      setExhibitionId(preselectedExhibitionId);
    }
  }, [exhibitToEdit, preselectedExhibitionId]);

  // whenever exhibitionId changes, refresh badges
  useEffect(() => {
    if (!exhibitionId) return;
    fetchBadges(exhibitionId);
    // if creating new exhibit, default to none
    if (!exhibitToEdit) setSelectedBadgeId("none");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exhibitionId]);

  const handleTranslate = async () => {
    const lang = languages.find((l) => l.languageId === selectedLanguageId);
    if (!sourceText || !lang) return;
    setIsTranslating(true);
    try {
      const res = await apiClient.post("/translate", {
        text: sourceText,
        targetLanguage: lang.code,
      });
      setTtsText(res.data.translatedText);
      setIsTranslatorVisible(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsTranslating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      let currentId = exhibitToEdit?.exhibitId;

      const arValue = isArEnabled && arExperienceUrl && arExperienceUrl.trim() !== "" ? arExperienceUrl : "none";

      // normalize badgeId: "none" => "none" (backend converts to null), "" => "none"
      const badgeValue =
        selectedBadgeId && selectedBadgeId !== "" ? selectedBadgeId : "none";

      if (exhibitToEdit) {
        // send badgeId
        // If you want "not change badge unless user touched", you'd need extra state.
        // Here we always send what's currently selected (simple + predictable).
        await apiClient.put(`/exhibits/${currentId}`, {
          title,
          description,
          additionalDescription,
          exhibitionId,
          isArEnabled,
          arExperienceUrl: isArEnabled ? arExperienceUrl : null,
          badgeId: badgeValue, // "none" or an id
        });

        if (primaryImageFile) {
          const fd = new FormData();
          fd.append("images", primaryImageFile);
          fd.append("isPrimary", "true");
          await apiClient.post(`/exhibits/${currentId}/image`, fd);
        }
      } else {
        // create: FormData include badgeId (optional)
        const fd = new FormData();
        fd.append("title", title);
        fd.append("description", description);
        fd.append("additionalDescription", additionalDescription);
        fd.append("exhibitionId", exhibitionId);
        fd.append("isArEnabled", String(isArEnabled));
        fd.append("arExperienceUrl", arValue);


        // only append if user selected (send "none" too if you want explicit clear)
        fd.append("badgeId", badgeValue); // backend: "none" => null

        if (primaryImageFile) fd.append("primaryImage", primaryImageFile);

        const res = await apiClient.post("/exhibits", fd);
        currentId = res.data.exhibitId;
      }

      const langName = languages.find(
        (l) => l.languageId === selectedLanguageId,
      )?.title;
      if (ttsText.trim() && currentId && langName) {
        await apiClient.post(`/exhibits/${currentId}/tts`, {
          text: ttsText,
          language: langName,
        });
      }

      onSave();
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="exhibit-form-wrapper"
    >
      <form onSubmit={handleSubmit} className="exhibit-internal-form">
        {/* BASIC INFO */}
        <div className="form-section-card">
          <div className="exhibit-section-header">
            <Info className="exhibit-icon-primary" size={18} />
            <span className="exhibit-header-text">Basic Information</span>
          </div>

          <div className="exhibit-input-field">
            <label>Parent Tour</label>
            <select
              value={exhibitionId}
              onChange={(e) => setExhibitionId(e.target.value)}
              required
            >
              <option value="">Select a Tour</option>
              {availableExhibitions.map((ex) => (
                <option key={ex.exhibitionId} value={ex.exhibitionId}>
                  {ex.title}
                </option>
              ))}
            </select>
          </div>

          <div className="exhibit-input-field">
            <label>Exhibit Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Exhibit Name"
              required
            />
          </div>

          <div className="exhibit-input-field">
            <label>Brief Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="A short overview for visitors..."
            />
          </div>

          {/* BADGE ASSIGNING
          <div className="exhibit-input-field">
            <label>Badge</label>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <select
                value={selectedBadgeId}
                onChange={(e) => setSelectedBadgeId(e.target.value)}
                disabled={!exhibitionId}
              >
                <option value="none">No Badge</option>
                {badges.map((b) => (
                  <option key={b.badgeId} value={b.badgeId}>
                    {b.name}
                    {b.style ? ` (${b.style})` : ""}
                  </option>
                ))}
              </select>

              <div
                style={{
                  opacity: 0.65,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <Award size={16} />
                <small>
                  {exhibitionId
                    ? `${badges.length} badges available`
                    : "Select a tour first"}
                </small>
              </div>
            </div>

            <div style={{ marginTop: 6, opacity: 0.7 }}>
              <small>
                Tip: One badge can only belong to one exhibit. Selecting it here
                will detach it from other exhibits automatically.
              </small>
            </div>
          </div> */}
        </div>

        {/* MEDIA SECTION */}
        <div className="form-section-card">
          <div className="exhibit-section-header">
            <ImageIcon className="exhibit-icon-primary" size={18} />
            <span className="exhibit-header-text">Exhibit Media</span>
          </div>

          <div className="exhibit-media-box">
            <div className="image-preview-area">
              {images.filter((img) => img.isPrimary).length > 0 ||
              primaryImageFile ? (
                <img
                  src={
                    primaryImageFile
                      ? URL.createObjectURL(primaryImageFile)
                      : getImageUrl(
                          images.find((img) => img.isPrimary)?.fileUrl || null,
                        )
                  }
                  alt="Preview"
                  className="main-preview-img"
                />
              ) : (
                <div className="image-placeholder">
                  <ImageIcon size={40} strokeWidth={1.5} />
                  <span>No image selected</span>
                </div>
              )}
            </div>

            <div className="file-upload-controls">
              <input
                type="file"
                id="exhibit-upload"
                accept="image/*"
                onChange={(e) =>
                  e.target.files && setPrimaryImageFile(e.target.files[0])
                }
                className="hidden-file-input"
              />
              <label htmlFor="exhibit-upload" className="custom-file-label">
                <Plus size={16} /> Choose Image
              </label>
              {primaryImageFile && (
                <span className="file-status-text">
                  {primaryImageFile.name}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* AR EXPERIENCE SECTION */}
        <div className="form-section-card">
          <div className="exhibit-section-header">
            <Sparkles className="exhibit-icon-primary" size={18} />
            <span className="exhibit-header-text">Augmented Reality</span>
          </div>

          <div className="exhibit-input-field toggle-row">
            <label className="toggle-label">
              Enable AR Experience?
              <input
                type="checkbox"
                checked={isArEnabled}
                onChange={(e) => {
                  const enabled = e.target.checked;
                  setIsArEnabled(enabled);

                  if (!enabled) {
                    setArExperienceUrl("");
                  }
                }}
              />
            </label>
          </div>

          <AnimatePresence>
            {isArEnabled && (
              <motion.div
                key="ar-url"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="exhibit-input-field"
              >
                <label>AR Experience URL</label>
                <input
                  type="url"
                  value={arExperienceUrl}
                  onChange={(e) => setArExperienceUrl(e.target.value)}
                  placeholder="https://your-project.8thwall.app"
                  required={isArEnabled}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* AUDIO STUDIO */}
        <div className="exhibit-ai-card">
          <div className="ai-card-header">
            <div className="ai-title-group">
              <Mic size={18} color="#3b82f6" />
              <span className="exhibit-header-text">Audio Guide</span>
            </div>
            <div className="lang-picker-wrapper">
              <Languages size={14} />
              <select
                className="exhibit-lang-select-refined"
                value={selectedLanguageId}
                onChange={(e) => setSelectedLanguageId(e.target.value)}
              >
                {languages.map((l) => (
                  <option key={l.languageId} value={l.languageId}>
                    {l.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="ai-card-content">
            <AnimatePresence mode="wait">
              {isTranslatorVisible ? (
                <motion.div
                  key="translator"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="ai-input-zone"
                >
                  <div className="zone-label">English Script</div>
                  <textarea
                    className="ai-source-textarea"
                    value={sourceText}
                    onChange={(e) => setSourceText(e.target.value)}
                    placeholder="Enter text to translate..."
                  />
                  <div className="ai-actions">
                    <button
                      type="button"
                      className="btn-ghost-sm"
                      onClick={() => setIsTranslatorVisible(false)}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleTranslate}
                      disabled={isTranslating || !sourceText}
                      className="btn-ai-generate"
                    >
                      {isTranslating ? (
                        <Loader2 className="animate-spin" size={14} />
                      ) : (
                        <Sparkles size={14} />
                      )}
                      {isTranslating ? "Translating..." : "Translate"}
                    </button>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="prompt"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="ai-prompt-zone"
                >
                  <p>Generate an automated audio guide script</p>
                  <button
                    type="button"
                    className="btn-ai-magic"
                    onClick={() => setIsTranslatorVisible(true)}
                  >
                    <Languages size={16} /> Open Translator
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="ai-output-zone">
              <div className="zone-label">Final Script</div>
              <textarea
                className="exhibit-tts-final-refined"
                value={ttsText}
                onChange={(e) => setTtsText(e.target.value)}
                placeholder="Translated text will appear here..."
                rows={3}
              />
            </div>
          </div>
        </div>

        {/* FORM FOOTER */}
        <div className="exhibit-form-footer">
          <button
            type="button"
            onClick={onClose}
            className="exhibit-btn-cancel"
          >
            Cancel
          </button>
          <button type="submit" className="exhibit-btn-save" disabled={loading}>
            {loading ? (
              <Loader2 className="animate-spin" size={18} />
            ) : (
              <>
                <CheckCircle2 size={18} /> Save Exhibit
              </>
            )}
          </button>
        </div>
      </form>
    </motion.div>
  );
};

export default ExhibitForm;
