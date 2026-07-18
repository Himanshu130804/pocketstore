import React,{createContext,useContext,useEffect,useMemo,useState} from "react";
const CartContext=createContext(null);
const KEY="pocketstore_cart_v1";
export function CartProvider({children}){
  const[items,setItems]=useState(()=>{try{return JSON.parse(localStorage.getItem(KEY))||[]}catch{return[]}});
  useEffect(()=>{localStorage.setItem(KEY,JSON.stringify(items))},[items]);
  const addItem=(product,quantity=1,variant=null)=>setItems(prev=>{
    const key=`${product._id}:${variant?._id||"base"}`;const existing=prev.find(i=>i.key===key);
    const max=variant?.stockQty??product.stockQty;
    if(existing)return prev.map(i=>i.key===key?{...i,quantity:Math.min(max,i.quantity+quantity)}:i);
    return [...prev,{key,productId:product._id,shopId:product.shopId?._id||product.shopId,shop:product.shopId&&typeof product.shopId==='object'?product.shopId:null,name:product.name,imageUrl:product.imageUrl,pricePaise:variant?.pricePaise??product.pricePaise,quantity:Math.min(max,quantity),stockQty:max,variant:variant?{_id:variant._id,name:variant.name}:null,fulfilmentModes:product.fulfilmentModes||[]}]
  });
  const updateQty=(key,quantity)=>setItems(prev=>quantity<=0?prev.filter(i=>i.key!==key):prev.map(i=>i.key===key?{...i,quantity:Math.min(i.stockQty,quantity)}:i));
  const removeItem=key=>setItems(prev=>prev.filter(i=>i.key!==key));
  const clearShop=shopId=>setItems(prev=>prev.filter(i=>String(i.shopId)!==String(shopId)));
  const clear=()=>setItems([]);
  const groups=useMemo(()=>Object.values(items.reduce((acc,item)=>{const id=String(item.shopId);if(!acc[id])acc[id]={shopId:id,shop:item.shop,items:[],subtotalPaise:0};acc[id].items.push(item);acc[id].subtotalPaise+=item.pricePaise*item.quantity;return acc},{})),[items]);
  const count=items.reduce((a,i)=>a+i.quantity,0);const totalPaise=items.reduce((a,i)=>a+i.pricePaise*i.quantity,0);
  return <CartContext.Provider value={{items,groups,count,totalPaise,addItem,updateQty,removeItem,clearShop,clear}}>{children}</CartContext.Provider>
}
export const useCart=()=>useContext(CartContext);
