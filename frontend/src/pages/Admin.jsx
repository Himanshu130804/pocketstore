import React, { useEffect, useState } from "react";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";

export default function Admin() {
  const { user } = useAuth();
  const [overview, setOverview] = useState(null);
  const [shops, setShops] = useState([]);
  const [approvals, setApprovals] = useState([]);
  const [users, setUsers] = useState([]);
  const [message, setMessage] = useState("");

  const load = async () => {
    try {
      const [overviewResponse, shopsResponse, approvalsResponse, usersResponse] = await Promise.all([
        api.get("/admin/overview"),
        api.get("/admin/shops"),
        api.get("/admin/approvals"),
        api.get("/admin/users"),
      ]);
      setOverview(overviewResponse.data.counts);
      setShops(shopsResponse.data.shops);
      setApprovals(approvalsResponse.data.approvals);
      setUsers(usersResponse.data.users);
    } catch (error) {
      setMessage(error.response?.data?.message || "Unable to load administration data");
    }
  };

  useEffect(() => { load(); }, []);

  const updateShopStatus = async (id, status) => {
    await api.patch(`/admin/shops/${id}/status`, { status });
    await load();
  };

  const reviewApproval = async (id, status) => {
    await api.patch(`/admin/approvals/${id}`, {
      status,
      note: status === "approved" ? "Approved by administrator" : "Rejected by administrator",
    });
    await load();
  };

  const updateUserStatus = async (id, status) => {
    await api.patch(`/admin/users/${id}/status`, { status });
    await load();
  };

  const promote = async (id) => {
    await api.patch(`/admin/users/${id}/promote-admin`, { permissions: [] });
    await load();
  };

  const demote = async (id) => {
    await api.patch(`/admin/users/${id}/demote-admin`, { reason: "Administrator access removed" });
    await load();
  };

  return (
    <main className="page">
      <h1>Platform administration</h1>
      {message && <div className="notice">{message}</div>}
      {overview && (
        <div className="stats">
          {Object.entries(overview).map(([key, value]) => (
            <article key={key}><b>{value}</b><span>{key}</span></article>
          ))}
        </div>
      )}

      <h2>Pending approvals</h2>
      <div className="list">
        {approvals.map((approval) => (
          <article key={approval._id}>
            <div><b>{approval.type}</b><p>{approval.shopId?.name}</p></div>
            <div>
              <button onClick={() => reviewApproval(approval._id, "approved")}>Approve</button>
              <button onClick={() => reviewApproval(approval._id, "rejected")}>Reject</button>
            </div>
          </article>
        ))}
      </div>

      <h2>All shops</h2>
      <div className="list">
        {shops.map((shop) => (
          <article key={shop._id}>
            <div><b>{shop.name}</b><p>{shop.ownerId?.name} · {shop.status}</p></div>
            <div>
              <button onClick={() => updateShopStatus(shop._id, "approved")}>Activate</button>
              <button onClick={() => updateShopStatus(shop._id, "inactive")}>Deactivate</button>
              <button onClick={() => updateShopStatus(shop._id, "suspended")}>Suspend</button>
              <button onClick={() => updateShopStatus(shop._id, "banned")}>Ban</button>
            </div>
          </article>
        ))}
      </div>

      <h2>Users and administrators</h2>
      <div className="list">
        {users.map((listedUser) => (
          <article key={listedUser._id}>
            <div>
              <b>{listedUser.name}</b>
              <p>{listedUser.email || listedUser.phone} · {listedUser.platformRole} · {listedUser.status}</p>
            </div>
            <div>
              {listedUser.status !== "active" && <button onClick={() => updateUserStatus(listedUser._id, "active")}>Activate</button>}
              {listedUser.status === "active" && <button onClick={() => updateUserStatus(listedUser._id, "suspended")}>Suspend</button>}
              {listedUser.status !== "banned" && <button onClick={() => updateUserStatus(listedUser._id, "banned")}>Ban</button>}
              {listedUser.status === "banned" && <button onClick={() => updateUserStatus(listedUser._id, "active")}>Unban</button>}
              {user?.platformRole === "super_admin" && !["platform_admin", "super_admin"].includes(listedUser.platformRole) && (
                <button onClick={() => promote(listedUser._id)}>Make Admin</button>
              )}
              {user?.platformRole === "super_admin" && listedUser.platformRole === "platform_admin" && (
                <button onClick={() => demote(listedUser._id)}>Remove Admin</button>
              )}
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}
