import React from 'react';
import {NavLink} from 'react-router-dom';
import {LayoutDashboard,Package,ReceiptText,Heart,MapPin,Bell,Star,LifeBuoy,UserRound,Settings,Store,RotateCcw,MessageSquareWarning,ShoppingCart,Bike} from 'lucide-react';
import './CustomerSidebar.css';
const links=[
 ['/customer','Overview',LayoutDashboard],
 ['/customer/orders','Orders',Package],
 ['/customer/bills','Bills',ReceiptText],
 ['/cart','Cart',ShoppingCart],
 ['/customer/wishlist','Wishlist',Heart],
 ['/customer/addresses','Addresses',MapPin],
 ['/customer/returns','Returns & refunds',RotateCcw],
 ['/customer/complaints','Complaints',MessageSquareWarning],
 ['/customer/notifications','Notifications',Bell],
 ['/customer/reviews','Reviews',Star],
 ['/customer/support','Help & support',LifeBuoy],
 ['/customer/profile','Profile',UserRound],
 ['/customer/settings','Settings',Settings],
 ['/delivery','Delivery partner mode',Bike]
];
export default function CustomerSidebar({onNavigate}){return <aside className="customer-sidebar"><div className="customer-side-title"><span>P</span><div><b>My PocketStore</b><small>Customer workspace</small></div></div><NavLink className="customer-market-link" to="/shops" onClick={onNavigate}><Store size={19}/><span>Browse marketplace</span></NavLink><nav>{links.map(([to,label,Icon])=><NavLink end={to==='/customer'} key={to} to={to} onClick={onNavigate} className={({isActive})=>isActive?'active':''}><Icon size={19}/><span>{label}</span></NavLink>)}</nav></aside>}
