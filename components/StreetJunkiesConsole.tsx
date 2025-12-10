
"use client";

import React, { useState } from "react";

// If your project doesn't use shadcn/ui or lucide-react yet,
// either install them or replace these components/icons with your own.
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Menu,
  Bell,
  Search,
  User,
  Settings,
  Plus,
  ChevronRight,
  BarChart2,
  Compass,
  MapPin,
  Activity,
  QrCode,
  LogOut,
  DollarSign,
  Package,
  FileText,
  Camera,
} from "lucide-react";

// Firebase Imports
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, User as FirebaseUser } from "firebase/auth";
import { doc, getDoc, collection, onSnapshot, addDoc, query, orderBy, deleteDoc, updateDoc, increment, serverTimestamp } from "firebase/firestore";
import { Moon, Sun } from "lucide-react";

type Role = "admin" | "manager" | "sales";
type Route =
  | "login"
  | "admin"
  | "admin/brands"
  | "admin/inventory"
  | "admin/sales"
  | "admin/invoices";

// Top-level app component – this is your console shell.
// Hook this into your router + Firebase auth and simply
// set `role` + `route` from real data.
const StreetJunkiesConsole: React.FC = () => {
  // Real State
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [route, setRoute] = useState<Route>("login");
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  const toggleTheme = () => setTheme(prev => prev === "dark" ? "light" : "dark");

  // Auth Listener
  React.useEffect(() => {
    // Auth Listener
    if (!auth) return;
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // Fetch role from Firestore: users/{uid} -> { role: 'admin' }
        try {
          const userDoc = await getDoc(doc(db, "users", currentUser.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data() as { role: Role };
            setRole(userData.role || "sales");
            // Default route based on role if currently on login
            setRoute((prev) => (prev === "login" ? (userData.role === "sales" ? "admin/sales" : "admin") : prev));
          } else {
            // Fallback if no user doc exists (e.g. first run)
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
  }, [route]);

  const handleLogin = async (email: string, pass: string) => {
    if (!auth) { alert("Firebase not initialized"); return; }
    try {
      await signInWithEmailAndPassword(auth, email, pass);
      // Auth listener handles the rest
    } catch (err: any) {
      alert("Login failed: " + err.message);
    }
  };

  // Safety check for Firebase Configuration
  if (!auth || !db) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white flex-col gap-4 p-4 text-center">
        <h1 className="text-xl font-bold text-red-500">Configuration Error</h1>
        <p className="text-sm text-slate-400">
          Firebase is not initialized. Please ensure your Vercel Environment Variables are set correctly.
        </p>
        <div className="text-xs text-slate-600 bg-slate-900 p-4 rounded-xl text-left font-mono">
          NEXT_PUBLIC_FIREBASE_API_KEY=...<br />
          ...and other firebase config keys.
        </div>
      </div>
    );
  }

  const handleLogout = async () => {
    await signOut(auth);
    setRole(null);
    setRoute("login");
  };

  if (loading) {
    return <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground text-xs">Loading Console...</div>;
  }

  if (!user || !role) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  const isAdmin = role === "admin";
  const isManager = role === "manager";

  return (
    <div className={`${theme} min-h-screen bg-background text-foreground flex flex-col transition-colors duration-300`}>
      <TopNav role={role} onLogout={handleLogout} theme={theme} onToggleTheme={toggleTheme} />

      <div className="flex-1 flex w-full max-w-6xl mx-auto gap-4 px-3 pb-6 pt-20 md:pt-24">
        {/* Sidebar (hidden on small screens) */}
        <aside className="hidden md:flex w-64 flex-col gap-3 pr-2 border-r border-border">
          <BrandBlock />
          <NavSection role={role} route={route} onNavigate={setRoute} />
          <SecondaryNav role={role} route={route} onNavigate={setRoute} />
        </aside>

        {/* Main content – switches based on route */}
        <main className="flex-1 flex flex-col gap-4">
          {route === "admin" && <AdminDashboardView />}
          {route === "admin/brands" && <BrandsView canEdit={true} />}
          {route === "admin/inventory" && (
            <InventoryView canEdit={true} />
          )}
          {route === "admin/sales" && <SalesPanel />}
          {route === "admin/invoices" && <InvoicesView />}
        </main>
      </div>

      {/* Mobile bottom nav */}
      <MobileNav role={role} route={route} onNavigate={setRoute} />
    </div>
  );
};

// =========================
// Auth / Login Screen
// =========================

interface LoginScreenProps {
  onLogin: (email: string, pass: string) => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    await onLogin(email, pass);
    setIsSubmitting(false);
  };

  return (
    <div className="dark min-h-screen bg-background flex items-center justify-center px-4">
      <Card className="w-full max-w-md border border-border bg-card rounded-3xl p-6 space-y-6 shadow-xl shadow-emerald-500/10">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-2xl bg-gradient-to-tr from-emerald-400 via-cyan-400 to-violet-500 flex items-center justify-center shadow-lg shadow-emerald-500/30">
            <span className="text-xs font-bold tracking-tight text-white">SJ</span>
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-semibold tracking-tight text-foreground">Street Junkies Console</span>
            <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              AntiGravity Ops
            </span>
          </div>
        </div>

        <div className="space-y-1">
          <h1 className="text-base font-semibold tracking-tight text-foreground">Log in to continue</h1>
          <p className="text-xs text-muted-foreground">
            Use your console credentials. Roles are resolved from Firestore.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="space-y-2">
            <label className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
              Email
            </label>
            <Input
              type="email"
              placeholder="you@streetjunkies.io"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-secondary/50 border-input text-foreground placeholder:text-muted-foreground/50 text-xs rounded-2xl"
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
              Password
            </label>
            <Input
              type="password"
              placeholder="••••••••"
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              className="bg-secondary/50 border-input text-foreground placeholder:text-muted-foreground/50 text-xs rounded-2xl"
              required
            />
          </div>

          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold tracking-wide"
          >
            {isSubmitting ? "Logging in..." : "Access Console"}
          </Button>
        </form>

        <div className="flex items-center justify-between pt-2 text-[11px] text-muted-foreground">
          <span>Protected console · QR-driven sales</span>
          <span className="text-muted-foreground/70">v1.0</span>
        </div>
      </Card>
    </div>
  );
};

