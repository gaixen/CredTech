import React from "react";
import { useRouter } from "next/router";
import Link from "next/link";

export default function MainLayoutSimple({ children }) {
  const router = useRouter();

  const isAuthPage = ["/login", "/register"].includes(router.pathname);

  if (isAuthPage) {
    return children;
  }

  return (
    <div className="app-layout">
      <nav className="main-nav">
        <div className="nav-brand">
          <h2>CredTech</h2>
        </div>

        <div className="nav-links">
          <Link
            href="/"
            className={`nav-link ${router.pathname === "/" ? "active" : ""}`}
          >
            Dashboard
          </Link>
          <Link
            href="/analytics"
            className={`nav-link ${
              router.pathname === "/analytics" ? "active" : ""
            }`}
          >
            Analytics
          </Link>
          <Link
            href="/portfolio"
            className={`nav-link ${
              router.pathname === "/portfolio" ? "active" : ""
            }`}
          >
            Portfolio
          </Link>
          <Link
            href="/company-search"
            className={`nav-link ${
              router.pathname === "/company-search" ? "active" : ""
            }`}
          >
            Company Search
          </Link>
        </div>

        <div className="nav-actions">
          <Link href="/alerts" className="icon-btn">
            Alerts
          </Link>
          <div className="user-menu">
            <span>User</span>
            <button className="logout-btn">Logout</button>
          </div>
        </div>
      </nav>

      <main className="main-content">{children}</main>
    </div>
  );
}
