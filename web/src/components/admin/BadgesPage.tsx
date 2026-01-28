import React, { useEffect } from "react";
import AdminLayout from "./AdminLayout";
import BadgeManagement from "./ManageBadges";
import "../../css/AdminComponents.css";
import "../../css/AdminBadge.css";

const BadgesPage: React.FC = () => {
  const breadcrumbs = [
    { label: "Admin", path: "/admin/dashboard" },
    { label: "Badges" },
  ];

  useEffect(() => {
    // Protection for Google Translate DOM conflicts (same approach as ExhibitsPage)
    const protectFromTranslateConflicts = () => {
      const criticalElements = document.querySelectorAll(
        ".manage-exhibits-container, .modal-content, .exhibit-card-manage, .exhibition-group, .exhibition-group-header"
      );

      criticalElements.forEach((element) => {
        element.setAttribute("translate", "no");
        element.setAttribute("class", element.className + " notranslate");
      });
    };

    protectFromTranslateConflicts();
    const timeoutId = setTimeout(protectFromTranslateConflicts, 1000);

    return () => clearTimeout(timeoutId);
  }, []);

  return (
    <AdminLayout currentPath="/admin/badges" breadcrumbs={breadcrumbs}>
      <div className="admin-page-content">
        <div className="admin-page-header-local">
          <h1>Badge Management</h1>
          <p>Create and manage badges. Filter by style and search by exhibition/exhibit name.</p>
        </div>

        <div className="admin-page-main">
          <BadgeManagement />
        </div>
      </div>
    </AdminLayout>
  );
};

export default BadgesPage;
