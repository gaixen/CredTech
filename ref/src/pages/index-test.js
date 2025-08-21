import React from "react";
import Link from "next/link";

export default function Dashboard() {
  return (
    <div style={{ padding: "2rem", minHeight: "100vh", background: "#f8fafc" }}>
      <h1 style={{ color: "#1e293b", marginBottom: "1rem" }}>
        CredTech Dashboard
      </h1>
      <p style={{ color: "#64748b", marginBottom: "2rem" }}>
        Welcome to the Credit Risk Management System
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "1rem",
          marginBottom: "2rem",
        }}
      >
        <div
          style={{
            background: "white",
            padding: "1rem",
            borderRadius: "8px",
            border: "1px solid #e2e8f0",
            boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
          }}
        >
          <h3 style={{ margin: "0 0 0.5rem 0", color: "#1e293b" }}>
            Portfolio Value
          </h3>
          <p
            style={{
              fontSize: "1.5rem",
              fontWeight: "bold",
              margin: 0,
              color: "#3b82f6",
            }}
          >
            $12.5M
          </p>
        </div>

        <div
          style={{
            background: "white",
            padding: "1rem",
            borderRadius: "8px",
            border: "1px solid #e2e8f0",
            boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
          }}
        >
          <h3 style={{ margin: "0 0 0.5rem 0", color: "#1e293b" }}>
            Risk Score
          </h3>
          <p
            style={{
              fontSize: "1.5rem",
              fontWeight: "bold",
              margin: 0,
              color: "#f59e0b",
            }}
          >
            7.2
          </p>
        </div>

        <div
          style={{
            background: "white",
            padding: "1rem",
            borderRadius: "8px",
            border: "1px solid #e2e8f0",
            boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
          }}
        >
          <h3 style={{ margin: "0 0 0.5rem 0", color: "#1e293b" }}>
            Active Positions
          </h3>
          <p
            style={{
              fontSize: "1.5rem",
              fontWeight: "bold",
              margin: 0,
              color: "#10b981",
            }}
          >
            23
          </p>
        </div>
      </div>

      <div style={{ marginTop: "2rem" }}>
        <Link
          href="/analytics"
          style={{
            marginRight: "1rem",
            padding: "0.75rem 1.5rem",
            background: "#3b82f6",
            color: "white",
            textDecoration: "none",
            borderRadius: "6px",
            display: "inline-block",
          }}
        >
          Analytics
        </Link>
        <Link
          href="/portfolio"
          style={{
            marginRight: "1rem",
            padding: "0.75rem 1.5rem",
            background: "#3b82f6",
            color: "white",
            textDecoration: "none",
            borderRadius: "6px",
            display: "inline-block",
          }}
        >
          Portfolio
        </Link>
        <Link
          href="/company-search"
          style={{
            padding: "0.75rem 1.5rem",
            background: "#3b82f6",
            color: "white",
            textDecoration: "none",
            borderRadius: "6px",
            display: "inline-block",
          }}
        >
          Company Search
        </Link>
      </div>
    </div>
  );
}
