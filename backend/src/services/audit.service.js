const AuditLog = require("../models/AuditLog");
exports.log = async (data) => { try { await AuditLog.create(data); } catch (e) { console.error("Audit error", e.message); } };