// =========================
// Shell Elements
// =========================

interface TopNavProps {
  role: Role;
  onLogout: () => void;
  theme: "dark" | "light";
  onToggleTheme: () => void;
}

const TopNav: React.FC<TopNavProps> = ({ role, onLogout, theme, onToggleTheme }) => (
  <header className="fixed top-0 inset-x-0 z-30 border-b border-border bg-background/80 backdrop-blur-xl transition-colors duration-300">
    <div className="max-w-6xl mx-auto flex items-center gap-3 px-3 py-2 md:py-3">
      {/* Left side */}
      <div className="flex items-center gap-2 flex-1 md:flex-none">
        <button className="md:hidden inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border">
          <Menu className="w-4 h-4 text-foreground" />
        </button>
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-2xl bg-gradient-to-tr from-emerald-400 to-cyan-400 flex items-center justify-center shadow-lg shadow-emerald-500/30">
            <span className="text-xs font-bold tracking-tight text-white">SJ</span>
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-semibold tracking-tight text-foreground">Street Junkies</span>
            <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              AntiGravity Console
            </span>
          </div>
        </div>
      </div>

      {/* Center search */}
      <div className="hidden md:flex flex-1 items-center justify-center">
        <div className="w-full max-w-md relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search brands, inventory, sales..."
            className="pl-8 bg-secondary/50 border-border text-xs placeholder:text-muted-foreground text-foreground rounded-2xl"
          />
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-1 md:gap-2">
        <Badge className="hidden sm:inline-flex bg-primary/10 text-primary border-primary/20 text-[10px] uppercase tracking-[0.16em]">
          {role} role
        </Badge>
        <button onClick={onToggleTheme} className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-border bg-card text-foreground hover:bg-secondary">
          {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
        <button className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-border bg-card text-foreground hover:bg-secondary">
          <Bell className="w-4 h-4" />
        </button>
        <button
          onClick={onLogout}
          className="inline-flex items-center justify-center rounded-xl border border-border bg-card px-1.5 py-1.5 gap-2 text-[11px] text-muted-foreground hover:border-destructive/60 hover:text-destructive"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Log out</span>
        </button>
      </div>
    </div>
  </header>
);

const BrandBlock: React.FC = () => (
  <div className="flex flex-col gap-1 pt-1">
    <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-[0.2em]">
      Overview
    </div>
    <p className="text-xs text-muted-foreground">
      From QR scan to invoice: manage brands, inventory, and sales in one console.
    </p>
  </div>
);

interface NavSectionProps {
  role: Role;
  route: Route;
  onNavigate: (route: Route) => void;
}

const NavSection: React.FC<NavSectionProps> = ({ route, onNavigate }) => {
  return (
    <nav className="flex flex-col gap-1 pt-2">
      <SidebarItem
        icon={<Compass className="w-3.5 h-3.5" />}
        label="Dashboard"
        active={route === "admin"}
        onClick={() => onNavigate("admin")}
      />
      <SidebarItem
        icon={<Package className="w-3.5 h-3.5" />}
        label="Inventory"
        active={route === "admin/inventory"}
        onClick={() => onNavigate("admin/inventory")}
      />
      <SidebarItem
        icon={<BarChart2 className="w-3.5 h-3.5" />}
        label="Analytics"
        active={route === "admin"}
      />
      <SidebarItem
        icon={<DollarSign className="w-3.5 h-3.5" />}
        label="Sales panel"
        active={route === "admin/sales"}
        onClick={() => onNavigate("admin/sales")}
        pill="Core loop"
      />
    </nav>
  );
};

interface SecondaryNavProps {
  role: Role;
  route: Route;
  onNavigate: (route: Route) => void;
}

const SecondaryNav: React.FC<SecondaryNavProps> = ({ route, onNavigate }) => {
  return (
    <nav className="mt-4 flex flex-col gap-1 border-t border-border pt-3">
      <SidebarItem
        icon={<Activity className="w-3.5 h-3.5" />}
        label="Brands"
        active={route === "admin/brands"}
        onClick={() => onNavigate("admin/brands")}
      />
      <SidebarItem icon={<User className="w-3.5 h-3.5" />} label="My profile" />
      <SidebarItem
        icon={<FileText className="w-3.5 h-3.5" />}
        label="Invoices"
        active={route === "admin/invoices"}
        onClick={() => onNavigate("admin/invoices")}
      />
      <SidebarItem icon={<Settings className="w-3.5 h-3.5" />} label="Setup" />
    </nav>
  );
};

interface SidebarItemProps {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  pill?: string;
  onClick?: () => void;
}

const SidebarItem: React.FC<SidebarItemProps> = ({ icon, label, active, pill, onClick }) => (
  <button
    onClick={onClick}
    className={`flex items-center justify-between gap-2 rounded-xl px-2 py-1.5 text-xs transition-colors ${active
      ? "bg-foreground text-background"
      : "text-muted-foreground hover:bg-muted hover:text-foreground"
      }`}
  >
    <span className="inline-flex items-center gap-2">
      <span className={`inline-flex items-center justify-center rounded-lg h-6 w-6 ${active ? "bg-background/20" : "bg-muted"}`}>
        {icon}
      </span>
      {label}
    </span>
    {pill && (
      <Badge className="bg-primary/10 text-primary border-primary/40 text-[10px]">
        {pill}
      </Badge>
    )}
  </button>
);

// =========================
// /admin – Admin Dashboard & Analytics
// =========================

const AdminDashboardView: React.FC = () => {
  const [sales, setSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    // Listen to all sales (limit 50 for performance in this demo)
    const q = query(collection(db, "sales"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setSales(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Compute Metrics
  const totalRevenue = sales.reduce((acc, curr) => acc + (curr.amount || 0), 0);
  const totalComm = sales.reduce((acc, curr) => acc + (curr.commission || 0), 0);
  const totalPayout = sales.reduce((acc, curr) => acc + (curr.payoutAmount || 0), 0);

  return (
    <>
      <HeroStrip />

      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard
          label="Total revenue"
          value={`₹${(totalRevenue).toLocaleString()}`}
          delta="Realtime"
          deltaLabel="Life-time volume"
          pins="Live across all stores"
        />
        <MetricCard
          label="Commission earned"
          value={`₹${(totalComm).toLocaleString()}`}
          delta={`${((totalComm / (totalRevenue || 1)) * 100).toFixed(1)}%`}
          deltaLabel="Avg. take rate"
          pins="Dynamic per brand"
        />
        <MetricCard
          label="Pending payouts"
          value={`₹${(totalPayout).toLocaleString()}`}
          delta={`${sales.length} orders`}
          deltaLabel="awaiting settlement"
          pins="Synced with invoices"
        />
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 flex flex-col gap-3">
          <RecentSales sales={sales.slice(0, 5)} loading={loading} />
          <BrandPerformance sales={sales} />
        </div>
        <div className="flex flex-col gap-3">
          <FlowSummary />
        </div>
      </section>
    </>
  );
};

const HeroStrip: React.FC = () => {
  const handleExport = () => {
    const csvContent = "data:text/csv;charset=utf-8,Date,Revenue,Commission\n" + new Date().toISOString() + ",1000,200";
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "monthly_report.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Card className="border border-border bg-card px-3 py-3 md:px-4 md:py-3.5 rounded-2xl">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-emerald-400 via-cyan-400 to-violet-500 flex items-center justify-center shadow-lg shadow-emerald-500/30">
            <Compass className="w-5 h-5 text-white" />
          </div>
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <h1 className="text-sm md:text-base font-semibold tracking-tight text-foreground">
                Street Junkies control center
              </h1>
              <Badge className="hidden sm:inline-flex bg-primary/10 text-primary border-primary/20 text-[10px] uppercase tracking-[0.16em]">
                Production
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground max-w-xl">
              Track QR-powered sales, commissions, and brand performance in real time across all partner stores.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="border-border bg-card text-xs hover:bg-accent"
          >
            View brand statements
          </Button>
          <Button
            size="sm"
            onClick={handleExport}
            className="bg-primary text-primary-foreground hover:bg-primary/90 text-xs"
          >
            Export monthly report
          </Button>
        </div>
      </div>
    </Card>
  );
};

interface MetricCardProps {
  label: string;
  value: string;
  delta: string;
  deltaLabel: string;
  pins: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ label, value, delta, deltaLabel, pins }) => (
  <Card className="border border-border bg-card rounded-2xl px-3 py-3 flex flex-col gap-2">
    <div className="flex items-center justify-between gap-2">
      <span className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">{label}</span>
      <span className="inline-flex items-center gap-1 text-[11px] text-primary">
        <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-primary/10 text-[10px]">
          +
        </span>
        {delta}
      </span>
    </div>
    <div className="flex items-baseline gap-1">
      <span className="text-xl font-semibold tracking-tight text-foreground">{value}</span>
      <span className="text-[11px] text-muted-foreground">{deltaLabel}</span>
    </div>
    <p className="mt-1 text-[11px] text-muted-foreground flex items-center gap-1">
      <MapPin className="w-3 h-3" />
      {pins}
    </p>
  </Card>
);

interface RecentSalesProps {
  sales: any[];
  loading: boolean;
}

const RecentSales: React.FC<RecentSalesProps> = ({ sales, loading }) => (
  <Card className="border border-border bg-card rounded-2xl px-3 py-3 flex flex-col gap-3">
    <div className="flex items-center justify-between">
      <div className="flex flex-col gap-0.5">
        <span className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
          Recent sales
        </span>
        <span className="text-xs text-muted-foreground">Latest QR-verified transactions</span>
      </div>
      <Button variant="outline" size="icon" className="h-7 w-7 border-border hover:bg-accent">
        <ChevronRight className="w-3 h-3" />
      </Button>
    </div>

    <div className="flex flex-col gap-2 text-xs">
      {loading && <div className="text-muted-foreground">Loading sales...</div>}
      {!loading && sales.length === 0 && <div className="text-muted-foreground">No sales recorded yet.</div>}

      {sales.map((sale) => (
        <div
          key={sale.id}
          className="flex items-center justify-between rounded-xl bg-secondary/50 px-3 py-2"
        >
          <div className="flex flex-col">
            <span className="font-medium tracking-tight text-foreground">{sale.brand}</span>
            <span className="text-[11px] text-muted-foreground">
              {sale.item} · {sale.customer?.name || "Guest"}
            </span>
          </div>
          <span className="text-[11px] text-primary bg-primary/10 border border-primary/20 rounded-full px-2 py-0.5">
            ₹{sale.amount}
          </span>
        </div>
      ))}
    </div>
  </Card>
);

interface BrandPerformanceProps {
  sales: any[];
}

const BrandPerformance: React.FC<BrandPerformanceProps> = ({ sales }) => {
  // Aggregate sales by brand
  const brandStats: Record<string, number> = {};
  sales.forEach(s => {
    brandStats[s.brand] = (brandStats[s.brand] || 0) + (s.payoutAmount || 0);
  });

  // Sort by payout
  const sortedBrands = Object.entries(brandStats)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3); // Top 3

  // Max value for bar chart
  const maxVal = sortedBrands.length > 0 ? sortedBrands[0][1] : 1;

  return (
    <Card className="border border-border bg-card rounded-2xl px-3 py-3 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-0.5">
          <span className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Brand performance</span>
          <span className="text-xs text-muted-foreground">Top partners by payout</span>
        </div>
      </div>
      <div className="flex flex-col gap-2 text-xs">
        {sortedBrands.length === 0 && <div className="text-muted-foreground">No data available.</div>}
        {sortedBrands.map(([brand, payout], index) => (
          <div key={brand} className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <span className="text-foreground">{brand}</span>
              <span className="text-[11px] text-muted-foreground">
                ₹{payout.toLocaleString()} payout
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-cyan-400 to-violet-500"
                style={{ width: `${(payout / maxVal) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};


const FlowSummary: React.FC = () => (
  <Card className="border border-border bg-card rounded-2xl px-3 py-3 flex flex-col gap-3">
    <span className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Data flow</span>
    <div className="flex flex-col gap-2 text-[11px] text-muted-foreground">
      {[
        "User (role from Firestore)",
        "→ Brand (commission & partner type)",
        "→ Inventory item (QR token)",
        "→ Scan on Sales panel",
        "→ Sale (revenue, commission, payout)",
        "→ Dashboard & Invoices",
      ].map((step, index) => (
        <div
          key={step}
          className="flex items-center gap-2 rounded-xl bg-secondary/50 px-2 py-1.5"
        >
          <span className="h-5 w-5 rounded-full bg-secondary flex items-center justify-center text-[10px] text-muted-foreground">
            {index + 1}
          </span>
          <span>{step}</span>
        </div>
      ))}
    </div>
  </Card>
);

// =========================
// /admin/brands – Brand onboarding & management
// =========================

interface BrandsViewProps {
  canEdit: boolean;
}

const BrandsView: React.FC<BrandsViewProps> = ({ canEdit }) => {
  const [brands, setBrands] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newType, setNewType] = useState("Non-exclusive");
  const [newComm, setNewComm] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  // Listen to Brands
  React.useEffect(() => {
    const q = query(collection(db, "brands"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const b = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setBrands(b);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleAddBrand = async () => {
    if (!newName || !newComm) return;
    setIsAdding(true);
    try {
      await addDoc(collection(db, "brands"), {
        name: newName,
        email: newEmail,
        type: newType,
        commission: newComm,
        createdAt: new Date(),
      });
      // Simulate Onboarding Email
      if (newEmail) {
        window.open(`mailto:${newEmail}?subject=Welcome to Street Junkies&body=Hi ${newName}, you are onboarded!`, '_blank');
      }
      // Reset form
      setNewName("");
      setNewEmail("");
      setNewComm("");
    } catch (e) {
      console.error(e);
      alert("Error adding brand");
    }
    setIsAdding(false);
  };

  const handleDeleteBrand = async (id: string) => {
    if (!confirm("Are you sure?")) return;
    await deleteDoc(doc(db, "brands", id));
  };

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-0.5">
          <span className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Brands</span>
          <span className="text-xs text-muted-foreground">
            Onboard partners and configure commission logic
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Brand list */}
        <Card className="lg:col-span-2 border border-border bg-card rounded-2xl px-3 py-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Active partners</span>
            <span className="text-[11px] text-muted-foreground">{brands.length} brands</span>
          </div>
          <div className="flex flex-col gap-2 text-xs">
            {loading && <div className="text-muted-foreground">Loading brands...</div>}
            {!loading && brands.length === 0 && <div className="text-muted-foreground">No brands yet. Add one!</div>}

            {brands.map((brand) => (
              <div
                key={brand.id}
                className="flex items-center justify-between rounded-xl bg-secondary/50 px-3 py-2"
              >
                <div className="flex flex-col">
                  <span className="font-medium tracking-tight text-foreground">{brand.name}</span>
                  <span className="text-[11px] text-muted-foreground">{brand.type} partner</span>
                  <span className="text-[11px] text-muted-foreground">
                    Commission: {brand.commission}%
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 px-2 text-[11px] border-destructive/60 text-destructive hover:bg-destructive/10"
                    onClick={() => handleDeleteBrand(brand.id)}
                    disabled={!canEdit}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Brand form */}
        <Card className="border border-border bg-card rounded-2xl px-3 py-3 text-xs">
          <span className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">New brand</span>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Add a partner to the <code>brands</code> collection.
          </p>
          <div className="mt-3 space-y-2">
            <Input
              placeholder="Brand name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="bg-secondary/50 border-input text-foreground placeholder:text-muted-foreground text-xs rounded-2xl"
            />
            <Input
              placeholder="Contact email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              className="bg-secondary/50 border-input text-foreground placeholder:text-muted-foreground text-xs rounded-2xl"
            />
            <div className="grid grid-cols-2 gap-2">
              <Input
                placeholder="Type (Exclusive)"
                value={newType}
                onChange={(e) => setNewType(e.target.value)}
                className="bg-secondary/50 border-input text-foreground placeholder:text-muted-foreground text-xs rounded-2xl"
              />
              <Input
                placeholder="Comm % (25)"
                value={newComm}
                onChange={(e) => setNewComm(e.target.value)}
                className="bg-secondary/50 border-input text-foreground placeholder:text-muted-foreground text-xs rounded-2xl"
              />
            </div>
            <Button
              disabled={!canEdit || isAdding}
              onClick={handleAddBrand}
              size="sm"
              className="w-full mt-2 bg-primary text-primary-foreground hover:bg-primary/90 text-xs disabled:opacity-50"
            >
              {isAdding ? "Saving..." : "Save brand"}
            </Button>
          </div>
        </Card>
      </div>
    </section>
  );
};

// =========================
// /admin/inventory – Inventory & QR generation
// =========================

interface InventoryViewProps {
  canEdit: boolean;
}

const InventoryView: React.FC<InventoryViewProps> = ({ canEdit }) => {
  const [items, setItems] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form
  const [name, setName] = useState("");
  const [brandId, setBrandId] = useState(""); // ID of selected brand
  const [size, setSize] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("0"); // Number as string

  React.useEffect(() => {
    // Inventory
    const qInv = query(collection(db, "inventory"), orderBy("createdAt", "desc"));
    const unsubInv = onSnapshot(qInv, (snapshot) => {
      setItems(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });

    // Brands (for dropdown)
    const qBrands = query(collection(db, "brands"), orderBy("name"));
    const unsubBrands = onSnapshot(qBrands, (snap) => {
      setBrands(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => { unsubInv(); unsubBrands(); };
  }, []);

  const handleAddItem = async () => {
    if (!name || !price || !brandId) return;
    const selectedBrand = brands.find(b => b.id === brandId);
    try {
      await addDoc(collection(db, "inventory"), {
        name,
        brand: selectedBrand?.name || "Unknown",
        brandId: selectedBrand?.id,
        brandEmail: selectedBrand?.email || "",
        brandComm: selectedBrand?.commission || 20, // Cache comm
        size,
        price: parseFloat(price),
        stock: parseInt(stock) || 0,
        createdAt: new Date(),
        qrToken: crypto.randomUUID(),
      });
      setName(""); setBrandId(""); setSize(""); setPrice(""); setStock("0");
    } catch (e) {
      console.error(e);
      alert("Error adding item");
    }
  };

  const [selectedQR, setSelectedQR] = useState<string | null>(null);

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-0.5">
          <span className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Inventory</span>
          <span className="text-xs text-muted-foreground">
            Add items, generate QR tokens, and sync stock
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Inventory list */}
        <Card className="lg:col-span-2 border border-border bg-card rounded-2xl px-3 py-3 text-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Items</span>
            <span className="text-[11px] text-muted-foreground">{items.length} SKUs</span>
          </div>

          <div className="space-y-2 mb-4 p-3 bg-secondary/30 rounded-xl border border-dashed border-border">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              <Input placeholder="Item Name" value={name} onChange={e => setName(e.target.value)} className="bg-secondary/50 border-input md:col-span-2 h-8" />
              <select
                value={brandId}
                onChange={e => setBrandId(e.target.value)}
                className="bg-secondary/50 border border-input rounded-md px-2 text-foreground h-8 text-[11px]"
              >
                <option value="">Select Brand</option>
                {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
              <Input placeholder="Size" value={size} onChange={e => setSize(e.target.value)} className="bg-secondary/50 border-input h-8" />
              <Input placeholder="Price" value={price} onChange={e => setPrice(e.target.value)} type="number" className="bg-secondary/50 border-input h-8" />
              <Input placeholder="Stock" value={stock} onChange={e => setStock(e.target.value)} type="number" className="bg-secondary/50 border-input h-8" />
            </div>
            <Button size="sm" onClick={handleAddItem} disabled={!canEdit} className="w-full bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20">
              + Add New SKU
            </Button>
          </div>

          <div className="space-y-1.5 h-64 overflow-y-auto pr-1">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between rounded-xl bg-secondary/50 px-3 py-2 border border-transparent hover:border-border transition-colors"
              >
                <div className="flex flex-col">
                  <span className="font-medium tracking-tight text-foreground">{item.name}</span>
                  <span className="text-[11px] text-muted-foreground">
                    {item.brand} · {item.size}
                  </span>
                  <span className="text-[11px] text-muted-foreground">Stock: {item.stock}</span>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="text-[11px] text-foreground">₹{item.price}</span>
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-7 w-7 border-border hover:bg-accent"
                    onClick={() => setSelectedQR(item.id)}
                  >
                    <QrCode className="w-3 h-3 text-foreground" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* QR preview panel */}
        <Card className="border border-border bg-card rounded-2xl px-3 py-3 text-xs flex flex-col gap-3 items-stretch">
          <span className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
            QR token preview
          </span>
          {selectedQR ? (
            <>
              <div className="mt-1 flex flex-1 items-center justify-center">
                <div className="h-32 w-32 bg-white p-2 rounded-xl flex items-center justify-center">
                  {/* Placeholder for actual QR code gen */}
                  <QrCode className="w-24 h-24 text-black" />
                </div>
              </div>
              <div className="text-center space-y-1">
                <p className="font-mono text-[10px] text-primary bg-primary/10 py-1 rounded">ID: {selectedQR}</p>
                <p className="text-[10px] text-muted-foreground">Print this code for the product tag.</p>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground italic">
              Select an item to view QR
            </div>
          )}
        </Card>
      </div>
    </section>
  );
};

// =========================
// /admin/sales – Sales panel (core loop)
// =========================

const SalesPanel: React.FC = () => {
  const [confirmed, setConfirmed] = useState(false);
  const [lastSaleItem, setLastSaleItem] = useState<any>(null);

  // Inventory & Selection
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [selectedItemId, setSelectedItemId] = useState("");
  const selectedItem = inventoryItems.find(i => i.id === selectedItemId);

  React.useEffect(() => {
    const q = query(collection(db, "inventory"));
    const unsub = onSnapshot(q, snap => {
      setInventoryItems(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  // Checkout State
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerAddr, setCustomerAddr] = useState("");
  const [qty, setQty] = useState("1");

  const handleConfirmSale = async () => {
    if (!selectedItem) { alert("Select an item first"); return; }
    try {
      const q = parseInt(qty) || 1;
      // Real Item Data
      const commissionRate = (selectedItem.brandComm || 20) / 100;
      const total = (selectedItem.price || 0) * q;
      const comm = total * commissionRate;
      const payout = total - comm;

      await addDoc(collection(db, "sales"), {
        item: selectedItem.name,
        itemId: selectedItem.id,
        brand: selectedItem.brand,
        customer: {
          name: customerName,
          phone: customerPhone,
          address: customerAddr
        },
        quantity: q,
        amount: total,
        commission: comm,
        payoutAmount: payout,
        createdAt: new Date(),
        status: "confirmed"
      });

      // Deduct Stock
      await updateDoc(doc(db, "inventory", selectedItem.id), {
        stock: increment(-q)
      });

      setLastSaleItem({ ...selectedItem, total, customerName });
      setConfirmed(true);

      // Reset
      setCustomerName(""); setCustomerPhone(""); setSelectedItemId("");
      setTimeout(() => setConfirmed(false), 5000);
    } catch (e) {
      console.error(e);
      alert("Failed to record sale");
    }
  };

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-0.5">
          <span className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
            Sales panel
          </span>
          <span className="text-xs text-muted-foreground">
            Scan QR → pull inventory → capture customer → confirm sale
          </span>
        </div>
        <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px] uppercase tracking-[0.16em]">
          Mobile first
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Scan / camera area */}
        <Card className="lg:col-span-2 border border-border bg-card rounded-2xl px-3 py-3 flex flex-col gap-3">
          <span className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
            1 · Scan product tag
          </span>
          <div className="mt-1 flex flex-col md:flex-row gap-3">
            <div className="flex-1 flex flex-col items-center justify-center rounded-2xl bg-secondary/50 border border-dashed border-border px-4 py-6 text-xs text-muted-foreground">
              <Camera className="w-8 h-8 mb-2 text-muted-foreground/70" />
              <span>Simulate Scan: Select from Inventory</span>
              <select
                className="mt-2 w-full max-w-xs bg-card border border-input rounded p-2 text-foreground"
                value={selectedItemId}
                onChange={e => setSelectedItemId(e.target.value)}
              >
                <option value="">-- Scan / Select Item --</option>
                {inventoryItems.map(i => (
                  <option key={i.id} value={i.id}>{i.name} ({i.stock} in stock)</option>
                ))}
              </select>
            </div>

            {/* Item Preview */}
            <div className="w-full md:w-56 flex flex-col gap-2 text-xs">
              {selectedItem ? (
                <div className="rounded-2xl bg-secondary/80 border border-primary/30 px-3 py-2">
                  <span className="text-[11px] uppercase tracking-[0.16em] text-primary">
                    Item Scanned
                  </span>
                  <div className="mt-1 flex flex-col gap-0.5">
                    <span className="text-xs font-medium tracking-tight text-foreground">{selectedItem.name}</span>
                    <span className="text-[11px] text-muted-foreground">
                      {selectedItem.brand}
                    </span>
                    <div className="flex items-center justify-between gap-2 mt-1">
                      <span className="text-[11px] text-muted-foreground">Price</span>
                      <span className="text-foreground font-mono">₹{selectedItem.price}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-full rounded-2xl bg-secondary/30 border border-border px-3 py-2 flex items-center justify-center text-muted-foreground italic">
                  No item selected
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Customer + totals */}
        <Card className="border border-border bg-card rounded-2xl px-3 py-3 text-xs flex flex-col gap-3">
          <span className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
            2 · Customer & checkout
          </span>
          <div className="space-y-2">
            <Input
              placeholder="Customer name"
              className="bg-secondary/50 border-input text-xs rounded-2xl"
              value={customerName}
              onChange={e => setCustomerName(e.target.value)}
            />
            <Input
              placeholder="Phone number"
              className="bg-secondary/50 border-input text-xs rounded-2xl"
              value={customerPhone}
              onChange={e => setCustomerPhone(e.target.value)}
            />
            <Input
              placeholder="Address (optional)"
              className="bg-secondary/50 border-input text-xs rounded-2xl"
              value={customerAddr}
              onChange={e => setCustomerAddr(e.target.value)}
            />
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground whitespace-nowrap">Qty:</span>
              <Input
                placeholder="1"
                type="number"
                min="1"
                className="bg-secondary/50 border-input text-xs rounded-2xl"
                value={qty}
                onChange={e => setQty(e.target.value)}
              />
            </div>
          </div>

          {selectedItem && (
            <div className="mt-2 space-y-1 text-[11px] text-foreground">
              <div className="flex items-center justify-between">
                <span>Base amount</span>
                <span>₹{(selectedItem.price || 0) * (parseInt(qty) || 1)}</span>
              </div>
              <div className="flex items-center justify-between font-medium text-primary">
                <span>Payout to brand</span>
                <span>₹{((selectedItem.price || 0) * (parseInt(qty) || 1) * (1 - (selectedItem.brandComm || 20) / 100)).toFixed(0)}</span>
              </div>
            </div>
          )}

          <Button
            className="mt-2 w-full bg-primary text-primary-foreground hover:bg-primary/90 text-xs"
            onClick={handleConfirmSale}
            disabled={!selectedItem}
          >
            Confirm sale
          </Button>
        </Card>
      </div>

      {confirmed && (
        <Card className="mt-2 border border-primary/40 bg-primary/5 rounded-2xl px-3 py-3 text-xs flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-[0.16em] text-primary">
              Success
            </span>
            <Button size="sm" variant="outline" className="h-6 text-[10px]" onClick={() => {
              if (lastSaleItem?.brandEmail) {
                window.open(`mailto:${lastSaleItem.brandEmail}?subject=Sale Alert: ${lastSaleItem.name}&body=New sale recorded for ${lastSaleItem.name}. Total: ${lastSaleItem.total}. Customer: ${lastSaleItem.customerName}`, '_blank')
              } else {
                alert("No email on file for this brand.");
              }
            }}>
              Send Mail to Brand
            </Button>
          </div>
          <p className="text-[11px] text-foreground">
            Sale saved successfully! Stock updated.
          </p>
        </Card>
      )}
    </section>
  );
};

// =========================
// /admin/invoices – Mock invoices & reconciliation
// =========================

const InvoicesView: React.FC = () => {
  const [sales, setSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    const q = query(collection(db, "sales"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, snap => {
      setSales(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // Aggregate by Brand
  const brandStatements = React.useMemo(() => {
    const stats: Record<string, { count: number, payout: number, email: string }> = {};
    sales.forEach(s => {
      if (!stats[s.brand]) {
        stats[s.brand] = { count: 0, payout: 0, email: s.brandEmail || "" };
        // Note: sales might not have brandEmail if it wasn't saved. 
        // In a real app we'd join with 'brands' collection. For now we use what we have.
      }
      stats[s.brand].count += 1;
      stats[s.brand].payout += (s.payoutAmount || 0);
    });
    return Object.entries(stats).map(([brand, data]) => ({ brand, ...data }));
  }, [sales]);

  const handleDownloadCSV = (brandName: string, amount: number) => {
    const csv = "Date,Item,Amount,Payout\n" + sales
      .filter(s => s.brand === brandName)
      .map(s => `${new Date(s.createdAt?.seconds * 1000).toLocaleDateString()}, ${s.item}, ${s.amount}, ${s.payoutAmount}`)
      .join("\n");

    const encodedUri = encodeURI("data:text/csv;charset=utf-8," + csv);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Statement_${brandName}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex flex-col gap-0.5">
          <span className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Invoices</span>
          <span className="text-xs text-muted-foreground">
            Review payouts and send brand statements
          </span>
        </div>
        <div className="flex items-center gap-2 text-[11px]">
          <Button variant="outline" size="sm" className="h-8 text-xs">Filter Month</Button>
        </div>
      </div>

      <Card className="border border-border bg-card rounded-2xl px-3 py-3 text-xs flex flex-col gap-3">
        <span className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Generated Statements</span>
        <div className="space-y-2">
          {loading && <div className="text-muted-foreground">Loading sales...</div>}
          {!loading && brandStatements.length === 0 && <div className="text-muted-foreground">No sales recorded yet.</div>}

          {brandStatements.map((stat) => (
            <div
              key={stat.brand}
              className="flex items-center justify-between rounded-xl bg-secondary/50 px-3 py-2"
            >
              <div className="flex flex-col">
                <span className="font-medium tracking-tight text-foreground">{stat.brand}</span>
                <span className="text-[11px] text-muted-foreground">{stat.count} orders</span>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className="text-[11px] text-foreground font-semibold">₹{stat.payout.toLocaleString()}</span>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 px-2 text-[11px] border-border hover:bg-accent"
                    onClick={() => handleDownloadCSV(stat.brand, stat.payout)}
                  >
                    Download CSV
                  </Button>
                  <Button
                    size="sm"
                    className="h-7 px-2 text-[11px] bg-primary text-primary-foreground hover:bg-primary/90"
                    onClick={() => {
                      window.open(`mailto:?subject=Payout Statement for ${stat.brand}&body=High ${stat.brand}, your total payout is ₹${stat.payout}. Please find attached CSV.`, '_blank');
                    }}
                  >
                    Mail Brand
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </section>
  );
};

// =========================
// Mobile nav
// =========================

interface MobileNavProps {
  role: Role;
  route: Route;
  onNavigate: (route: Route) => void;
}

const MobileNav: React.FC<MobileNavProps> = ({ role, route, onNavigate }) => {
  if (!role || route === "login") return null;

  return (
    <nav className="fixed bottom-0 inset-x-0 z-30 border-t border-border bg-background/90 backdrop-blur-xl md:hidden">
      <div className="flex items-center justify-around px-4 py-2 text-[10px]">
        <MobileNavItem
          label="Dashboard"
          icon={<Compass className="w-4 h-4" />}
          active={route === "admin"}
          onClick={() => onNavigate("admin")}
        />
        <MobileNavItem
          label="Inventory"
          icon={<Package className="w-4 h-4" />}
          active={route === "admin/inventory"}
          onClick={() => onNavigate("admin/inventory")}
        />
        <button
          onClick={() => onNavigate("admin/sales")}
          className="inline-flex items-center justify-center h-9 w-9 rounded-2xl bg-gradient-to-tr from-emerald-400 via-cyan-400 to-violet-500 text-white shadow-lg shadow-primary/30 -translate-y-2"
        >
          <DollarSign className="w-4 h-4" />
        </button>
        <MobileNavItem
          label="Brands"
          icon={<Activity className="w-4 h-4" />}
          active={route === "admin/brands"}
          onClick={() => onNavigate("admin/brands")}
        />
        <MobileNavItem
          label="Invoices"
          icon={<FileText className="w-4 h-4" />}
          active={route === "admin/invoices"}
          onClick={() => onNavigate("admin/invoices")}
        />
      </div>
    </nav>
  );
};

interface MobileNavItemProps {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick?: () => void;
}

const MobileNavItem: React.FC<MobileNavItemProps> = ({ icon, label, active, onClick }) => (
  <button
    onClick={onClick}
    className={`flex flex-col items-center gap-0.5 ${active ? "text-primary" : "text-muted-foreground"
      }`}
  >
    {icon}
    <span>{label}</span>
  </button>
);

export default StreetJunkiesConsole;
