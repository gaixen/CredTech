import React, { useState } from "react";
import Link from "next/link";

const BookmarkCard = ({ bookmark, onRemove }) => {
  const cardStyle = {
    backgroundColor: "var(--secondary-color)",
    padding: "1.5rem",
    borderRadius: "12px",
    border: "1px solid var(--border-color)",
    transition: "all 0.3s ease",
  };

  const headerStyle = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "1rem",
  };

  const titleStyle = {
    fontSize: "1.1rem",
    fontWeight: "600",
    color: "var(--text-color)",
    margin: 0,
    marginBottom: "0.5rem",
  };

  const sourceStyle = {
    color: "var(--primary-color)",
    fontSize: "0.9rem",
    fontWeight: "500",
  };

  const deleteButtonStyle = {
    background: "none",
    border: "none",
    color: "#ff4444",
    cursor: "pointer",
    fontSize: "1.2rem",
    padding: "0.25rem",
  };

  const contentStyle = {
    color: "var(--text-color)",
    opacity: 0.8,
    fontSize: "0.9rem",
    lineHeight: "1.5",
    marginBottom: "1rem",
  };

  const metaStyle = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: "1rem",
    borderTop: "1px solid var(--border-color)",
    fontSize: "0.8rem",
    color: "var(--text-color)",
    opacity: 0.7,
  };

  const tagStyle = {
    padding: "0.25rem 0.75rem",
    backgroundColor: "var(--primary-color)",
    color: "var(--background-color)",
    borderRadius: "12px",
    fontSize: "0.75rem",
    fontWeight: "500",
  };

  return (
    <div
      style={cardStyle}
      onMouseEnter={(e) => {
        e.target.style.transform = "translateY(-2px)";
        e.target.style.boxShadow = "0 8px 25px rgba(0, 0, 0, 0.3)";
        e.target.style.borderColor = "var(--primary-color)";
      }}
      onMouseLeave={(e) => {
        e.target.style.transform = "translateY(0)";
        e.target.style.boxShadow = "none";
        e.target.style.borderColor = "var(--border-color)";
      }}
    >
      <div style={headerStyle}>
        <div>
          <h3 style={titleStyle}>{bookmark.title}</h3>
          <div style={sourceStyle}>{bookmark.source}</div>
        </div>
        <button style={deleteButtonStyle} onClick={() => onRemove(bookmark.id)}>
          🗑️
        </button>
      </div>

      <div style={contentStyle}>{bookmark.summary}</div>

      <div style={metaStyle}>
        <div>
          <span style={tagStyle}>{bookmark.category}</span>
        </div>
        <div>Saved {bookmark.savedDate}</div>
      </div>
    </div>
  );
};

const CategoryFilter = ({ categories, activeCategory, onCategoryChange }) => {
  const filterStyle = {
    display: "flex",
    gap: "1rem",
    marginBottom: "2rem",
    flexWrap: "wrap",
  };

  const categoryButtonStyle = (isActive) => ({
    padding: "0.75rem 1.5rem",
    backgroundColor: isActive
      ? "var(--primary-color)"
      : "var(--secondary-color)",
    color: isActive ? "var(--background-color)" : "var(--text-color)",
    border: "1px solid var(--border-color)",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "0.9rem",
    fontWeight: "500",
    transition: "all 0.3s ease",
  });

  return (
    <div style={filterStyle}>
      {categories.map((category) => (
        <button
          key={category}
          style={categoryButtonStyle(activeCategory === category)}
          onClick={() => onCategoryChange(category)}
          onMouseEnter={(e) => {
            if (activeCategory !== category) {
              e.target.style.backgroundColor = "var(--border-color)";
            }
          }}
          onMouseLeave={(e) => {
            if (activeCategory !== category) {
              e.target.style.backgroundColor = "var(--secondary-color)";
            }
          }}
        >
          {category}
        </button>
      ))}
    </div>
  );
};

