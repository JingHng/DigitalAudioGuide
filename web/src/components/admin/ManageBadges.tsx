import React, { useState, useEffect, useCallback, useMemo, FC } from "react";
import apiClient from "../../utils/apiClient";
import { Edit, Trash2, PlusCircle, Loader2 } from "lucide-react";
import Modal from "./Modal";
import BadgeForm, { BadgeFormValues, ExhibitOption } from "./BadgeForm";
import "../css/ManageExhibits.css";

const BACKEND_URL = import.meta.env.VITE_API_TARGET || "";
const DEFAULT_IMAGE_URL = `${BACKEND_URL}/public/images/Badge.jpg`;

// Convert stored imageUrl to actual browser URL
const getImageUrl = (imageUrl: string | null): string => {
  if (!imageUrl) return DEFAULT_IMAGE_URL;

  const trimmed = imageUrl.trim();
  if (!trimmed) return DEFAULT_IMAGE_URL;

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;

  const cleanedPath = trimmed.replace(/\\/g, "/");
  const imagePrefix = "/images/";
  const idx = cleanedPath.indexOf(imagePrefix);

  if (idx !== -1) {
    const filename = cleanedPath.substring(idx + imagePrefix.length);
    const backendUrl = import.meta.env.VITE_API_TARGET || "http://localhost:3000";
    return `${backendUrl}/public/images/${filename}`;
  }

  return DEFAULT_IMAGE_URL;
};

// ---------- Types ----------
interface ExhibitionLite {
  exhibitionId: string;
  title: string;
}
interface ExhibitLite {
  exhibitId: string;
  title?: string;
  exhibition?: ExhibitionLite | null;
}
interface BadgeDTO {
  badgeId: string;
  name?: string | null;
  description?: string | null;
  style?: string | null;
  imageUrl?: string | null;
  exhibit?: ExhibitLite | null;
}
interface ExhibitionBadgeGroup {
  exhibitionId: string;
  exhibitionTitle: string;
  badges: BadgeDTO[];
}

// ---------- Style badge ----------
interface StyleBadgeProps {
  style?: string | null;
}
const StyleBadge: FC<StyleBadgeProps> = ({ style }) => {
  const styleName = (style || "unknown").toLowerCase();
  return <span className={`status-badge ${styleName}`}>{style || "Unknown"}</span>;
};

