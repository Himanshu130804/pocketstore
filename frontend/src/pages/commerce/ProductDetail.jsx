import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ChevronRight,
  Heart,
  MapPin,
  Minus,
  Plus,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  Store,
  Truck,
} from "lucide-react";
import api from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { useCart } from "../../context/CartContext";
import { useLocation } from "../../context/LocationContext";
import { useToast } from "../../context/ToastContext";
import ProductCard from "../../components/commerce/ProductCard";
import "./ProductDetail.css";

const origin = import.meta.env.VITE_API_ORIGIN || "http://localhost:5000";
const media = (url) =>
  url ? (url.startsWith("http") ? url : `${origin}${url}`) : "";

export default function ProductDetail() {
  const { location, params: locationParams, setOpen } = useLocation();
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();
  const { items, addItem, updateQty } = useCart();

  const [data, setData] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [activeImage, setActiveImage] = useState("");
  const [variantId, setVariantId] = useState("");
  const [qty, setQty] = useState(1);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [wishlistBusy, setWishlistBusy] = useState(false);

  useEffect(() => {
    let active = true;
    setLoadError("");
    api
      .get(`/products/${id}/public`, { params: locationParams })
      .then((response) => {
        if (!active) return;
        const payload = response.data;
        setData(payload);
        setActiveImage(
          payload.product.imageUrl || payload.product.galleryUrls?.[0] || ""
        );
        setVariantId(payload.product.variants?.[0]?._id || "");
        setQty(1);
      })
      .catch((error) => {
        if (active) {
          setLoadError(
            error.response?.data?.message || "Unable to load product"
          );
        }
      });
    return () => {
      active = false;
    };
  }, [id, location?.lat, location?.lng]);

  useEffect(() => {
    let active = true;
    if (!user || user.platformRole !== "customer") {
      setIsWishlisted(false);
      return () => {
        active = false;
      };
    }
    api
      .get("/customer/wishlist")
      .then((response) => {
        if (!active) return;
        const products = response.data?.wishlist?.products || [];
        setIsWishlisted(
          products.some((product) => String(product._id) === String(id))
        );
      })
      .catch(() => {
        if (active) setIsWishlisted(false);
      });
    return () => {
      active = false;
    };
  }, [id, user?._id, user?.platformRole]);

  const variant = useMemo(
    () =>
      data?.product.variants?.find(
        (item) => String(item._id) === String(variantId)
      ),
    [data, variantId]
  );

  const cartKey = data
    ? `${data.product._id}:${variant?._id || "base"}`
    : "";
  const cartItem = items.find((item) => item.key === cartKey);

  if (loadError) {
    return (
      <main className="product-detail-loading">
        <MapPin size={42} />
        <h2>Product unavailable at this location</h2>
        <p>{loadError}</p>
        <button onClick={() => setOpen(true)}>Change location</button>
      </main>
    );
  }

  if (!data) {
    return <main className="product-detail-loading">Loading product…</main>;
  }

  const { product, related } = data;
  const shop = product.shopId;
  const price = variant?.pricePaise ?? product.pricePaise;
  const stock = variant?.stockQty ?? product.stockQty;
  const images = [product.imageUrl, ...(product.galleryUrls || [])].filter(
    Boolean
  );
  const selectedMrp = variant?.mrpPaise ?? product.mrpPaise;
  const discountPaise = Number(selectedMrp || 0) - Number(price || 0);
  const discountPercent =
    selectedMrp > 0 ? Math.round((discountPaise / selectedMrp) * 100) : 0;
  const hasMeaningfulDiscount = discountPaise >= 50 && discountPercent >= 1;

  const toggleWishlist = async () => {
    if (!user) {
      toast.info("Login as a customer to save products");
      navigate("/login", { state: { from: `/products/${product._id}` } });
      return;
    }
    if (user.platformRole !== "customer") {
      toast.info("Wishlist is available in customer mode");
      return;
    }
    setWishlistBusy(true);
    try {
      const response = await api.post("/customer/wishlist/toggle", {
        type: "product",
        id: product._id,
      });
      const added = Boolean(response.data?.added);
      setIsWishlisted(added);
      toast.success(added ? "Added to wishlist" : "Removed from wishlist");
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Unable to update wishlist"
      );
    } finally {
      setWishlistBusy(false);
    }
  };

  const addSelectedToCart = () => {
    addItem(product, qty, variant);
    toast.success(`${product.name} added to cart`);
  };

  const buyNow = () => {
    if (!cartItem) addItem(product, qty, variant);
    navigate(user ? "/checkout" : "/cart");
  };

  const fulfilmentLabels = {
    walk_in: "Walk-in available",
    pickup: "Pickup from shop",
    delivery: "Local delivery available",
    reserve: "Reserve before visiting",
    express_pickup: "Express pickup available",
    preorder: "Preorder available",
  };

  return (
    <main className="product-detail-page">
      <div className="breadcrumb">
        <Link to="/">Home</Link>
        <ChevronRight size={15} />
        <Link
          to={`/search?q=${encodeURIComponent(
            product.category || product.name
          )}`}
        >
          {product.category || "Products"}
        </Link>
        <ChevronRight size={15} />
        <span>{product.name}</span>
      </div>

      <section className="product-detail-main">
        <div className="product-gallery">
          <div className="thumb-list">
            {images.map((image, index) => (
              <button
                className={activeImage === image ? "active" : ""}
                key={`${image}-${index}`}
                onClick={() => setActiveImage(image)}
                aria-label={`View product image ${index + 1}`}
              >
                <img src={media(image)} alt="" />
              </button>
            ))}
          </div>
          <div className="hero-product-image">
            {activeImage ? (
              <img src={media(activeImage)} alt={product.name} />
            ) : (
              <ShoppingBag size={80} />
            )}
          </div>
        </div>

        <div className="product-info-panel">
          <div className="product-title-row">
            <div>
              <span className="product-category-label">{product.category}</span>
              <h1>{product.name}</h1>
            </div>
            <button
              className={`wishlist-toggle ${isWishlisted ? "active" : ""}`}
              onClick={toggleWishlist}
              disabled={wishlistBusy}
              aria-pressed={isWishlisted}
            >
              <Heart size={19} fill={isWishlisted ? "currentColor" : "none"} />
              {isWishlisted ? "In wishlist" : "Add to wishlist"}
            </button>
          </div>

          {product.brand && (
            <p className="product-brand">
              Brand: <b>{product.brand}</b>
            </p>
          )}

          <Link to={`/shops/${shop.slug}`} className="sold-by">
            <Store size={18} /> Sold by <b>{shop.name}</b>
            {Number.isFinite(shop.distanceKm) && (
              <span> · {shop.distanceKm.toFixed(1)} km</span>
            )}
          </Link>

          {!location && (
            <button
              className="product-location-button"
              onClick={() => setOpen(true)}
            >
              Set location to confirm availability
            </button>
          )}

          <div className="detail-price">
            <strong>₹{(price / 100).toFixed(2)}</strong>
            {hasMeaningfulDiscount && (
              <>
                <del>₹{(selectedMrp / 100).toFixed(2)}</del>
                <span>{discountPercent}% off</span>
              </>
            )}
          </div>

          <p className={stock > 0 ? "stock-ok" : "stock-out"}>
            {stock > 0 ? `${stock} available` : "Currently out of stock"}
          </p>

          {product.variants?.length > 0 && (
            <div className="variant-picker">
              <label>Choose option</label>
              <div>
                {product.variants.map((item) => (
                  <button
                    className={
                      variantId === String(item._id) ? "selected" : ""
                    }
                    onClick={() => {
                      setVariantId(String(item._id));
                      setQty(1);
                    }}
                    key={item._id}
                  >
                    {item.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <p className="product-description">
            {product.description ||
              "This item is available from a verified local PocketStore shop."}
          </p>

          <div className="fulfilment-box">
            {(product.fulfilmentModes || []).map((mode) => (
              <span key={mode}>
                {mode === "delivery" ? (
                  <Truck />
                ) : mode === "pickup" || mode === "express_pickup" ? (
                  <MapPin />
                ) : (
                  <Store />
                )}
                {fulfilmentLabels[mode] || mode.replaceAll("_", " ")}
              </span>
            ))}
            <span>
              <ShieldCheck /> Shop return policy applies
            </span>
          </div>

          <div className="product-action-area">
            {cartItem ? (
              <div className="in-cart-panel">
                <div className="inline-quantity">
                  <button
                    onClick={() => updateQty(cartItem.key, cartItem.quantity - 1)}
                    aria-label="Decrease quantity"
                  >
                    <Minus size={18} />
                  </button>
                  <strong>{cartItem.quantity}</strong>
                  <button
                    onClick={() => updateQty(cartItem.key, cartItem.quantity + 1)}
                    disabled={cartItem.quantity >= stock}
                    aria-label="Increase quantity"
                  >
                    <Plus size={18} />
                  </button>
                </div>
                <button className="go-cart-button" onClick={() => navigate("/cart")}>
                  <ShoppingCart size={18} /> Added · Go to cart
                </button>
              </div>
            ) : (
              <div className="buy-controls">
                <select
                  value={qty}
                  onChange={(event) => setQty(Number(event.target.value))}
                  aria-label="Quantity"
                >
                  {Array.from(
                    { length: Math.min(Math.max(stock, 0), 10) },
                    (_, index) => index + 1
                  ).map((number) => (
                    <option key={number}>{number}</option>
                  ))}
                </select>
                <button disabled={stock < 1} onClick={addSelectedToCart}>
                  Add to cart
                </button>
              </div>
            )}

            <div className="secondary-product-actions">
              <button disabled={stock < 1} onClick={buyNow}>
                Buy now
              </button>
              <Link to={`/shops/${shop.slug}`}>Visit shop</Link>
            </div>
          </div>
        </div>
      </section>

      {related?.length > 0 && (
        <section>
          <div className="related-heading">
            <h2>Related products</h2>
          </div>
          <div className="commerce-grid related-product-grid">
            {related.map((item) => (
              <ProductCard
                key={item._id}
                product={{ ...item, shopId: shop }}
              />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
