import { useState } from "react";
import PageLayout from "../components/PageLayout";
import NavBar from "../components/NavBar";


export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = (e) => {
    e.preventDefault();
    console.log("Login with:", { username, password });
    // 🔑 Later: integrate with backend /api/login
  };

  return (
    <div className="p-6 flex justify-center">
      <form
        onSubmit={handleLogin}
        className="bg-white shadow-md p-6 rounded-xl w-96"
      >
        <h2 className="text-xl font-bold mb-4 text-center">Login</h2>
        <input
          type="text"
          placeholder="Username"
          className="w-full border p-2 rounded mb-3"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <input
          type="password"
          placeholder="Password"
          className="w-full border p-2 rounded mb-3"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button
          type="submit"
          className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700"
        >
          Login
        </button>
      </form>
    </div>
  );
}
