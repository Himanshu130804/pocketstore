import React from "react";
import { Outlet } from "react-router-dom";
import Header from "../Header";
import MobileNav from "../common/MobileNav";
import Footer from "../common/Footer";
import "./CustomerLayout.css";

export default function CustomerLayout() {
  return <div className="customer-shell"><Header /><div className="customer-content"><Outlet /></div><Footer /><MobileNav /></div>;
}
