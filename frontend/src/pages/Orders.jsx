import React,{useEffect,useState}from"react";
import {ChevronRight,Package,Store,Truck} from 'lucide-react';
import {Link,useLocation} from 'react-router-dom';
import api from"../api/client";
import './Orders.css';

export default function Orders(){
 const[orders,setOrders]=useState([]),[message,setMessage]=useState('');
 const route=useLocation();
 const base=route.pathname.startsWith('/customer')?'/customer/orders':'/orders';
 const load=()=>api.get('/orders/mine').then(r=>setOrders(r.data.orders||[])).catch(()=>setMessage('Unable to load orders'));
 useEffect(()=>{load()},[]);
 return <main className="orders-page"><div className="orders-heading"><div><span>Your purchases</span><h1>My orders</h1><p>Open an order to view products, delivery progress, address, payment and cancellation options.</p></div></div>{message&&<div className="page-notice">{message}</div>}<div className="order-card-list">{orders.map(o=><Link className="order-summary-card" to={`${base}/${o._id}`} key={o._id}><div className="order-summary-icon">{o.fulfilmentMode==='delivery'?<Truck/>:<Package/>}</div><div className="order-summary-main"><b>{o.orderNumber}</b><p><Store size={15}/>{o.shopId?.name||'Local shop'} · {String(o.fulfilmentMode||'').replaceAll('_',' ')}</p><small>{new Date(o.createdAt).toLocaleString('en-IN')}</small></div><div className="order-summary-side"><span className={`status ${o.status}`}>{String(o.status).replaceAll('_',' ')}</span><b>₹{(o.totalPaise/100).toFixed(2)}</b><ChevronRight/></div></Link>)}{!orders.length&&<div className="orders-empty"><Package/><h2>No orders yet</h2><p>Your placed orders will appear here.</p><Link to="/shops">Browse nearby shops</Link></div>}</div></main>
}
