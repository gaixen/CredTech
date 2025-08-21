import React, { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useRouter } from "next/router";
import Link from "next/link";

const RegisterPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      return setError("Passwords do not match");
    }
    if (password.length < 6) {
      return setError("Password must be at least 6 characters long");
    }

    setError("");
    setLoading(true);

    try {
      await register(email, password, name);
      router.push("/");
    } catch (err) {
      setError(err.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const containerStyle = {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background:
      "linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 50%, #1a1a1a 100%)",
    padding: "20px",
  };

  const cardStyle = {
    backgroundColor: "var(--secondary-color)",
    padding: "3rem",
    borderRadius: "16px",
    border: "1px solid var(--border-color)",
    boxShadow:
      "0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.3)",
    width: "100%",
    maxWidth: "400px",
    backdropFilter: "blur(10px)",
    position: "relative",
    overflow: "hidden",
  };

  const glowEffect = {
    position: "absolute",
    top: "-50%",
    left: "-50%",
    width: "200%",
    height: "200%",
    background:
      "radial-gradient(circle, rgba(10, 218, 97, 0.05) 0%, transparent 70%)",
    pointerEvents: "none",
    zIndex: 0,
  };

  const contentStyle = {
    position: "relative",
    zIndex: 1,
  };

  const titleStyle = {
    fontSize: "2.5rem",
    fontWeight: "700",
    color: "var(--text-color)",
    textAlign: "center",
    marginBottom: "0.5rem",
    background: "linear-gradient(135deg, var(--primary-color), #00ff7f)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    backgroundClip: "text",
  };

  const subtitleStyle = {
    color: "var(--text-color)",
    textAlign: "center",
    marginBottom: "2rem",
    opacity: 0.8,
    fontSize: "1rem",
  };

  const formStyle = {
    display: "flex",
    flexDirection: "column",
    gap: "1.5rem",
  };

  const inputGroupStyle = {
    position: "relative",
  };

  const inputStyle = {
    width: "100%",
    padding: "1rem 1.25rem",
    fontSize: "1rem",
    backgroundColor: "var(--background-color)",
    border: "2px solid var(--border-color)",
    borderRadius: "8px",
    color: "var(--text-color)",
    transition: "all 0.3s ease",
    outline: "none",
  };

  const buttonStyle = {
    width: "100%",
    padding: "1rem",
    fontSize: "1.1rem",
    fontWeight: "600",
    backgroundColor: "var(--primary-color)",
    color: "white",
    border: "none",
    borderRadius: "8px",
    cursor: loading ? "not-allowed" : "pointer",
    transition: "all 0.3s ease",
    position: "relative",
    overflow: "hidden",
    opacity: loading ? 0.7 : 1,
  };

  const errorStyle = {
    color: "#ff4444",
    backgroundColor: "rgba(255, 68, 68, 0.1)",
    padding: "0.75rem",
    borderRadius: "8px",
    border: "1px solid rgba(255, 68, 68, 0.3)",
    fontSize: "0.9rem",
    textAlign: "center",
  };

  const linkStyle = {
    textAlign: "center",
    marginTop: "1.5rem",
  };

  const linkTextStyle = {
    color: "var(--text-color)",
    opacity: 0.8,
  };

  const linkHoverStyle = {
    color: "var(--primary-color)",
    textDecoration: "none",
    fontWeight: "500",
  };

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <div style={glowEffect}></div>
        <div style={contentStyle}>
          <h1 style={titleStyle}>Join CredTech</h1>
          <p style={subtitleStyle}>
            Create your account and start analyzing credit risk
          </p>

          <form onSubmit={handleSubmit} style={formStyle}>
            <div style={inputGroupStyle}>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Full name"
                required
                style={inputStyle}
                onFocus={(e) => {
                  e.target.style.borderColor = "var(--primary-color)";
                  e.target.style.boxShadow = "0 0 0 3px rgba(10, 218, 97, 0.1)";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "var(--border-color)";
                  e.target.style.boxShadow = "none";
                }}
              />
            </div>

            <div style={inputGroupStyle}>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address"
                required
                style={inputStyle}
                onFocus={(e) => {
                  e.target.style.borderColor = "var(--primary-color)";
                  e.target.style.boxShadow = "0 0 0 3px rgba(10, 218, 97, 0.1)";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "var(--border-color)";
                  e.target.style.boxShadow = "none";
                }}
              />
            </div>

            <div style={inputGroupStyle}>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                required
                style={inputStyle}
                onFocus={(e) => {
                  e.target.style.borderColor = "var(--primary-color)";
                  e.target.style.boxShadow = "0 0 0 3px rgba(10, 218, 97, 0.1)";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "var(--border-color)";
                  e.target.style.boxShadow = "none";
                }}
              />
            </div>

            <div style={inputGroupStyle}>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm password"
                required
                style={inputStyle}
                onFocus={(e) => {
                  e.target.style.borderColor = "var(--primary-color)";
                  e.target.style.boxShadow = "0 0 0 3px rgba(10, 218, 97, 0.1)";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "var(--border-color)";
                  e.target.style.boxShadow = "none";
                }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={buttonStyle}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.target.style.backgroundColor = "#0bc954";
                  e.target.style.transform = "translateY(-1px)";
                  e.target.style.boxShadow =
                    "0 10px 20px rgba(10, 218, 97, 0.3)";
                }
              }}
              onMouseLeave={(e) => {
                if (!loading) {
                  e.target.style.backgroundColor = "var(--primary-color)";
                  e.target.style.transform = "translateY(0)";
                  e.target.style.boxShadow = "none";
                }
              }}
            >
              {loading ? (
                <span
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "0.5rem",
                  }}
                >
                  <span
                    style={{
                      width: "20px",
                      height: "20px",
                      border: "2px solid transparent",
                      borderTop: "2px solid white",
                      borderRadius: "50%",
                      animation: "spin 1s linear infinite",
                    }}
                  ></span>
                  Creating account...
                </span>
              ) : (
                "Create Account"
              )}
            </button>

            {error && <div style={errorStyle}>{error}</div>}
          </form>

          <div style={linkStyle}>
            <span style={linkTextStyle}>Already have an account? </span>
            <Link href="/login" style={linkHoverStyle}>
              Sign in here
            </Link>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes spin {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
};

export default RegisterPage;
