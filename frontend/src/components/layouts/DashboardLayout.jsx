import React, { useMemo, useState } from "react";
import { Outlet, NavLink, useLocation, Link } from "react-router-dom";
import {
  LayoutDashboard, Package, ShoppingBag, Settings, Store, Users, ClipboardCheck,
  Menu, X, LogOut, Bell, BarChart3, ScrollText, UserRound, UsersRound,
  PanelLeftClose, PanelLeftOpen, Boxes, Truck, ReceiptText, WalletCards,
  RotateCcw, Landmark, ScanLine, MessageSquareWarning, Star, Tags, Megaphone,
  ShieldAlert, Download, Search, ChevronRight, Home, LifeBuoy, Plus, Zap,
  CheckCircle2, Clock3, ExternalLink, Bike, History, Navigation, BadgeIndianRupee
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useWorkspace } from "../../context/WorkspaceContext";
import api from "../../api/client";
import "./DashboardLayout.css";

const configs={
 owner:{title:"PocketStore Business",subtitle:"Shop operations",groups:[
  {label:"Overview",links:[{to:"/owner",icon:LayoutDashboard,label:"Dashboard",end:true},{to:"/owner/shops",icon:Store,label:"My shops"}]},
  {label:"Sell",links:[{to:"/owner/pos",icon:ScanLine,label:"Point of Sale"},{to:"/owner/orders",icon:ShoppingBag,label:"Online orders"},{to:"/owner/invoices",icon:ReceiptText,label:"Invoices"},{to:"/owner/returns",icon:RotateCcw,label:"Returns & refunds"}]},
  {label:"Catalogue & stock",links:[{to:"/owner/products",icon:Package,label:"Products"},{to:"/owner/inventory",icon:Boxes,label:"Inventory ledger"},{to:"/owner/suppliers",icon:Truck,label:"Suppliers"},{to:"/owner/purchases",icon:ReceiptText,label:"Purchases"}]},
  {label:"Money & customers",links:[{to:"/owner/khata",icon:WalletCards,label:"Khata / Credit"},{to:"/owner/expenses",icon:Landmark,label:"Expenses & profit"},{to:"/owner/customers",icon:UsersRound,label:"Customers"},{to:"/owner/reports",icon:BarChart3,label:"Reports"}]},
  {label:"Team & setup",links:[{to:"/owner/employees",icon:UsersRound,label:"Employees"},{to:"/owner/deliveries",icon:Truck,label:"Deliveries"},{to:"/owner/settings",icon:Settings,label:"Shop settings"},{to:"/owner/profile",icon:UserRound,label:"My profile"}]}
 ]},
 employee:{title:"PocketStore Team",subtitle:"Employee workspace",groups:[
  {label:"Workspace",links:[{to:"/employee",icon:LayoutDashboard,label:"Dashboard",end:true},{to:"/employee/orders",icon:ShoppingBag,label:"Orders & tasks"},{to:"/employee/deliveries",icon:Truck,label:"My deliveries"}]},
  {label:"Account",links:[{to:"/employee/profile",icon:UserRound,label:"My profile"}]}
 ]},
 delivery:{title:"PocketStore Delivery",subtitle:"Partner workspace",groups:[
  {label:"Delivery",links:[{to:"/delivery",icon:LayoutDashboard,label:"Dashboard",end:true},{to:"/delivery/available",icon:Zap,label:"Available deliveries"},{to:"/delivery/current",icon:Navigation,label:"Current delivery"},{to:"/delivery/history",icon:History,label:"Delivery history"}]},
  {label:"Account",links:[{to:"/delivery/profile",icon:Bike,label:"Delivery profile"},{to:"/customer",icon:ShoppingBag,label:"Switch to customer"}]}
 ]},
  admin:{title:"PocketStore Admin",subtitle:"Platform control centre",groups:[
  {label:"Overview",links:[{to:"/admin",icon:LayoutDashboard,label:"Overview",end:true},{to:"/admin/analytics",icon:BarChart3,label:"Analytics"}]},
  {label:"Moderation",links:[{to:"/admin/approvals",icon:ClipboardCheck,label:"Approvals"},{to:"/admin/shops",icon:Store,label:"Shops"},{to:"/admin/products",icon:Package,label:"Products"},{to:"/admin/orders",icon:ShoppingBag,label:"Orders"},{to:"/admin/reviews",icon:Star,label:"Reviews"},{to:"/admin/categories",icon:Tags,label:"Categories"}]},
  {label:"People & support",links:[{to:"/admin/users",icon:Users,label:"Users & admins"},{to:"/admin/complaints",icon:MessageSquareWarning,label:"Complaints"},{to:"/admin/support",icon:LifeBuoy,label:"Help & support"},{to:"/admin/announcements",icon:Megaphone,label:"Announcements"}]},
  {label:"Finance & delivery",links:[{to:"/admin/delivery-pricing",icon:BadgeIndianRupee,label:"Delivery charges"}]},{label:"Governance",links:[{to:"/admin/risk-signals",icon:ShieldAlert,label:"Risk signals"},{to:"/admin/exports",icon:Download,label:"Exports"},{to:"/admin/audit-logs",icon:ScrollText,label:"Audit logs"},{to:"/admin/settings",icon:Settings,label:"Settings"}]}
 ]}
};

