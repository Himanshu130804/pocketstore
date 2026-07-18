import React, { useCallback, useEffect, useState } from "react";
import api from "../../api/client";
import DataTable from "../../components/common/DataTable";
import PageState from "../../components/common/PageState";
import "./admin.css";

export default function AdminApprovals(){
 const [rows,setRows]=useState([]); const [loading,setLoading]=useState(true); const [error,setError]=useState("");
 const load=useCallback(async()=>{try{setLoading(true);setError("");const{data}=await api.get("/admin/approvals");setRows(Array.isArray(data?.approvals)?data.approvals:[])}catch(e){setError(e.response?.data?.message||"Could not fetch approval requests.")}finally{setLoading(false)}},[]);
 useEffect(()=>{void load()},[load]);
 const review=async(id,status)=>{const note=window.prompt(status==="approved"?"Approval note":"Reason for rejection")||"Reviewed by administrator";try{await api.patch(`/admin/approvals/${id}`,{status,note});await load()}catch(e){alert(e.response?.data?.message||"Review failed")}};
 const cols=[{key:"type",label:"Request",render:r=>(r.type||"request").replaceAll("_"," ")},{key:"shop",label:"Shop",render:r=>r.shopId?.name||"—"},{key:"owner",label:"Requested by",render:r=>r.requestedBy?.name||r.requestedBy?.email||"—"},{key:"date",label:"Submitted",render:r=>r.createdAt?new Date(r.createdAt).toLocaleDateString():"—"},{key:"status",label:"Status",render:r=><span className="status-pill pending">{r.status||"pending"}</span>},{key:"actions",label:"Actions",render:r=><div className="table-actions"><button className="primary-action" onClick={()=>review(r._id,"approved")}>Approve</button><button className="danger-action" onClick={()=>review(r._id,"rejected")}>Reject</button></div>}];
 return <PageState loading={loading} error={error} onRetry={load}><div className="admin-title"><div><h1>Approval center</h1><p>Review shop registrations, verification and sensitive profile changes.</p></div><span className="count-chip">{rows.length} pending</span></div><DataTable columns={cols} rows={rows} empty="No pending approval requests."/></PageState>
}
