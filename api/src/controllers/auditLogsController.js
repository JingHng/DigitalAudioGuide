// Temporarily disabled audit logging for this project phase.
// Provide no-op functions to avoid breaking imports while routes are disabled.
const logUserAction = async () => {};
const logAuditAction = async () => {};
const getAllAuditLogs = async (req, res) => res.status(200).json({ auditLogs: [], pagination: { currentPage: 1, totalPages: 0, totalLogs: 0, hasNext: false, hasPrev: false } });
const getAuditLogById = async (req, res) => res.status(404).json({ error: 'Audit logs are disabled' });
const getAuditStats = async (req, res) => res.status(200).json({ totalLogs: 0, actionStats: [], recentLogs: [], topAdmins: [] });

module.exports = {
  logUserAction,
  logAuditAction,
  getAllAuditLogs,
  getAuditLogById,
  getAuditStats
};