import React,{useState} from 'react';
import {Outlet} from 'react-router-dom';
import {Menu,X} from 'lucide-react';
import CustomerSidebar from '../../components/customer/CustomerSidebar';
import './customer.css';
export default function CustomerShell(){const[open,setOpen]=useState(false);return <main className="customer-portal"><button className="customer-menu-button" onClick={()=>setOpen(true)}><Menu size={20}/> Account menu</button><div className={`customer-sidebar-wrap ${open?'open':''}`}><button className="customer-menu-close" onClick={()=>setOpen(false)} aria-label="Close account menu"><X/></button><CustomerSidebar onNavigate={()=>setOpen(false)}/></div>{open&&<button className="customer-sidebar-overlay" onClick={()=>setOpen(false)} aria-label="Close account menu"/>}<section className="customer-main"><Outlet/></section></main>}
