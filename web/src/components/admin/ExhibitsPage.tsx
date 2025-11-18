import React, { useEffect } from 'react';
import ManageExhibitions from './ManageExhibitions';
import AdminLayout from './AdminLayout'; 
import '../../css/AdminComponents.css';
import '../../css/AdminExhibits.css';

const ExhibitsPage: React.FC = () => {
  const breadcrumbs = [
    { label: 'Admin', path: '/admin/dashboard' },
    { label: 'Collections & Exhibits' }
  ];

  useEffect(() => {
    // Additional protection for Google Translate DOM conflicts on this page
    const protectFromTranslateConflicts = () => {
      // Mark critical elements to prevent Google Translate from modifying them
      const criticalElements = document.querySelectorAll('.manage-exhibits-container, .modal-content, .exhibit-card-manage');
      criticalElements.forEach(element => {
        element.setAttribute('translate', 'no');
        element.setAttribute('class', element.className + ' notranslate');
      });
    };

    // Run protection immediately and after a short delay
    protectFromTranslateConflicts();
    const timeoutId = setTimeout(protectFromTranslateConflicts, 1000);

    return () => {
      clearTimeout(timeoutId);
    };
  }, []);

  return (
    <AdminLayout
      currentPath="/admin/exhibits" 
      breadcrumbs={breadcrumbs}     
    >
      <div className="admin-page-content">
        <div className="admin-page-header-local">
          <h1>Exhibitition & Exhibit Management</h1>
          <p>Create and manage main exhibitions, then add and edit the individual exhibits within them.</p>
        </div>
        <div className="admin-page-main">
          <ManageExhibitions />
        </div>
      </div>
    </AdminLayout>
  );
};

export default ExhibitsPage;