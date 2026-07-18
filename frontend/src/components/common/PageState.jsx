import React from "react";
import "./PageState.css";

export default function PageState({ loading, error, onRetry, children }) {
  if (loading) return <div className="page-state"><div className="page-spinner"/><h3>Loading data…</h3><p>Please wait while PocketStore fetches the latest information.</p></div>;
  if (error) return <div className="page-state error"><h3>Unable to load this page</h3><p>{error}</p>{onRetry && <button onClick={onRetry}>Try again</button>}</div>;
  return children;
}
