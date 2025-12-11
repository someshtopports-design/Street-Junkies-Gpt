"use client";

import React, { useState, useEffect } from "react";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, User as FirebaseUser } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

// Layout Components
import { ConsoleHeader } from "./console/ConsoleHeader";
import { ConsoleSidebar, Role, Route } from "./console/ConsoleSidebar";
import { MobileNav } from "./console/MobileNav";
import { LoginScreen } from "./console/LoginScreen";

// View Components
import { DashboardView } from "./console/DashboardView";
import { SalesPanel } from "./console/SalesPanel";
import { BrandsView } from "./console/BrandsView";
import { InventoryView } from "./console/InventoryView";
import { InvoicesView } from "./console/InvoicesView";

const StreetJunkiesConsole: React.FC = () => {
  // --- State ---
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [route, setRoute] = useState<Route>("login");
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // --- Auth & Init ---
  useEffect(() => {
    if (!auth) return;
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const userDoc = await getDoc(doc(db, "users", currentUser.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data() as { role: Role };
            setRole(userData.role || "sales");
            // Redirect logic
            setRoute((prev) => (prev === "login" ? (userData.role === "sales" ? "admin/sales" : "admin") : prev));
          } else {
            console.log("No user profile found, defaulting to sales");
            setRole("sales");
            setRoute("admin/sales");
          }
        } catch (error) {
          console.error("Error fetching user role:", error);
        }
      } else {
        setRole(null);
        setRoute("login");
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // --- Handlers ---
  const handleLogin = async (email: string, pass: string) => {
    if (!auth) { alert("Firebase not initialized"); return; }
    try {
      await signInWithEmailAndPassword(auth, email, pass);
    } catch (err: any) {
      alert("Login failed: " + err.message);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setRole(null);
    setRoute("login");
  };

  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    document.documentElement.classList.remove("dark", "light");
    document.documentElement.classList.add(newTheme);
  };

  // --- Initial Render Checks ---
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
          <p className="text-sm text-muted-foreground animate-pulse">Initializing Console...</p>
        </div>
      </div>
    );
  }

  if (!user || !role) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return (
    <div className={`min-h-screen bg-background text-foreground flex flex-col font-sans selection:bg-primary/20`}>
      {/* Header */}
      <ConsoleHeader
        role={role}
        onLogout={handleLogout}
        theme={theme}
        onToggleTheme={toggleTheme}
        onMenuClick={() => setSidebarOpen(!sidebarOpen)}
      />

      <div className="flex flex-1 overflow-hidden relative">
        {/* Desktop Sidebar */}
        <div className={`hidden md:block w-72 border-r border-border/50 bg-background/50 backdrop-blur-xl shrink-0 transition-all duration-300 ${sidebarOpen ? "ml-0" : "-ml-72"}`}>
          <div className="sticky top-0 h-[calc(100vh-64px)] overflow-y-auto">
            <ConsoleSidebar role={role} route={route} onNavigate={setRoute} className="h-full" />
          </div>
        </div>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto w-full p-4 md:p-8 pb-24 md:pb-8 relative scroll-smooth">
          <div className="max-w-7xl mx-auto w-full">
            {route === "admin" && <DashboardView />}
            {route === "admin/brands" && <BrandsView />}
            {route === "admin/inventory" && <InventoryView />}
            {route === "admin/sales" && <SalesPanel />}
            {route === "admin/invoices" && <InvoicesView />}
          </div>
        </main>
      </div>

      {/* Mobile Nav */}
      <MobileNav role={role} route={route} onNavigate={setRoute} />
    </div>
  );
};

export default StreetJunkiesConsole;
