import React,{createContext,useContext,useEffect,useMemo,useState} from 'react';

const ThemeContext=createContext(null);
const STORAGE_KEY='pocketstore_theme';
const ACCENT_KEY='pocketstore_accent';
const DEFAULT_ACCENT='#6c5ce7';

const readableText=(hex)=>{
  const value=String(hex||'').replace('#','');
  if(!/^[0-9a-fA-F]{6}$/.test(value)) return '#ffffff';
  const r=parseInt(value.slice(0,2),16),g=parseInt(value.slice(2,4),16),b=parseInt(value.slice(4,6),16);
  return (r*299+g*587+b*114)/1000>150?'#17152b':'#ffffff';
};

export function ThemeProvider({children}){
  const[theme,setThemeState]=useState(()=>localStorage.getItem(STORAGE_KEY)||'light');
  const[accent,setAccentState]=useState(()=>localStorage.getItem(ACCENT_KEY)||DEFAULT_ACCENT);
  useEffect(()=>{
    const root=document.documentElement;
    root.dataset.theme=theme;
    root.style.setProperty('--user-accent',accent);
    root.style.setProperty('--user-accent-text',readableText(accent));
    localStorage.setItem(STORAGE_KEY,theme);
    localStorage.setItem(ACCENT_KEY,accent);
  },[theme,accent]);
  const setTheme=(value)=>setThemeState(['light','dark','custom'].includes(value)?value:'light');
  const setAccent=(value)=>setAccentState(/^#[0-9a-fA-F]{6}$/.test(value)?value:DEFAULT_ACCENT);
  const value=useMemo(()=>({theme,accent,setTheme,setAccent}),[theme,accent]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
export const useTheme=()=>useContext(ThemeContext);