// ✅ upload helper (matches your backend route)
const uploadBadgeImage = async (badgeId: string, file: File) => {
  const formData = new FormData();
  formData.append("image", file); // uploadImage.single("image")

  const res = await apiClient.post(`/badges/${badgeId}/upload-image`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

  return res.data as { message: string; badgeId: string; imageUrl: string };
};

// ---------- Main Component ----------
const BadgeManagement: React.FC = () => {
  const [badges, setBadges] = useState<BadgeDTO[]>([]);
  const [styles, setStyles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [isBadgeModalOpen, setIsBadgeModalOpen] = useState(false);
  const [editingBadge, setEditingBadge] = useState<BadgeDTO | null>(null);

  const [styleFilter, setStyleFilter] = useState("all");
  const [searchText, setSearchText] = useState("");

  const fetchBadgeData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const [badgeRes, styleRes] = await Promise.all([
        apiClient.get("/badges/allBadges"),
        apiClient.get("/badges/styles"),
      ]);

      setBadges(badgeRes.data || []);
      setStyles(styleRes.data || []);
    } catch (err) {
      console.error(err);
      setError("Failed to fetch badges.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBadgeData();
  }, [fetchBadgeData]);

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;

      if (hash === "#add-badge") {
        handleOpenCreateBadgeModal();
        history.replaceState(null, document.title, window.location.pathname + window.location.search);
      }
    };

    handleHashChange();
    window.addEventListener("hashchange", handleHashChange);

    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  // Exhibit options from relations
  const exhibitOptions: ExhibitOption[] = useMemo(() => {
    const map = new Map<string, ExhibitOption>();

    for (const b of badges) {
      const ex = b.exhibit;
      if (!ex) continue;

      const exId = ex.exhibitId;
      const exTitle = (ex.title || "Untitled Exhibit").toString();
      const exhibitionId = ex.exhibition?.exhibitionId || "unknown";
      const exhibitionTitle = ex.exhibition?.title || "Unknown Exhibition";

      if (!map.has(exId)) {
        map.set(exId, { exhibitId: exId, exhibitTitle: exTitle, exhibitionId, exhibitionTitle });
      }
    }

    return Array.from(map.values()).sort((a, b) => {
      const byExh = a.exhibitionTitle.localeCompare(b.exhibitionTitle);
      if (byExh !== 0) return byExh;
      return a.exhibitTitle.localeCompare(b.exhibitTitle);
    });
  }, [badges]);

  const normalizedSearch = searchText.trim().toLowerCase();

  const filteredBadges = useMemo(() => {
    return badges.filter((b) => {
      if (styleFilter !== "all") {
        const s = (b.style || "").toLowerCase();
        if (s !== styleFilter.toLowerCase()) return false;
      }

      if (!normalizedSearch) return true;

      const badgeName = (b.name || "").toLowerCase();
      const exhibitTitle = (b.exhibit?.title || "").toLowerCase();
      const exhibitionTitle = (b.exhibit?.exhibition?.title || "").toLowerCase();

      return (
        badgeName.includes(normalizedSearch) ||
        exhibitTitle.includes(normalizedSearch) ||
        exhibitionTitle.includes(normalizedSearch)
      );
    });
  }, [badges, styleFilter, normalizedSearch]);

  const groupedData: ExhibitionBadgeGroup[] = useMemo(() => {
    const map = new Map<string, ExhibitionBadgeGroup>();

    for (const b of filteredBadges) {
      const exhibitionId = b.exhibit?.exhibition?.exhibitionId || "unknown";
      const exhibitionTitle = b.exhibit?.exhibition?.title || "Unknown Exhibition";

      if (!map.has(exhibitionId)) {
        map.set(exhibitionId, { exhibitionId, exhibitionTitle, badges: [] });
      }
      map.get(exhibitionId)!.badges.push(b);
    }

    const groups = Array.from(map.values()).map((g) => ({
      ...g,
      badges: g.badges.sort((a, b) => (a.name || "").localeCompare(b.name || "")),
    }));

    groups.sort((a, b) => a.exhibitionTitle.localeCompare(b.exhibitionTitle));
    return groups;
  }, [filteredBadges]);

  const handleOpenCreateBadgeModal = () => {
    setEditingBadge(null);
    setIsBadgeModalOpen(true);
  };

  const handleOpenEditBadgeModal = (badge: BadgeDTO) => {
    setEditingBadge(badge);
    setIsBadgeModalOpen(true);
  };

  const handleSave = () => {
    fetchBadgeData();
  };

  const handleDeleteBadge = async (badge: BadgeDTO) => {
    const name = badge.name || "this badge";
    if (!window.confirm(`Are you sure you want to delete "${name}"?`)) return;

    try {
      await apiClient.delete(`/badges/${badge.badgeId}`);
      fetchBadgeData();
    } catch (err) {
      console.error(err);
      setError("Failed to delete badge.");
    }
  };

  // ✅ FIX: create body MUST include imageUrl
  const handleSubmitBadgeForm = async (values: BadgeFormValues) => {
    try {
      setError("");

      if (editingBadge) {
        // UPDATE (keep your old behavior: still send imageUrl; safe for your backend)
        await apiClient.put(`/badges/${editingBadge.badgeId}`, {
          name: values.name,
          description: values.description,
          style: values.style,
          imageUrl: values.imageUrl, // keep
          exhibitId: values.exhibitId,
        });

        if (values.imageFile) {
          await uploadBadgeImage(editingBadge.badgeId, values.imageFile);
        }
      } else {
        // CREATE (your backend requires imageUrl)
        if (!values.imageUrl || !values.imageUrl.trim()) {
          throw new Error("imageUrl is required for create (auto-generated from file).");
        }

        const createRes = await apiClient.post("/badges", {
          name: values.name,
          description: values.description,
          style: values.style,
          imageUrl: values.imageUrl, // ✅ REQUIRED
          exhibitId: values.exhibitId,
        });

        const createdBadgeId =
          createRes?.data?.badgeId?.toString?.() ?? createRes?.data?.badgeId ?? null;

        if (!createdBadgeId) {
          console.warn("Create badge response has no badgeId:", createRes.data);
          throw new Error("Create badge succeeded but badgeId is missing in response.");
        }

        // upload file after create
        if (values.imageFile) {
          await uploadBadgeImage(String(createdBadgeId), values.imageFile);
        }
      }

      setIsBadgeModalOpen(false);
      handleSave();
    } catch (err: any) {
      console.error(err);
      setError(err?.response?.data?.message || err?.message || "Failed to save badge.");
    }
  };

  if (loading)
    return (
      <div className="status-container">
        <Loader2 className="animate-spin" /> Loading Badges...
      </div>
    );

  if (error) return <div className="error-message">{error}</div>;

  return (
    <div className="manage-exhibits-container">
      <div className="manage-header">
        <div className="filter-container" style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <label className="form-label" style={{ marginBottom: 0, fontWeight: 500 }}>
              Filter Style:
            </label>
            <select
              className="form-input form-select"
              value={styleFilter}
              onChange={(e) => setStyleFilter(e.target.value)}
              style={{ minWidth: "160px" }}
            >
              <option value="all">All</option>
              {styles.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <label className="form-label" style={{ marginBottom: 0, fontWeight: 500 }}>
              Search:
            </label>
            <input
              className="form-input"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Search by exhibition / exhibit / badge..."
              style={{ minWidth: "280px" }}
            />
          </div>
        </div>

        <button className="button-primary" onClick={handleOpenCreateBadgeModal}>
          <PlusCircle size={18} />
          Create New Badge
        </button>
      </div>

      <div className="exhibitions-grouped-list">
        {groupedData.length === 0 ? (
          <div className="no-exhibits-message">
            <p>No badges match the current filter.</p>
          </div>
        ) : (
          groupedData.map((group) => (
            <section key={group.exhibitionId} className="exhibition-group">
              <header className="exhibition-group-header">
                <div className="exhibition-group-title">
                  <h3>{group.exhibitionTitle}</h3>
                  <span className="exhibit-count">({group.badges.length} badges)</span>
                </div>

                <div className="exhibition-group-actions">
                  <button className="action-button create" onClick={handleOpenCreateBadgeModal}>
                    <PlusCircle size={16} /> Add Badge
                  </button>
                </div>
              </header>

              <div className="exhibits-list">
                {group.badges.map((badge) => {
                  const badgeTitle = badge.name || "Untitled Badge";
                  const exhibitTitle = badge.exhibit?.title || "Unknown Exhibit";
                  const img = getImageUrl(badge.imageUrl || null);

                  return (
                    <div key={badge.badgeId} className="exhibit-card-manage">
                      <img src={img} alt={badgeTitle} className="exhibit-card-image" />
                      <div className="exhibit-card-body">
                        <h4>{badgeTitle}</h4>

                        <p className="item-counts">
                          Exhibit: {exhibitTitle}
                          <br />
                          {badge.description || "No description"}
                        </p>

                        <div style={{ marginTop: "0.5rem", marginBottom: "1rem" }}>
                          <StyleBadge style={badge.style} />
                        </div>

                        <div className="exhibit-card-actions">
                          <button className="action-button edit" onClick={() => handleOpenEditBadgeModal(badge)}>
                            <Edit size={16} /> Edit
                          </button>
                          <button className="action-button delete" onClick={() => handleDeleteBadge(badge)}>
                            <Trash2 size={16} /> Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))
        )}
      </div>

      <Modal
        isOpen={isBadgeModalOpen}
        onClose={() => setIsBadgeModalOpen(false)}
        title={editingBadge ? `Edit Badge: ${editingBadge.name || "Untitled"}` : "Create New Badge"}
      >
        <BadgeForm
          mode={editingBadge ? "edit" : "create"}
          styles={styles}
          exhibits={exhibitOptions}
          initialValues={
            editingBadge
              ? {
                  name: editingBadge.name || "",
                  description: editingBadge.description || "",
                  style: editingBadge.style || "",
                  imageUrl: editingBadge.imageUrl || "",
                  exhibitId: editingBadge.exhibit?.exhibitId || "",
                }
              : undefined
          }
          onCancel={() => setIsBadgeModalOpen(false)}
          onSubmit={handleSubmitBadgeForm}
          submitting={false}
        />
      </Modal>
    </div>
  );
};

export default BadgeManagement;
