import React,{useMemo,useState} from "react";
import {Link,useNavigate} from "react-router-dom";
import {Search,Store,UserRound,LogOut,LayoutDashboard,Heart,Bell,ReceiptText,Package,ShoppingCart,Clock3,X,ChevronDown,MapPin,Grid3X3} from "lucide-react";
import {useAuth} from "../context/AuthContext";
import {useCart} from "../context/CartContext";
import {useLocation} from "../context/LocationContext";
import LocationPicker from "./location/LocationPicker";
import "./Header.css";

const popular=["Mobile","Groceries","Medicines","Stationery","Electronics"];
const categories=[{label:"For you",path:"/"},{label:"Groceries",query:"Grocery"},{label:"Mobiles",query:"Mobile"},{label:"Fashion",query:"Fashion"},{label:"Electronics",query:"Electronics"},{label:"Pharmacy",query:"Medicine"},{label:"Stationery",query:"Stationery"},{label:"Home",query:"Home"}];
export default function Header(){
 const{user,logout}=useAuth();const{count}=useCart();const{location,setOpen}=useLocation();const nav=useNavigate();
 const[q,setQ]=useState("");const[focused,setFocused]=useState(false);const[accountOpen,setAccountOpen]=useState(false);
 const recent=useMemo(()=>{try{return JSON.parse(localStorage.getItem("ps_recent_searches")||"[]")}catch{return[]}},[focused]);
 const go=value=>{const clean=value.trim();if(!clean)return;const next=[clean,...recent.filter(item=>item.toLowerCase()!==clean.toLowerCase())].slice(0,6);localStorage.setItem("ps_recent_searches",JSON.stringify(next));setFocused(false);setQ(clean);nav(`/search?q=${encodeURIComponent(clean)}`)};
 const submit=e=>{e.preventDefault();go(q)};
 const clearRecent=e=>{e.stopPropagation();localStorage.removeItem("ps_recent_searches");setFocused(false);setTimeout(()=>setFocused(true),0)};
 const dash=user?.platformRole==="shop_owner"?"/owner":user?.platformRole?.includes("admin")?"/admin":user?.platformRole==='customer'?'/customer':user?'/employee':null;
 return <>
  <header className="main-header"><Link className="brand" to="/"><span>P</span><b>PocketStore</b><small>Local commerce</small></Link>
   <button className="location-pill" type="button" title="Choose service location" onClick={()=>setOpen(true)}><MapPin size={17}/><span>{location?.label||"Set location"}</span><ChevronDown size={14}/></button>
   <div className="search-shell"><form className="global-search" onSubmit={submit}><Search size={20}/><input value={q} onFocus={()=>setFocused(true)} onChange={e=>setQ(e.target.value)} placeholder="Search products, categories and local shops" aria-label="Search PocketStore"/><button>Search</button></form>{focused&&<div className="search-suggestions" onMouseDown={e=>e.preventDefault()}>{recent.length>0&&<><div className="suggestion-title"><span>Recent searches</span><button onClick={clearRecent}><X size={14}/>Clear</button></div>{recent.map(item=><button key={item} onClick={()=>go(item)}><Clock3 size={16}/><span>{item}</span></button>)}</>}<div className="suggestion-title"><span>Popular searches</span></div><div className="popular-searches">{popular.map(item=><button key={item} onClick={()=>go(item)}>{item}</button>)}</div></div>}</div>
   <nav className="header-links"><Link className="shops-header-link" to="/shops"><Store size={19}/>Shops</Link><Link className="cart-header-link" to="/cart"><ShoppingCart size={19}/>Cart{count>0&&<span>{count}</span>}</Link>{user?<div className="account-menu"><button className="account-trigger" onClick={()=>setAccountOpen(v=>!v)} aria-expanded={accountOpen}><span className="header-avatar">{user.name?.[0]?.toUpperCase()||"U"}</span><span>{user.name?.split(" ")[0]||"Account"}</span><ChevronDown size={15}/></button>{accountOpen&&<div className="account-dropdown">{dash&&<Link to={dash} onClick={()=>setAccountOpen(false)}><LayoutDashboard size={18}/>Dashboard</Link>}{user.platformRole==='customer'&&<><Link to="/customer/wishlist" onClick={()=>setAccountOpen(false)}><Heart size={18}/>Wishlist</Link><Link to="/customer/orders" onClick={()=>setAccountOpen(false)}><Package size={18}/>Orders</Link><Link to="/customer/bills" onClick={()=>setAccountOpen(false)}><ReceiptText size={18}/>Bills</Link><Link to="/customer/notifications" onClick={()=>setAccountOpen(false)}><Bell size={18}/>Notifications</Link></>}<button onClick={()=>{logout();setAccountOpen(false);nav("/")}}><LogOut size={18}/>Logout</button></div>}</div>:<div className="header-auth-links"><Link className="guest-login" to="/login"><UserRound size={18}/>Login</Link><Link className="join guest-register" to="/register">Register</Link></div>}</nav>
  </header><LocationPicker/>
  <div className="market-category-bar"><div className="category-bar-inner"><Link to="/shops"><Grid3X3 size={16}/><b>All categories</b></Link>{categories.map(item=>item.path?<button key={item.label} onClick={()=>nav(item.path)}>{item.label}</button>:<button key={item.label} onClick={()=>go(item.query)}>{item.label}</button>)}</div></div>
 </>;
}
