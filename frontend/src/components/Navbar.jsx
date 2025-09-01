// src/components/NavBar.jsx
import { NavLink } from "react-router-dom";

export default function NavBar() {
  return (
    <nav
      style={{
        position: "absolute",
        top: "20px",
        right: "30px",
        display: "flex",
        gap: "20px", // space between buttons
      }}
    >
      <NavLink
        to="/"
        style={({ isActive }) => ({
          textDecoration: "none",
          fontWeight: "bold",
          padding: "6px 12px",
          borderRadius: "6px",
          color: isActive ? "white" : "#666",
          backgroundColor: isActive ? "#007bff" : "transparent",
        })}
      >
        Home
      </NavLink>

      <NavLink
        to="/pricing"
        style={({ isActive }) => ({
          textDecoration: "none",
          fontWeight: "bold",
          padding: "6px 12px",
          borderRadius: "6px",
          color: isActive ? "white" : "#666",
          backgroundColor: isActive ? "#007bff" : "transparent",
        })}
      >
        Pricing
      </NavLink>

      <NavLink
        to="/login"
        style={({ isActive }) => ({
          textDecoration: "none",
          fontWeight: "bold",
          padding: "6px 12px",
          borderRadius: "6px",
          color: isActive ? "white" : "#666",
          backgroundColor: isActive ? "#007bff" : "transparent",
        })}
      >
        Login
      </NavLink>
    </nav>
  );
}
