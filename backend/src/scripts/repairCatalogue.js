require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('../models/Product');
const { normalizeSku } = require('../utils/product');

async function run() {
  if (!process.env.MONGO_URI) throw new Error('MONGO_URI is missing');
  await mongoose.connect(process.env.MONGO_URI);
  const products = await Product.find({});
  let updated = 0;
  const conflicts = [];

  for (const product of products) {
    const normalizedSku = normalizeSku(product.sku);
    const duplicate = await Product.findOne({
      _id: { $ne: product._id },
      shopId: product.shopId,
      normalizedSku,
    }).select('_id name sku');

    if (duplicate) {
      conflicts.push({
        product: `${product.name} (${product.sku})`,
        duplicate: `${duplicate.name} (${duplicate.sku})`,
      });
      continue;
    }

    let changed = false;
    if (product.sku !== normalizedSku || product.normalizedSku !== normalizedSku) {
      product.sku = normalizedSku;
      product.normalizedSku = normalizedSku;
      changed = true;
    }
    if (product.status === 'archived' && !product.deletedAt) {
      product.deletedAt = product.updatedAt || new Date();
      changed = true;
    }
    if (changed) {
      await product.save();
      updated += 1;
    }
  }

  console.log(`Catalogue repair complete. Updated ${updated} product(s).`);
  if (conflicts.length) {
    console.log('Skipped SKU conflicts. Review these records manually:');
    console.table(conflicts);
  }
  await mongoose.disconnect();
}

run().catch(async error => {
  console.error(error);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
