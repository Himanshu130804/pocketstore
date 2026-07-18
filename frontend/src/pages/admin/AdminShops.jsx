import React, { useCallback, useEffect, useMemo, useState } from "react";
import api from "../../api/client";
import DataTable from "../../components/common/DataTable";
import PageState from "../../components/common/PageState";
import "./admin.css";

export default function AdminShops() {
  const [shops, setShops] = useState([]); const [q, setQ] = useState(""); const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true); const [error, setError] = useState("");
  const load = useCallback(async () => { try { setLoading(true); setError(""); const { data } = await api.get("/admin/shops"); setShops(Array.isArray(data?.shops) ? data.shops : []); } catch (e) { setError(e.response?.data?.message || "Could not fetch shops."); } finally { setLoading(false); } }, []);
  useEffect(() => { void load(); }, [load]);
  const change = async (id, value) => { try { await api.patch(`/admin/shops/${id}/status`, { status: value, reason: value === "banned" ? "Administrative action" : "" }); await load(); } catch (e) { alert(e.response?.data?.message || "Status update failed"); } };
  const rows = useMemo(() => shops.filter(s => (!status || s.status === status) && (!q || `${s.name} ${s.category} ${s.ownerId?.name || ""}`.toLowerCase().includes(q.toLowerCase()))), [shops, q, status]);
  const cols = [{ key:"name",label:"Shop"},{key:"category",label:"Category"},{key:"owner",label:"Owner",render:s=>s.ownerId?.name||"—"},{key:"location",label:"Location",render:s=>s.address?.city||"—"},{key:"fulfilment",label:"Fulfilment",render:s=>(s.fulfilmentModes||[]).map(x=>x.replaceAll("_"," ")).join(", ")||"—"},{key:"status",label:"Status",render:s=><span className={`status-pill ${s.status}`}>{s.status}</span>},{key:"actions",label:"Actions",render:s=><div className="table-actions"><button className="primary-action" onClick={()=>change(s._id,"approved")}>Activate</button><button onClick={()=>change(s._id,"inactive")}>Deactivate</button><button onClick={()=>change(s._id,"suspended")}>Suspend</button><button className="danger-action" onClick={()=>change(s._id,"banned")}>Ban</button></div>}];
  return <PageState loading={loading} error={error} onRetry={load}><div className="admin-title"><div><h1>Shop management</h1><p>Review, activate, suspend and govern every store on the platform.</p></div><span className="count-chip">{rows.length} shops</span></div><div className="filter-row"><input placeholder="Search shops, categories or owners" value={q} onChange={e=>setQ(e.target.value)}/><select value={status} onChange={e=>setStatus(e.target.value)}><option value="">All statuses</option><option value="pending">Pending</option><option value="approved">Approved</option><option value="inactive">Inactive</option><option value="suspended">Suspended</option><option value="banned">Banned</option></select></div><DataTable columns={cols} rows={rows} empty="No shops match these filters."/></PageState>;
}
