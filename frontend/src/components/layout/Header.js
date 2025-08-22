import React from "react";
import Link from "next/link";
import { useAuth } from "../../contexts/AuthContext";
import NotificationBell from "../NotificationBell";

const Header = () => {
  const { currentUser, logout } = useAuth();

  return (
    <header
      style={{
        padding: "1rem 2rem",
        backgroundColor: "var(--secondary-color)",
        borderBottom: "1px solid var(--border-color)",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <Link href="/">
        <h2 style={{ margin: 0, color: "var(--primary-color)" }}>
          Credit Intelligence
        </h2>
      </Link>
      <nav style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
        <Link href="/" style={{ color: "var(--text-color)" }}>
          Dashboard
        </Link>
        <Link href="/analytics" style={{ color: "var(--text-color)" }}>
          Analytics
        </Link>
        <Link href="/portfolio" style={{ color: "var(--text-color)" }}>
          Portfolio
        </Link>
        <Link href="/company-search" style={{ color: "var(--text-color)" }}>
          Company Search
        </Link>
        <Link href="/news" style={{ color: "var(--text-color)" }}>
          News
        </Link>
        <Link href="/sentiment" style={{ color: "var(--text-color)" }}>
          sentiment
        </Link>
        <Link href="/watchlists" style={{ color: "var(--text-color)" }}>
          Watchlists
        </Link>
        <Link href="/bookmarks" style={{ color: "var(--text-color)" }}>
          Bookmarks
        </Link>
        <Link href="/alerts" style={{ color: "var(--text-color)" }}>
          Alerts
        </Link>
        {currentUser ? (
          <>
            <NotificationBell />
            <button onClick={logout}>Logout</button>
          </>
        ) : (
          <>
            <Link href="/login">Login</Link>
            <Link href="/register">Register</Link>
          </>
        )}
      </nav>
    </header>
  );
};

export default Header;
