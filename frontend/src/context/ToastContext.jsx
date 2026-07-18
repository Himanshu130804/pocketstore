import React,{createContext,useCallback,useContext,useMemo,useState} from "react";
import {CheckCircle2,AlertTriangle,Info,X} from "lucide-react";
import "../components/common/ToastViewport.css";

const ToastContext=createContext(null);
let counter=0;
export function ToastProvider({children}){
 const[toasts,setToasts]=useState([]);
 const dismiss=useCallback(id=>setToasts(items=>items.filter(item=>item.id!==id)),[]);
 const push=useCallback((message,type="success",duration=3600)=>{
  const id=++counter;setToasts(items=>[...items,{id,message,type}]);
  window.setTimeout(()=>dismiss(id),duration);return id;
 },[dismiss]);
 const api=useMemo(()=>({success:m=>push(m,"success"),error:m=>push(m,"error",5200),info:m=>push(m,"info"),dismiss}),[push,dismiss]);
 return <ToastContext.Provider value={api}>{children}<div className="toast-viewport" aria-live="polite" aria-atomic="true">{toasts.map(t=>{const Icon=t.type==="error"?AlertTriangle:t.type==="info"?Info:CheckCircle2;return <div className={`app-toast ${t.type}`} key={t.id}><Icon size={20}/><span>{t.message}</span><button onClick={()=>dismiss(t.id)} aria-label="Dismiss notification"><X size={16}/></button></div>})}</div></ToastContext.Provider>
}
export const useToast=()=>useContext(ToastContext);