const permissionByPath={"/admin/approvals":"review_approvals","/admin/shops":"manage_shops","/admin/products":"manage_products","/admin/orders":"manage_orders","/admin/users":"manage_users","/admin/reviews":"manage_reviews","/admin/categories":"manage_categories","/admin/complaints":"manage_complaints","/admin/support":"manage_complaints","/admin/announcements":"send_announcements","/admin/risk-signals":"view_risk_signals","/admin/exports":"export_data","/admin/audit-logs":"view_audit_logs","/admin/settings":"manage_settings","/admin/delivery-pricing":"manage_settings"};

function filterGroups(config,type,user,query){
 const adminAll=user?.platformRole==="super_admin";
 return config.groups.map(group=>({
  ...group,
  links:group.links.filter(link=>{
   const permitted=type!=="admin"||adminAll||!permissionByPath[link.to]||(user?.adminPermissions||[]).includes(permissionByPath[link.to]);
   return permitted&&link.label.toLowerCase().includes(query.trim().toLowerCase());
  })
 })).filter(group=>group.links.length);
}

export default function DashboardLayout({type}){
 const [open,setOpen]=useState(false);
 const [navQuery,setNavQuery]=useState("");
 const [collapsed,setCollapsed]=useState(()=>localStorage.getItem(`ps_${type}_sidebar_collapsed`)==="true");
 const [quickOpen,setQuickOpen]=useState(false);
 const {user,logout}=useAuth();
 const {workspaces,activeShop,setActiveId,loading:workspaceLoading,refresh:refreshWorkspace}=useWorkspace();
 const [liveBusy,setLiveBusy]=useState(false);
 const [liveMessage,setLiveMessage]=useState("");
 const location=useLocation();
 const rawCfg=configs[type];
 const groups=useMemo(()=>filterGroups(rawCfg,type,user,navQuery),[rawCfg,type,user,navQuery]);
 const allLinks=useMemo(()=>groups.flatMap(group=>group.links),[groups]);
 const current=useMemo(()=>allLinks.find(link=>link.end?location.pathname===link.to:location.pathname.startsWith(link.to))||rawCfg.groups[0].links[0],[allLinks,location.pathname,rawCfg]);
 const toggleCollapsed=()=>setCollapsed(value=>{const next=!value;localStorage.setItem(`ps_${type}_sidebar_collapsed`,String(next));return next});
 const toggleShopLive=async()=>{if(!activeShop||liveBusy)return;setLiveBusy(true);setLiveMessage("");try{const {data}=await api.patch(`/shops/${activeShop._id}/live`,{isLive:!activeShop.isLive});setLiveMessage(data.message||"Shop visibility updated");await refreshWorkspace();}catch(error){setLiveMessage(error.response?.data?.message||"Unable to update shop visibility");}finally{setLiveBusy(false);setTimeout(()=>setLiveMessage(""),3500);}};
 const description=type==="admin"?"Review activity, protect trust and keep the platform healthy":type==="employee"?"Complete assigned work with the tools allowed for your role":type==="delivery"?"Accept nearby requests, verify handovers and track your earnings":"Run sales, stock, customers and your team from one workspace";
 const quickActions=type==="owner"?[
  {to:"/owner/products",label:"Add product",icon:Package},{to:"/owner/pos",label:"Create bill",icon:ScanLine},{to:"/owner/employees",label:"Invite employee",icon:UsersRound},{to:"/owner/purchases",label:"New purchase",icon:ReceiptText}
 ]:type==="admin"?[
  {to:"/admin/approvals",label:"Review approvals",icon:ClipboardCheck},{to:"/admin/delivery-pricing",label:"Delivery charges",icon:BadgeIndianRupee},{to:"/admin/announcements",label:"New announcement",icon:Megaphone},{to:"/admin/complaints",label:"Open complaints",icon:MessageSquareWarning}
 ]:type==="delivery"?[{to:"/delivery/available",label:"Find delivery",icon:Zap},{to:"/delivery/current",label:"Current route",icon:Navigation}]:[{to:"/employee/orders",label:"View tasks",icon:ShoppingBag},{to:"/employee/profile",label:"My profile",icon:UserRound}];
 return <div className={`dashboard-shell dashboard-${type} ${collapsed?"is-collapsed":""}`}>
  <aside className={`dashboard-sidebar ${open?"open":""}`}>
   <div className="dashboard-brand"><span>P</span><div className="brand-copy"><strong>{rawCfg.title}</strong><small>{rawCfg.subtitle}</small></div><button className="side-close" onClick={()=>setOpen(false)} aria-label="Close navigation"><X size={20}/></button></div>
   {!collapsed&&<label className="sidebar-search"><Search size={17}/><input value={navQuery} onChange={e=>setNavQuery(e.target.value)} placeholder="Find a section" aria-label="Find a dashboard section"/></label>}
   <nav aria-label={`${type} navigation`}>
    {groups.length?groups.map(group=><div className="nav-group" key={group.label}>{!collapsed&&<div className="nav-group-label">{group.label}</div>}{group.links.map(({to,icon:Icon,label,end})=><NavLink end={end} key={to} to={to} onClick={()=>setOpen(false)} title={collapsed?label:undefined}><Icon size={20}/><span>{label}</span></NavLink>)}</div>):<div className="nav-empty">No section found</div>}
   </nav>
   <button className="collapse-control" onClick={toggleCollapsed} title={collapsed?"Expand sidebar":"Collapse sidebar"}>{collapsed?<PanelLeftOpen size={19}/>:<PanelLeftClose size={19}/>}<span>{collapsed?"Expand":"Collapse"}</span></button>
   <div className="sidebar-user"><div className="avatar">{user?.name?.[0]?.toUpperCase()||"U"}</div><div className="sidebar-user-copy"><b>{user?.name||"User"}</b><small>{user?.platformRole?.replaceAll("_"," ")}</small></div><button onClick={logout} title="Logout" aria-label="Logout"><LogOut size={18}/></button></div>
  </aside>
  <section className="dashboard-main">
   <header className="dashboard-topbar"><button className="menu-btn" onClick={()=>setOpen(true)} aria-label="Open navigation"><Menu/></button><div className="topbar-copy"><div className="dashboard-breadcrumb"><Link to="/"><Home size={13}/> Home</Link><ChevronRight size={13}/><span>{current.label}</span></div><h3>{current.label}</h3><p>{description}</p></div><div className="topbar-actions">
    {["owner","employee"].includes(type)&&workspaces.length>0&&<div className="shop-selector-wrap"><select className="workspace-switcher" value={activeShop?._id||""} onChange={e=>setActiveId(e.target.value)} aria-label="Select active shop" disabled={workspaceLoading}>{workspaces.map(w=><option key={w.shop._id} value={w.shop._id}>{w.shop.name}</option>)}</select>{activeShop&&<span className={`shop-status-badge ${activeShop.status}`}>{activeShop.status==="approved"?<CheckCircle2 size={13}/>:<Clock3 size={13}/>} {activeShop.status}</span>}</div>}
    <div className="quick-create"><button className="quick-create-button" onClick={()=>setQuickOpen(v=>!v)} aria-expanded={quickOpen}><Plus size={18}/><span>Quick action</span></button>{quickOpen&&<div className="quick-create-menu">{quickActions.map(({to,label,icon:Icon})=><Link key={to} to={to} onClick={()=>setQuickOpen(false)}><Icon size={18}/><span>{label}</span><ChevronRight size={15}/></Link>)}</div>}</div>
    <button aria-label="Notifications" title="Notifications"><Bell size={20}/><span className="notification-dot"/></button><a href="/shops"><Store size={19}/><span>Marketplace</span><ExternalLink size={13}/></a>
   </div></header>
   {type==="owner"&&activeShop&&<><div className={`workspace-context-bar ${activeShop.isLive?"shop-is-live":"shop-is-offline"}`}><div><Zap size={16}/><strong>{activeShop.name}</strong><span>{activeShop.category||"Local shop"}</span><span className={`live-visibility-pill ${activeShop.isLive?"live":"offline"}`}>{activeShop.isLive?"Live for customers":"Offline"}</span></div><div><span>{activeShop.isLive?"Customers can browse and place orders":"Management tools remain available"}</span><button className={`shop-live-toggle ${activeShop.isLive?"on":"off"}`} onClick={toggleShopLive} disabled={liveBusy||activeShop.status!=="approved"} title={activeShop.status!=="approved"?"Admin approval is required first":activeShop.isLive?"Take shop offline":"Make shop live"}><span className="toggle-track"><span/></span><b>{liveBusy?"Updating…":activeShop.isLive?"Go offline":"Go live"}</b></button><Link to="/owner/settings">Manage shop</Link></div></div>{liveMessage&&<div className="live-toggle-message">{liveMessage}</div>}</>}
   <main className="dashboard-page"><Outlet/></main>
  </section>
  {open&&<button className="sidebar-overlay" aria-label="Close navigation overlay" onClick={()=>setOpen(false)}/>} 
 </div>
}
