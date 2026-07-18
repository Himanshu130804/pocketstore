const ACTIVE_PRODUCT_STATUSES = ["draft", "published", "hidden"];

const activeProductFilter = (extra = {}) => ({
  ...extra,
  status: { $in: ACTIVE_PRODUCT_STATUSES },
  deletedAt: null,
});

const normalizeSku = (value = "") => String(value)
  .trim()
  .toUpperCase()
  .replace(/^[-_\s]+/, "")
  .replace(/\s+/g, "-")
  .replace(/-+/g, "-");

module.exports = { ACTIVE_PRODUCT_STATUSES, activeProductFilter, normalizeSku };
