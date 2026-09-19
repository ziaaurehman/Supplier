import React from "react";

export default function ExternalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div style={{ width: "100%", minHeight: "100vh", backgroundColor: "var(--body-bg)" }}>
      {/* Simple header for external suppliers */}
      <header style={{ 
        backgroundColor: "var(--card-bg)", 
        padding: "20px 40px", 
        borderBottom: "1px solid var(--border-color)",
        textAlign: "center" 
      }}>
        <div style={{ fontSize: "24px", fontWeight: "700", color: "var(--text-dark)" }}>
          Supplier<span style={{ color: "var(--primary-color)" }}>RFQ</span>
        </div>
      </header>
      
      <main style={{ padding: "40px", maxWidth: "800px", margin: "0 auto" }}>
        {children}
      </main>
    </div>
  );
}