const Bookmarks = () => {
  const [activeCategory, setActiveCategory] = useState("All");
  const [bookmarks, setBookmarks] = useState([
    {
      id: 1,
      title: "Fed Signals Potential Rate Cuts Amid Banking Sector Stress",
      source: "Financial Times",
      summary:
        "Federal Reserve officials hint at possible interest rate reductions following increased stress in regional banking sector, particularly affecting credit default swap markets.",
      category: "Central Banking",
      savedDate: "2 days ago",
      url: "https://example.com/article1",
    },
    {
      id: 2,
      title: "Credit Default Swaps Show Rising Corporate Default Risk",
      source: "Bloomberg",
      summary:
        "Analysis of CDS spreads indicates growing concern about corporate defaults in retail and energy sectors, with particular focus on high-yield debt markets.",
      category: "Credit Risk",
      savedDate: "3 days ago",
      url: "https://example.com/article2",
    },
    {
      id: 3,
      title: "ESG Factors Increasingly Impact Credit Ratings",
      source: "Reuters",
      summary:
        "Major rating agencies report that environmental, social, and governance factors are playing larger roles in credit assessments and default probability calculations.",
      category: "ESG",
      savedDate: "1 week ago",
      url: "https://example.com/article3",
    },
    {
      id: 4,
      title: "AI Revolution in Credit Risk Assessment",
      source: "Wall Street Journal",
      summary:
        "Financial institutions are increasingly adopting artificial intelligence and machine learning models to improve credit risk prediction and CDS pricing accuracy.",
      category: "Technology",
      savedDate: "1 week ago",
      url: "https://example.com/article4",
    },
    {
      id: 5,
      title: "Regulatory Changes Affect Derivative Markets",
      source: "Risk.net",
      summary:
        "New Basel III requirements and CFTC regulations are reshaping how financial institutions approach credit derivative trading and risk management.",
      category: "Regulation",
      savedDate: "2 weeks ago",
      url: "https://example.com/article5",
    },
  ]);

  const categories = [
    "All",
    "Credit Risk",
    "Central Banking",
    "Technology",
    "Regulation",
    "ESG",
  ];

  const filteredBookmarks =
    activeCategory === "All"
      ? bookmarks
      : bookmarks.filter((bookmark) => bookmark.category === activeCategory);

  const handleRemoveBookmark = (id) => {
    setBookmarks(bookmarks.filter((b) => b.id !== id));
  };

  const containerStyle = {
    maxWidth: "1200px",
    margin: "0 auto",
  };

  const headerStyle = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "2rem",
    flexWrap: "wrap",
    gap: "1rem",
  };

  const titleSectionStyle = {
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
  };

  const mainTitleStyle = {
    fontSize: "2.5rem",
    fontWeight: "700",
    color: "var(--text-color)",
    margin: 0,
  };

  const subtitleStyle = {
    color: "var(--text-color)",
    opacity: 0.8,
    fontSize: "1rem",
  };

  const backLinkStyle = {
    color: "var(--primary-color)",
    textDecoration: "none",
    fontSize: "1rem",
  };

  const statsStyle = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: "1rem",
    marginBottom: "2rem",
  };

  const statCardStyle = {
    backgroundColor: "var(--secondary-color)",
    padding: "1.5rem",
    borderRadius: "12px",
    border: "1px solid var(--border-color)",
    textAlign: "center",
  };

  const statNumberStyle = {
    fontSize: "2rem",
    fontWeight: "700",
    color: "var(--primary-color)",
    marginBottom: "0.5rem",
  };

  const statLabelStyle = {
    color: "var(--text-color)",
    opacity: 0.8,
    fontSize: "0.9rem",
  };

  const bookmarksGridStyle = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(350px, 1fr))",
    gap: "1.5rem",
  };

  const emptyStateStyle = {
    textAlign: "center",
    padding: "3rem",
    color: "var(--text-color)",
    opacity: 0.7,
  };

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <div style={titleSectionStyle}>
          <h1 style={mainTitleStyle}>Bookmarks</h1>
          <p style={subtitleStyle}>Your saved articles and research</p>
        </div>
        <Link href="/" style={backLinkStyle}>
          ← Back to Dashboard
        </Link>
      </div>

      <div style={statsStyle}>
        <div style={statCardStyle}>
          <div style={statNumberStyle}>{bookmarks.length}</div>
          <div style={statLabelStyle}>Total Bookmarks</div>
        </div>
        <div style={statCardStyle}>
          <div style={statNumberStyle}>{categories.length - 1}</div>
          <div style={statLabelStyle}>Categories</div>
        </div>
        <div style={statCardStyle}>
          <div style={statNumberStyle}>
            {bookmarks.filter((b) => b.savedDate.includes("day")).length}
          </div>
          <div style={statLabelStyle}>This Week</div>
        </div>
      </div>

      <CategoryFilter
        categories={categories}
        activeCategory={activeCategory}
        onCategoryChange={setActiveCategory}
      />

      {filteredBookmarks.length === 0 ? (
        <div style={emptyStateStyle}>
          <h3>No bookmarks found</h3>
          <p>No articles saved in the "{activeCategory}" category yet.</p>
        </div>
      ) : (
        <div style={bookmarksGridStyle}>
          {filteredBookmarks.map((bookmark) => (
            <BookmarkCard
              key={bookmark.id}
              bookmark={bookmark}
              onRemove={handleRemoveBookmark}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default Bookmarks;
