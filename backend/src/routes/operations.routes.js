const r=require('express').Router();const c=require('../controllers/operations.controller');const auth=require('../middleware/auth');const role=require('../middleware/role');r.use(auth,role('shop_owner'));
r.get('/:shopId/inventory',c.inventory);r.post('/:shopId/inventory/adjust',c.adjustStock);
r.get('/:shopId/suppliers',c.listSuppliers);r.post('/:shopId/suppliers',c.createSupplier);r.patch('/suppliers/:id',c.updateSupplier);
r.get('/:shopId/purchases',c.listPurchases);r.post('/:shopId/purchases',c.createPurchase);r.post('/purchases/:id/receive',c.receivePurchase);
r.get('/:shopId/expenses',c.listExpenses);r.post('/:shopId/expenses',c.createExpense);
r.get('/:shopId/credit',c.listCredit);r.post('/:shopId/credit',c.addCredit);
r.get('/:shopId/returns',c.listReturns);r.patch('/returns/:id',c.updateReturn);
r.get('/:shopId/financial-summary',c.financialSummary);r.get('/:shopId/invoices',c.listInvoices);
module.exports=r;
