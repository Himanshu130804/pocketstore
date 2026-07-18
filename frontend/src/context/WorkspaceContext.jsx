import React,{createContext,useCallback,useContext,useEffect,useMemo,useState} from 'react';
import api from '../api/client';
import {useAuth} from './AuthContext';

const WorkspaceContext=createContext(null);

function normalizeWorkspace(shop,role='owner',permissions=['*']){
  return shop?{shop,role,permissions}:null;
}

export function WorkspaceProvider({children}){
  const {user}=useAuth();
  const [workspaces,setWorkspaces]=useState([]);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState('');
  const [activeId,setActiveIdState]=useState(()=>localStorage.getItem('ps_active_shop_id')||'');

  const refresh=useCallback(async()=>{
    if(!user){setWorkspaces([]);setError('');return;}
    setLoading(true);setError('');
    try{
      let list=[];
      try{
        const {data}=await api.get('/workspace/mine');
        list=Array.isArray(data?.workspaces)?data.workspaces.filter(x=>x?.shop?._id):[];
      }catch(workspaceError){
        if(user.platformRole==='shop_owner'){
          const {data}=await api.get('/shops/mine');
          list=(Array.isArray(data?.shops)?data.shops:[]).map(shop=>normalizeWorkspace(shop)).filter(Boolean);
        }else throw workspaceError;
      }

      const byId=new Map();
      list.forEach(item=>{if(item?.shop?._id)byId.set(String(item.shop._id),item)});
      list=[...byId.values()];
      setWorkspaces(list);

      const preferred=list.find(x=>String(x.shop._id)===String(activeId));
      const approved=list.find(x=>x.shop.status==='approved');
      const next=preferred||approved||list[0]||null;
      if(next){
        const id=String(next.shop._id);
        if(id!==activeId)setActiveIdState(id);
        localStorage.setItem('ps_active_shop_id',id);
      }else{
        setActiveIdState('');
        localStorage.removeItem('ps_active_shop_id');
      }
    }catch(err){
      setWorkspaces([]);
      setError(err.response?.data?.message||'Could not load your shops. Please retry.');
    }finally{setLoading(false);}
  },[user?._id,user?.platformRole]);

  useEffect(()=>{refresh();},[refresh]);

  const setActiveId=id=>{
    setActiveIdState(String(id||''));
    if(id)localStorage.setItem('ps_active_shop_id',String(id));
    else localStorage.removeItem('ps_active_shop_id');
  };

  const active=useMemo(()=>workspaces.find(x=>String(x.shop?._id)===String(activeId))||workspaces.find(x=>x.shop?.status==='approved')||workspaces[0]||null,[workspaces,activeId]);
  const activeShop=active?.shop||null;

  return <WorkspaceContext.Provider value={{
    workspaces,active,activeShop,role:active?.role,permissions:active?.permissions||[],
    loading,error,setActiveId,refresh,hasShops:workspaces.length>0,
    isApproved:activeShop?.status==='approved'
  }}>{children}</WorkspaceContext.Provider>;
}

export const useWorkspace=()=>useContext(WorkspaceContext);
