import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Home, SearchX } from "lucide-react";
import "./NotFound.css";
export default function NotFound(){return <main className="not-found"><div className="not-found-card"><span><SearchX size={38}/></span><p className="eyebrow">404 · Page not found</p><h1>This page is not available</h1><p>The link may be outdated, or the page may have moved. Return to PocketStore and continue browsing.</p><div><button onClick={()=>history.back()}><ArrowLeft size={18}/>Go back</button><Link to="/"><Home size={18}/>Home page</Link></div></div></main>}
