import React from "react";
import { useRouter } from "next/router";
import Header from "./Header";
import Footer from "./Footer";

const MainLayout = ({ children }) => {
  const router = useRouter();

  // Don't show header/footer on auth pages
  const isAuthPage = ["/login", "/register"].includes(router.pathname);

  if (isAuthPage) {
    return (
      <div
        style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}
      >
        {children}
      </div>
    );
  }

  return (
    <div
      style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}
    >
      <Header />
      <main style={{ flex: 1, padding: "2rem" }}>{children}</main>
      <Footer />
    </div>
  );
};

export default MainLayout;
