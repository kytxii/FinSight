import { createContext, useContext, useState } from "react";
import { initDemo, clearDemo } from "../api/demoStore";

const AuthContext = createContext(null);

const DEMO_USER = {
  first_name: "Demo",
  last_name: "User",
  email_address: "demo@finsight.app",
};

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem("token"));
  const [user, setUser] = useState(() => {
    if (localStorage.getItem("demo") === "true") return DEMO_USER;
    const stored = localStorage.getItem("user");
    return stored ? JSON.parse(stored) : null;
  });

  const login = (newToken, userData) => {
    localStorage.setItem("token", newToken);
    localStorage.setItem("user", JSON.stringify(userData));
    setToken(newToken);
    setUser(userData);
  };

  const logout = () => {
    clearDemo();
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setToken(null);
    setUser(null);
  };

  const enterDemoMode = () => {
    clearDemo();
    localStorage.setItem("demo", "true");
    initDemo();
    setToken("demo");
    setUser(DEMO_USER);
  };

  const isDemo = () => localStorage.getItem("demo") === "true";

  return (
    <AuthContext.Provider value={{ token, user, setUser, login, logout, enterDemoMode, isDemo }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
