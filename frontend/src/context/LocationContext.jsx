import React,{createContext,useCallback,useContext,useEffect,useMemo,useState} from "react";
import api from "../api/client";
import {useAuth} from "./AuthContext";

const LocationContext=createContext(null);
const storageKey="pocketstore_selected_location";
const readLocal=()=>{try{return JSON.parse(localStorage.getItem(storageKey)||"null")}catch{return null}};

export function LocationProvider({children}){
 const{user}=useAuth();
 const[location,setLocationState]=useState(readLocal);
 const[open,setOpen]=useState(false);
 const[busy,setBusy]=useState(false);
 const[error,setError]=useState("");
 const persist=useCallback(async(next,{saveRemote=true}={})=>{
  setLocationState(next);localStorage.setItem(storageKey,JSON.stringify(next));
  if(user&&saveRemote){try{await api.patch("/locations/me",next)}catch(e){console.warn("Unable to save location",e)}}
 },[user]);
 useEffect(()=>{if(!user)return;let active=true;api.get("/locations/me").then(({data})=>{const saved=data?.location;if(active&&saved?.location?.coordinates?.length===2&&!(saved.location.coordinates[0]===0&&saved.location.coordinates[1]===0)){const next={label:saved.label||"My location",addressText:saved.addressText||saved.label||"",source:saved.source||"manual",lat:saved.location.coordinates[1],lng:saved.location.coordinates[0]};persist(next,{saveRemote:false});}}).catch(()=>{});return()=>{active=false}},[user,persist]);
 const detect=useCallback(async()=>{
  if(!navigator.geolocation)throw new Error("Location detection is not supported by this browser.");
  setBusy(true);setError("");
  try{const coords=await new Promise((resolve,reject)=>navigator.geolocation.getCurrentPosition(p=>resolve(p.coords),reject,{enableHighAccuracy:true,timeout:15000,maximumAge:60000}));const{data}=await api.post("/locations/reverse",{lat:coords.latitude,lng:coords.longitude});const result=data.result;const next={label:result.address?.suburb||result.address?.neighbourhood||result.address?.village||result.address?.town||result.address?.city||"Current location",addressText:result.label,source:"detected",lat:result.lat,lng:result.lng};await persist(next);setOpen(false);return next;}catch(e){const message=e.response?.data?.message||e.message||"Unable to detect location";setError(message);throw e}finally{setBusy(false)}
 },[persist]);
 const searchAddress=useCallback(async(address)=>{setBusy(true);setError("");try{const{data}=await api.post("/locations/geocode",{address});return data.results||[]}catch(e){setError(e.response?.data?.message||"Unable to find this address");return[]}finally{setBusy(false)}},[]);
 const choose=useCallback(async(result)=>{const next={label:result.label?.split(",")[0]||"Saved location",addressText:result.label,source:"manual",lat:Number(result.lat),lng:Number(result.lng)};await persist(next);setOpen(false);return next},[persist]);
 const params=useMemo(()=>location?{lat:location.lat,lng:location.lng}:{},[location]);
 return <LocationContext.Provider value={{location,params,open,setOpen,busy,error,setError,detect,searchAddress,choose,persist}}>{children}</LocationContext.Provider>
}
export const useLocation=()=>useContext(LocationContext);
