const r=require('express').Router();const c=require('../controllers/workspace.controller');const auth=require('../middleware/auth');r.use(auth);
r.get('/mine',c.myWorkspaces);r.post('/invites/:token/accept',c.acceptInvite);
r.get('/:shopId/invites',c.invites);r.post('/:shopId/invites',c.invite);r.get('/:shopId/employees',c.employees);r.patch('/:shopId/employees/:membershipId',c.updateEmployee);
r.get('/:shopId/dashboard',c.dashboard);r.get('/:shopId/orders',c.orders);r.patch('/orders/:orderId',c.updateOrder);r.get('/:shopId/delivery-staff',c.deliveryStaff);r.post('/orders/:orderId/assign-delivery',c.assignDelivery);r.post('/orders/:orderId/pickup-code',c.pickupCode);r.post('/orders/:orderId/verify-pickup',c.verifyPickup);
module.exports=r;
