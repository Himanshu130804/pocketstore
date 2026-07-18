import React,{useEffect,useState} from 'react';
import api from '../../api/client';
import {useAuth} from '../../context/AuthContext';
import {useTheme} from '../../context/ThemeContext';
import {Moon,Palette,Sun} from 'lucide-react';
import './customer.css';

const accents=['#6c5ce7','#2563eb','#0f9f6e','#e84a7f','#f97316','#111827'];
export default function CustomerSettings(){
 const{user,setUser}=useAuth();
 const{theme,accent,setTheme,setAccent}=useTheme();
 const[prefs,setPrefs]=useState({orders:true,offers:true,account:true});
 const[saving,setSaving]=useState(false);const[msg,setMsg]=useState('');
 useEffect(()=>{if(user?.notificationPreferences)setPrefs(current=>({...current,...user.notificationPreferences}))},[user]);
 const save=async()=>{try{setSaving(true);setMsg('');const{data}=await api.patch('/customer/profile',{notificationPreferences:prefs});setUser(data.user);setMsg('Settings saved')}catch(e){setMsg(e.response?.data?.message||'Could not save settings')}finally{setSaving(false)}};
 return <>
  <div className="portal-heading"><div><span>Preferences</span><h1>Settings</h1><p>Personalize PocketStore and control your notifications.</p></div><button className="primary-button" onClick={save} disabled={saving}>{saving?'Saving…':'Save settings'}</button></div>
  {msg&&<div className="inline-alert">{msg}</div>}
  <section className="portal-card theme-settings-card">
   <div className="section-title"><div><h2>Appearance</h2><p>Choose a comfortable theme. Your choice is saved on this device.</p></div></div>
   <div className="theme-choice-grid">
    <button className={theme==='light'?'active':''} onClick={()=>setTheme('light')}><Sun/><b>Light</b><span>Warm, bright marketplace</span></button>
    <button className={theme==='dark'?'active':''} onClick={()=>setTheme('dark')}><Moon/><b>Dark</b><span>Low-light dashboard mode</span></button>
    <button className={theme==='custom'?'active':''} onClick={()=>setTheme('custom')}><Palette/><b>Custom</b><span>Your accent colour</span></button>
   </div>
   <div className="accent-settings">
    <div><b>Accent colour</b><p>Used for primary buttons, selected items and highlights.</p></div>
    <div className="accent-swatches">{accents.map(color=><button key={color} aria-label={`Use ${color}`} className={accent===color?'selected':''} style={{background:color}} onClick={()=>{setAccent(color);setTheme('custom')}}/>)}<label className="custom-colour-input"><input type="color" value={accent} onChange={e=>{setAccent(e.target.value);setTheme('custom')}}/><span>Custom</span></label></div>
   </div>
  </section>
  <section className="portal-card settings-list top-gap"><h2>Notifications</h2>{[['orders','Order and delivery updates'],['offers','Offers from saved shops'],['account','Security and account alerts']].map(([k,l])=><label key={k}><div><b>{l}</b><p>Choose whether PocketStore sends this type of notification.</p></div><input type="checkbox" checked={Boolean(prefs[k])} onChange={e=>setPrefs({...prefs,[k]:e.target.checked})}/></label>)}</section>
 </>;
}
