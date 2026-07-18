module.exports=function normalizeLabel(value=''){return String(value).trim().replace(/\s+/g,' ').toLowerCase().replace(/^./,c=>c.toUpperCase())}
