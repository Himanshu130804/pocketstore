const PlatformSetting=require("../models/PlatformSetting");
const DEFAULT_TIERS=[{uptoKm:1,feePaise:2000},{uptoKm:2,feePaise:3000},{uptoKm:3,feePaise:5000},{uptoKm:5,feePaise:7000},{uptoKm:10,feePaise:10000}];
const money=n=>Math.max(0,Math.round(Number(n)||0));
async function getPricingSettings(){
 const settings=await PlatformSetting.findOneAndUpdate({key:"global"},{$setOnInsert:{key:"global"}},{new:true,upsert:true}).lean();
 const tiers=(settings.deliveryFeeTiers?.length?settings.deliveryFeeTiers:DEFAULT_TIERS).map(t=>({uptoKm:Number(t.uptoKm),feePaise:money(t.feePaise)})).filter(t=>t.uptoKm>0).sort((a,b)=>a.uptoKm-b.uptoKm);
 return {tiers,platformFeePaise:money(settings.platformFeePaise)};
}
function deliveryFeeFor(distanceKm,tiers){
 const distance=Math.max(0,Number(distanceKm)||0);
 const match=tiers.find(t=>distance<=t.uptoKm);
 return match?match.feePaise:(tiers.at(-1)?.feePaise||0);
}
async function calculateOrderCharges({shop,subtotalPaise,fulfilmentMode,distanceKm}){
 const settings=await getPricingSettings();
 const subtotal=money(subtotalPaise);
 const packaging=money(shop.packagingFeePaise);
 const handling=money(shop.handlingFeePaise);
 const platform=money(settings.platformFeePaise);
 let delivery=0;
 if(fulfilmentMode==="delivery"){
   const freeAbove=money(shop.freeDeliveryAbovePaise);
   delivery=freeAbove>0&&subtotal>=freeAbove?0:deliveryFeeFor(distanceKm,settings.tiers);
 }
 const taxPercent=Math.min(28,Math.max(0,Number(shop.gstPercent)||0));
 const taxable=subtotal+packaging+handling;
 const tax=money(taxable*taxPercent/100);
 const total=subtotal+delivery+packaging+handling+platform+tax;
 return {subtotalPaise:subtotal,deliveryFeePaise:delivery,packagingFeePaise:packaging,handlingFeePaise:handling,platformFeePaise:platform,taxPaise:tax,taxPercent,distanceKm:Number((Number(distanceKm)||0).toFixed(2)),totalPaise:total,deliveryFeeTiers:settings.tiers};
}
module.exports={calculateOrderCharges,getPricingSettings};
