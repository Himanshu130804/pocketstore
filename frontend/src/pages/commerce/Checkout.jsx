import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MapPin, Store, Truck } from "lucide-react";
import api from "../../api/client";
import { useCart } from "../../context/CartContext";
import { useLocation } from "../../context/LocationContext";
import "./Checkout.css";

export default function Checkout() {
  const { groups, clearShop, count } = useCart();
  const { location, setOpen } = useLocation();
  const nav = useNavigate();
  const [addresses, setAddresses] = useState([]);
  const [selectedAddress, setSelectedAddress] = useState("");
  const [choices, setChoices] = useState({});
  const [notes, setNotes] = useState({});
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState("");
  const [quotes, setQuotes] = useState({});
  const [quoteLoading, setQuoteLoading] = useState(false);

  useEffect(() => {
    let active = true;
    api.get("/customer/addresses")
      .then((response) => {
        const list = Array.isArray(response.data.addresses) ? response.data.addresses : [];
        if (!active) return;
        setAddresses(list);
        const preferred = list.find((address) => address.isDefault) || list[0];
        setSelectedAddress(preferred ? String(preferred._id) : "");
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    setChoices((previous) => {
      const next = { ...previous };
      for (const group of groups) {
        if (next[group.shopId]) continue;
        const commonModes = group.items.reduce(
          (modes, item) => modes.filter((mode) => item.fulfilmentModes.includes(mode)),
          group.items[0]?.fulfilmentModes || []
        );
        next[group.shopId] = commonModes.includes("delivery")
          ? "delivery"
          : commonModes.includes("pickup")
            ? "pickup"
            : commonModes[0] || "walk_in";
      }
      return next;
    });
  }, [groups]);

  const chosenAddress = useMemo(
    () => addresses.find((address) => String(address._id) === selectedAddress),
    [addresses, selectedAddress]
  );

  useEffect(() => {
    let active = true;
    if (!groups.length || Object.keys(choices).length === 0) return undefined;
    const timer = setTimeout(async () => {
      setQuoteLoading(true);
      try {
        const entries = await Promise.all(groups.map(async (group) => {
          const mode = choices[group.shopId];
          const addressPoint = chosenAddress?.location?.coordinates?.length === 2 && chosenAddress.location.coordinates.some(Number)
            ? { lat: chosenAddress.location.coordinates[1], lng: chosenAddress.location.coordinates[0] }
            : null;
          const selectedPoint = mode === "delivery" ? addressPoint : location;
          if (!mode || !selectedPoint) return [group.shopId, null];
          const { data } = await api.post("/orders/quote", {
            shopId: group.shopId,
            items: group.items.map(item => ({ productId: item.productId, quantity: item.quantity, variantId: item.variant?._id || null })),
            fulfilmentMode: mode,
            address: mode === "delivery" && chosenAddress ? { line1: chosenAddress.line1, area: chosenAddress.area, city: chosenAddress.city, state: chosenAddress.state, pincode: chosenAddress.pincode, location: chosenAddress.location } : undefined,
            customerLocation: { lat: selectedPoint.lat, lng: selectedPoint.lng },
          });
          return [group.shopId, data.quote];
        }));
        if (active) setQuotes(Object.fromEntries(entries));
      } catch (e) {
        if (active) setError(e.response?.data?.message || "Unable to calculate order charges");
      } finally { if (active) setQuoteLoading(false); }
    }, 250);
    return () => { active = false; clearTimeout(timer); };
  }, [groups, choices, chosenAddress?._id, chosenAddress?.location?.coordinates?.join(','), location?.lat, location?.lng]);

  const grandTotalPaise = groups.reduce((sum, group) => sum + (quotes[group.shopId]?.totalPaise ?? group.subtotalPaise), 0);

  if (!count) {
    return (
      <main className="checkout-empty">
        <h1>No items to checkout</h1>
        <button onClick={() => nav("/shops")}>Browse shops</button>
      </main>
    );
  }

  async function placeOrders() {
    setError("");
    setPlacing(true);
    try {
      for (const group of groups) {
        const mode = choices[group.shopId];
        if (mode === "delivery" && !chosenAddress) {
          throw new Error("Add or select a delivery address.");
        }
        const addressPoint=chosenAddress?.location?.coordinates?.length===2&&chosenAddress.location.coordinates.some(Number)?{lat:chosenAddress.location.coordinates[1],lng:chosenAddress.location.coordinates[0]}:null;
        if(mode==="delivery"&&!addressPoint)throw new Error("The selected delivery address has no exact map pin. Open Addresses and pin it again.");
        const selectedPoint=mode==="delivery"?addressPoint:location;
        if(!selectedPoint) throw new Error("Choose or detect your location before checkout.");
        await api.post("/orders", {
          shopId: group.shopId,
          items: group.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            variantId: item.variant?._id || null,
          })),
          fulfilmentMode: mode,
          address: mode === "delivery"
            ? {
                line1: chosenAddress.line1,
                area: chosenAddress.area,
                city: chosenAddress.city,
                state: chosenAddress.state,
                pincode: chosenAddress.pincode,
                location: chosenAddress.location,
              }
            : undefined,
          customerLocation: {lat:selectedPoint.lat,lng:selectedPoint.lng},
          notes: notes[group.shopId] || "",
        });
        clearShop(group.shopId);
      }
      nav("/orders");
    } catch (requestError) {
      setError(requestError.response?.data?.message || requestError.message || "Checkout failed");
    } finally {
      setPlacing(false);
    }
  }

  return (
    <main className="checkout-page">
      <div className="checkout-head">
        <h1>Checkout</h1>
        <p>Confirm fulfilment separately for each local shop.</p>
      </div>

      {!location&&<div className="checkout-location-warning"><MapPin/><span>Set your location so PocketStore can validate each shop’s service radius.</span><button onClick={()=>setOpen(true)}>Set location</button></div>}{error && <div className="checkout-error">{error}</div>}

      <div className="checkout-layout">
        <div className="checkout-sections">
          <section className="checkout-card">
            <h2><MapPin />Delivery address</h2>
            {addresses.length ? (
              <div className="address-options">
                {addresses.map((address) => (
                  <label key={address._id}>
                    <input
                      type="radio"
                      name="address"
                      checked={selectedAddress === String(address._id)}
                      onChange={() => setSelectedAddress(String(address._id))}
                    />
                    <span>
                      <b>{address.label || "Address"}</b>
                      {address.line1}{address.area?`, ${address.area}`:''}, {address.city} - {address.pincode}{!address.location?.coordinates?.some(Number)&&" · location pin missing"}
                    </span>
                  </label>
                ))}
              </div>
            ) : (
              <div className="no-address">
                No saved address. <button onClick={() => nav("/customer/addresses")}>Add address</button>
              </div>
            )}
          </section>

          {groups.map((group) => {
            const commonModes = group.items.reduce(
              (modes, item) => modes.filter((mode) => item.fulfilmentModes.includes(mode)),
              group.items[0]?.fulfilmentModes || []
            );
            return (
              <section className="checkout-card" key={group.shopId}>
                <div className="checkout-shop-title">
                  <Store />
                  <div>
                    <h2>{group.shop?.name || "Local shop"}</h2>
                    <p>{group.items.length} products · ₹{(group.subtotalPaise / 100).toFixed(2)}</p>
                  </div>
                </div>

                <div className="fulfilment-options">
                  {commonModes
                    .filter((mode) => ["delivery", "pickup", "express_pickup", "reserve", "walk_in", "preorder"].includes(mode))
                    .map((mode) => (
                      <label key={mode}>
                        <input
                          type="radio"
                          name={`mode-${group.shopId}`}
                          checked={choices[group.shopId] === mode}
                          onChange={() => setChoices({ ...choices, [group.shopId]: mode })}
                        />
                        <span><Truck />{mode.replaceAll("_", " ")}</span>
                      </label>
                    ))}
                </div>

                <textarea
                  placeholder="Note for this shop (optional)"
                  value={notes[group.shopId] || ""}
                  onChange={(event) => setNotes({ ...notes, [group.shopId]: event.target.value })}
                />

                <div className="checkout-products">
                  {group.items.map((item) => (
                    <div key={item.key}>
                      <span>
                        {item.name}{item.variant ? ` · ${item.variant.name}` : ""} × {item.quantity}
                      </span>
                      <b>₹{((item.pricePaise * item.quantity) / 100).toFixed(2)}</b>
                    </div>
                  ))}
                </div>
              </section>
            );
          })}
        </div>

        <aside className="checkout-summary">
          <h2>Order summary</h2>
          {groups.map((group) => {
            const quote=quotes[group.shopId];
            const line=(label,value)=><div className="charge-line"><span>{label}</span><b>₹{((value||0)/100).toFixed(2)}</b></div>;
            return <div className="shop-charge-summary" key={group.shopId}><strong>{group.shop?.name || "Shop"}</strong>{line("Items",quote?.subtotalPaise??group.subtotalPaise)}{quote?.deliveryFeePaise>0&&line(`Delivery (${quote.distanceKm} km)`,quote.deliveryFeePaise)}{choices[group.shopId]==="delivery"&&quote?.deliveryFeePaise===0&&<div className="charge-line free"><span>Delivery</span><b>FREE</b></div>}{quote?.packagingFeePaise>0&&line("Packaging",quote.packagingFeePaise)}{quote?.handlingFeePaise>0&&line("Handling",quote.handlingFeePaise)}{quote?.platformFeePaise>0&&line("Platform fee",quote.platformFeePaise)}{quote?.taxPaise>0&&line(`GST (${quote.taxPercent}%)`,quote.taxPaise)}</div>;
          })}
          <hr />
          <div className="checkout-total">
            <span>Total</span>
            <b>₹{(grandTotalPaise / 100).toFixed(2)}</b>
          </div>
          <p>Payment will be recorded by each shop. Online gateway can be connected later.</p>
          <button disabled={placing||quoteLoading} onClick={placeOrders}>
            {placing ? "Placing orders…" : quoteLoading ? "Calculating charges…" : "Place all orders"}
          </button>
        </aside>
      </div>
    </main>
  );
}
