const r=require('express').Router();const c=require('../controllers/governance.controller');const auth=require('../middleware/auth');const role=require('../middleware/role');const permission=require('../middleware/permission');r.use(auth,role('platform_admin','super_admin'));
r.get('/settings',permission('manage_settings'),c.getSettings);r.patch('/settings',permission('manage_settings'),c.updateSettings);
r.get('/reviews',permission('manage_reviews'),c.reviews);r.patch('/reviews/:id',permission('manage_reviews'),c.moderateReview);
r.get('/categories',permission('manage_categories'),c.categories);r.patch('/categories/:id',permission('manage_categories'),c.updateCategory);r.post('/categories/:id/merge',permission('manage_categories'),c.mergeCategory);
r.get('/complaints',permission('manage_complaints'),c.complaints);r.patch('/complaints/:id',permission('manage_complaints'),c.updateComplaint);
r.get('/support-tickets',permission('manage_complaints'),c.supportTickets);r.patch('/support-tickets/:id',permission('manage_complaints'),c.updateSupportTicket);
r.get('/announcements',permission('send_announcements'),c.announcements);r.post('/announcements',permission('send_announcements'),c.createAnnouncement);r.patch('/announcements/:id',permission('send_announcements'),c.updateAnnouncement);
r.get('/risk-signals',permission('view_risk_signals'),c.risks);r.patch('/risk-signals/:id',permission('view_risk_signals'),c.updateRisk);
r.get('/exports/:type',permission('export_data'),c.exportData);module.exports=r;
