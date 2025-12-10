
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
import { doc, getDoc, collection, onSnapshot, addDoc, query, orderBy, deleteDoc, setDoc } from "firebase/firestore";

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

  // Auth Listener
  React.useEffect(() => {
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
    try {
      await signInWithEmailAndPassword(auth, email, pass);
      // Auth listener handles the rest
    } catch (err: any) {
      alert("Login failed: " + err.message);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setRole(null);
    setRoute("login");
  };

  if (loading) {
    return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-500 text-xs">Loading Console...</div>;
  }

  if (!user || !role) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  const isAdmin = role === "admin";
  const isManager = role === "manager";

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex flex-col">
      <TopNav role={role} onLogout={handleLogout} />

      <div className="flex-1 flex w-full max-w-6xl mx-auto gap-4 px-3 pb-6 pt-20 md:pt-24">
        {/* Sidebar (hidden on small screens) */}
        <aside className="hidden md:flex w-64 flex-col gap-3 pr-2 border-r border-slate-800/60">
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
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
      <Card className="w-full max-w-md border border-slate-800/80 bg-slate-900/80 rounded-3xl p-6 space-y-6 shadow-xl shadow-emerald-500/10">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-2xl bg-gradient-to-tr from-emerald-400 via-cyan-400 to-violet-500 flex items-center justify-center shadow-lg shadow-emerald-500/30">
            <span className="text-xs font-bold tracking-tight text-slate-950">SJ</span>
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-semibold tracking-tight">Street Junkies Console</span>
            <span className="text-[10px] uppercase tracking-[0.18em] text-slate-400">
              AntiGravity Ops
            </span>
          </div>
        </div>

        <div className="space-y-1">
          <h1 className="text-base font-semibold tracking-tight">Log in to continue</h1>
          <p className="text-xs text-slate-400">
            Use your console credentials. Roles are resolved from Firestore.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="space-y-2">
            <label className="text-[11px] uppercase tracking-[0.16em] text-slate-400">
              Email
            </label>
            <Input
              type="email"
              placeholder="you@streetjunkies.io"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-slate-950/60 border-slate-800/80 text-xs rounded-2xl"
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-[11px] uppercase tracking-[0.16em] text-slate-400">
              Password
            </label>
            <Input
              type="password"
              placeholder="••••••••"
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              className="bg-slate-950/60 border-slate-800/80 text-xs rounded-2xl"
              required
            />
          </div>

          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-emerald-500 text-slate-950 hover:bg-emerald-400 text-xs font-semibold tracking-wide"
          >
            {isSubmitting ? "Logging in..." : "Access Console"}
          </Button>
        </form>

        <div className="flex items-center justify-between pt-2 text-[11px] text-slate-500">
          <span>Protected console · QR-driven sales</span>
          <span className="text-slate-400">v1.0</span>
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
}

const TopNav: React.FC<TopNavProps> = ({ role, onLogout }) => (
  <header className="fixed top-0 inset-x-0 z-30 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl">
    <div className="max-w-6xl mx-auto flex items-center gap-3 px-3 py-2 md:py-3">
      {/* Left side */}
      <div className="flex items-center gap-2 flex-1 md:flex-none">
        <button className="md:hidden inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-800/80">
          <Menu className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-2xl bg-gradient-to-tr from-emerald-400 to-cyan-400 flex items-center justify-center shadow-lg shadow-emerald-500/30">
            <span className="text-xs font-bold tracking-tight text-slate-950">SJ</span>
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-semibold tracking-tight">Street Junkies</span>
            <span className="text-[10px] uppercase tracking-[0.18em] text-slate-400">
              AntiGravity Console
            </span>
          </div>
        </div>
      </div>

      {/* Center search */}
      <div className="hidden md:flex flex-1 items-center justify-center">
        <div className="w-full max-w-md relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <Input
            placeholder="Search brands, inventory, sales..."
            className="pl-8 bg-slate-900/60 border-slate-800/80 text-xs placeholder:text-slate-500 rounded-2xl"
          />
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-1 md:gap-2">
        <Badge className="hidden sm:inline-flex bg-emerald-500/10 text-emerald-300 border-emerald-500/40 text-[10px] uppercase tracking-[0.16em]">
          {role} role
        </Badge>
        <button className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-slate-800/80 bg-slate-900/80">
          <Bell className="w-4 h-4" />
        </button>
        <button className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-slate-800/80 bg-slate-900/80">
          <Settings className="w-4 h-4" />
        </button>
        <button
          onClick={onLogout}
          className="inline-flex items-center justify-center rounded-xl border border-slate-800/80 bg-slate-900/80 px-1.5 py-1.5 gap-2 text-[11px] text-slate-300 hover:border-rose-500/60 hover:text-rose-300"
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
    <div className="text-[11px] font-medium text-slate-400 uppercase tracking-[0.2em]">
      Overview
    </div>
    <p className="text-xs text-slate-400">
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
    <nav className="mt-4 flex flex-col gap-1 border-t border-slate-800/80 pt-3">
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
      ? "bg-slate-900 text-slate-50"
      : "text-slate-400 hover:bg-slate-900/60 hover:text-slate-50"
      }`}
  >
    <span className="inline-flex items-center gap-2">
      <span className="inline-flex items-center justify-center rounded-lg bg-slate-900/80 h-6 w-6">
        {icon}
      </span>
      {label}
    </span>
    {pill && (
      <Badge className="bg-emerald-500/10 text-emerald-300 border-emerald-500/40 text-[10px]">
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

const HeroStrip: React.FC = () => (
  <Card className="border border-slate-800/80 bg-slate-900/70 px-3 py-3 md:px-4 md:py-3.5 rounded-2xl">
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-emerald-400 via-cyan-400 to-violet-500 flex items-center justify-center shadow-lg shadow-emerald-500/30">
          <Compass className="w-5 h-5 text-slate-950" />
        </div>
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <h1 className="text-sm md:text-base font-semibold tracking-tight">
              Street Junkies control center
            </h1>
            <Badge className="hidden sm:inline-flex bg-emerald-500/10 text-emerald-300 border-emerald-500/40 text-[10px] uppercase tracking-[0.16em]">
              Production
            </Badge>
          </div>
          <p className="text-xs text-slate-400 max-w-xl">
            Track QR-powered sales, commissions, and brand performance in real time across all partner stores.
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          className="border-slate-700 bg-slate-900/60 text-xs"
        >
          View brand statements
        </Button>
        <Button
          size="sm"
          className="bg-emerald-500 text-slate-950 hover:bg-emerald-400 text-xs"
        >
          Export monthly report
        </Button>
      </div>
    </div>
  </Card>
);

interface MetricCardProps {
  label: string;
  value: string;
  delta: string;
  deltaLabel: string;
  pins: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ label, value, delta, deltaLabel, pins }) => (
  <Card className="border border-slate-800/80 bg-slate-900/60 rounded-2xl px-3 py-3 flex flex-col gap-2">
    <div className="flex items-center justify-between gap-2">
      <span className="text-[11px] uppercase tracking-[0.14em] text-slate-400">{label}</span>
      <span className="inline-flex items-center gap-1 text-[11px] text-emerald-300">
        <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500/10 text-[10px]">
          +
        </span>
        {delta}
      </span>
    </div>
    <div className="flex items-baseline gap-1">
      <span className="text-xl font-semibold tracking-tight">{value}</span>
      <span className="text-[11px] text-slate-400">{deltaLabel}</span>
    </div>
    <p className="mt-1 text-[11px] text-slate-500 flex items-center gap-1">
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
  <Card className="border border-slate-800/80 bg-slate-900/60 rounded-2xl px-3 py-3 flex flex-col gap-3">
    <div className="flex items-center justify-between">
      <div className="flex flex-col gap-0.5">
        <span className="text-[11px] uppercase tracking-[0.16em] text-slate-400">
          Recent sales
        </span>
        <span className="text-xs text-slate-400">Latest QR-verified transactions</span>
      </div>
      <Button variant="outline" size="icon" className="h-7 w-7 border-slate-700">
        <ChevronRight className="w-3 h-3" />
      </Button>
    </div>

    <div className="flex flex-col gap-2 text-xs">
      {loading && <div className="text-slate-500">Loading sales...</div>}
      {!loading && sales.length === 0 && <div className="text-slate-500">No sales recorded yet.</div>}

      {sales.map((sale) => (
        <div
          key={sale.id}
          className="flex items-center justify-between rounded-xl bg-slate-950/40 px-3 py-2"
        >
          <div className="flex flex-col">
            <span className="font-medium tracking-tight">{sale.brand}</span>
            <span className="text-[11px] text-slate-500">
              {sale.item} · {sale.customer?.name || "Guest"}
            </span>
          </div>
          <span className="text-[11px] text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 rounded-full px-2 py-0.5">
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
    <Card className="border border-slate-800/80 bg-slate-900/60 rounded-2xl px-3 py-3 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-0.5">
          <span className="text-[11px] uppercase tracking-[0.16em] text-slate-400">Brand performance</span>
          <span className="text-xs text-slate-400">Top partners by payout</span>
        </div>
      </div>
      <div className="flex flex-col gap-2 text-xs">
        {sortedBrands.length === 0 && <div className="text-slate-500">No data available.</div>}
        {sortedBrands.map(([brand, payout], index) => (
          <div key={brand} className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <span className="text-slate-200">{brand}</span>
              <span className="text-[11px] text-slate-400">
                ₹{payout.toLocaleString()} payout
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-slate-900 overflow-hidden">
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
  <Card className="border border-slate-800/80 bg-slate-900/60 rounded-2xl px-3 py-3 flex flex-col gap-3">
    <span className="text-[11px] uppercase tracking-[0.16em] text-slate-400">Data flow</span>
    <div className="flex flex-col gap-2 text-[11px] text-slate-300">
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
          className="flex items-center gap-2 rounded-xl bg-slate-950/50 px-2 py-1.5"
        >
          <span className="h-5 w-5 rounded-full bg-slate-900 flex items-center justify-center text-[10px] text-slate-400">
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
          <span className="text-[11px] uppercase tracking-[0.16em] text-slate-400">Brands</span>
          <span className="text-xs text-slate-400">
            Onboard partners and configure commission logic
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Brand list */}
        <Card className="lg:col-span-2 border border-slate-800/80 bg-slate-900/60 rounded-2xl px-3 py-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] uppercase tracking-[0.16em] text-slate-400">Active partners</span>
            <span className="text-[11px] text-slate-500">{brands.length} brands</span>
          </div>
          <div className="flex flex-col gap-2 text-xs">
            {loading && <div className="text-slate-500">Loading brands...</div>}
            {!loading && brands.length === 0 && <div className="text-slate-500">No brands yet. Add one!</div>}

            {brands.map((brand) => (
              <div
                key={brand.id}
                className="flex items-center justify-between rounded-xl bg-slate-950/40 px-3 py-2"
              >
                <div className="flex flex-col">
                  <span className="font-medium tracking-tight">{brand.name}</span>
                  <span className="text-[11px] text-slate-500">{brand.type} partner</span>
                  <span className="text-[11px] text-slate-500">
                    Commission: {brand.commission}%
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 px-2 text-[11px] border-rose-500/60 text-rose-300"
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
        <Card className="border border-slate-800/80 bg-slate-900/60 rounded-2xl px-3 py-3 text-xs">
          <span className="text-[11px] uppercase tracking-[0.16em] text-slate-400">New brand</span>
          <p className="mt-1 text-[11px] text-slate-500">
            Add a partner to the <code>brands</code> collection.
          </p>
          <div className="mt-3 space-y-2">
            <Input
              placeholder="Brand name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="bg-slate-950/60 border-slate-800/80 text-xs rounded-2xl"
            />
            <Input
              placeholder="Contact email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              className="bg-slate-950/60 border-slate-800/80 text-xs rounded-2xl"
            />
            <div className="grid grid-cols-2 gap-2">
              <Input
                placeholder="Type (e.g. Exclusive)"
                value={newType}
                onChange={(e) => setNewType(e.target.value)}
                className="bg-slate-950/60 border-slate-800/80 text-xs rounded-2xl"
              />
              <Input
                placeholder="Comm % (e.g. 25)"
                value={newComm}
                onChange={(e) => setNewComm(e.target.value)}
                className="bg-slate-950/60 border-slate-800/80 text-xs rounded-2xl"
              />
            </div>
            <Button
              disabled={!canEdit || isAdding}
              onClick={handleAddBrand}
              size="sm"
              className="w-full mt-2 bg-emerald-500 text-slate-950 hover:bg-emerald-400 text-xs disabled:opacity-50"
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
  const [loading, setLoading] = useState(true);

  // Form
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [size, setSize] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("DEL 0");

  React.useEffect(() => {
    const q = query(collection(db, "inventory"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setItems(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleAddItem = async () => {
    if (!name || !price) return;
    try {
      await addDoc(collection(db, "inventory"), {
        name, brand, size, price, stock,
        createdAt: new Date(),
        qrToken: crypto.randomUUID(), // Or just use doc.id later
      });
      setName(""); setBrand(""); setSize(""); setPrice(""); setStock("DEL 0");
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
          <span className="text-[11px] uppercase tracking-[0.16em] text-slate-400">Inventory</span>
          <span className="text-xs text-slate-400">
            Add items, generate QR tokens, and sync stock per city
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Inventory list */}
        <Card className="lg:col-span-2 border border-slate-800/80 bg-slate-900/60 rounded-2xl px-3 py-3 text-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] uppercase tracking-[0.16em] text-slate-400">Items</span>
            <span className="text-[11px] text-slate-500">{items.length} SKUs</span>
          </div>

          <div className="space-y-2 mb-4 p-3 bg-slate-950/40 rounded-xl border border-dashed border-slate-800">
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="Item Name" value={name} onChange={e => setName(e.target.value)} className="bg-slate-900/80 border-slate-700 h-8" />
              <Input placeholder="Brand" value={brand} onChange={e => setBrand(e.target.value)} className="bg-slate-900/80 border-slate-700 h-8" />
              <Input placeholder="Size" value={size} onChange={e => setSize(e.target.value)} className="bg-slate-900/80 border-slate-700 h-8" />
              <Input placeholder="Price" value={price} onChange={e => setPrice(e.target.value)} className="bg-slate-900/80 border-slate-700 h-8" />
            </div>
            <Button size="sm" onClick={handleAddItem} disabled={!canEdit} className="w-full bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 border border-emerald-600/50">
              + Add New SKU
            </Button>
          </div>

          <div className="space-y-1.5 h-64 overflow-y-auto pr-1">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between rounded-xl bg-slate-950/40 px-3 py-2 border border-transparent hover:border-slate-700 transition-colors"
              >
                <div className="flex flex-col">
                  <span className="font-medium tracking-tight">{item.name}</span>
                  <span className="text-[11px] text-slate-500">
                    {item.brand} · {item.size}
                  </span>
                  <span className="text-[11px] text-slate-500">{item.stock}</span>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="text-[11px] text-slate-200">₹{item.price}</span>
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-7 w-7 border-slate-700"
                    onClick={() => setSelectedQR(item.id)}
                  >
                    <QrCode className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* QR preview panel */}
        <Card className="border border-slate-800/80 bg-slate-900/60 rounded-2xl px-3 py-3 text-xs flex flex-col gap-3 items-stretch">
          <span className="text-[11px] uppercase tracking-[0.16em] text-slate-400">
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
                <p className="font-mono text-[10px] text-emerald-400 bg-emerald-950/30 py-1 rounded">ID: {selectedQR}</p>
                <p className="text-[10px] text-slate-500">Print this code for the product tag.</p>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-500 italic">
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

  // Checkout State
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerAddr, setCustomerAddr] = useState("");
  const [qty, setQty] = useState("1");

  // In a real app, this would be populated by the scanned QR code
  // looking up the item from the 'inventory' collection
  const mockItem = {
    id: "mock-id-123",
    name: "AG Hoodie 01",
    brand: "AntiGravity Co.",
    price: 3499,
    commission: 0.30
  };

  const handleConfirmSale = async () => {
    try {
      const q = parseInt(qty) || 1;
      const total = mockItem.price * q;
      const comm = total * mockItem.commission;
      const payout = total - comm;

      await addDoc(collection(db, "sales"), {
        item: mockItem.name,
        itemId: mockItem.id,
        brand: mockItem.brand,
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

      setConfirmed(true);
      // Reset after 3 secs
      setTimeout(() => {
        setConfirmed(false);
        setCustomerName("");
        setCustomerPhone("");
      }, 3000);
    } catch (e) {
      console.error(e);
      alert("Failed to record sale");
    }
  };

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-0.5">
          <span className="text-[11px] uppercase tracking-[0.16em] text-slate-400">
            Sales panel
          </span>
          <span className="text-xs text-slate-400">
            Scan QR → pull inventory → capture customer → confirm sale
          </span>
        </div>
        <Badge className="bg-emerald-500/10 text-emerald-300 border-emerald-500/40 text-[10px] uppercase tracking-[0.16em]">
          Mobile first
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Scan / camera area */}
        <Card className="lg:col-span-2 border border-slate-800/80 bg-slate-900/60 rounded-2xl px-3 py-3 flex flex-col gap-3">
          <span className="text-[11px] uppercase tracking-[0.16em] text-slate-400">
            1 · Scan product tag
          </span>
          <div className="mt-1 flex flex-col md:flex-row gap-3">
            <div className="flex-1 flex flex-col items-center justify-center rounded-2xl bg-slate-950/60 border border-dashed border-slate-700 px-4 py-6 text-xs text-slate-400">
              <Camera className="w-8 h-8 mb-2 text-slate-500" />
              <span>Open camera & point at the QR on the tag.</span>
              <span className="mt-1 text-[11px] text-slate-500">
                In production, use <code>qrToken</code> to query
                <code>inventoryItems</code> in Firestore.
              </span>
            </div>
            <div className="w-full md:w-56 flex flex-col gap-2 text-xs">
              <div className="rounded-2xl bg-slate-900/60 border border-emerald-500/30 px-3 py-2 bg-emerald-950/20">
                <span className="text-[11px] uppercase tracking-[0.16em] text-emerald-400">
                  Item Scanned
                </span>
                <div className="mt-1 flex flex-col gap-0.5">
                  <span className="text-xs font-medium tracking-tight text-white">{mockItem.name}</span>
                  <span className="text-[11px] text-emerald-400/70">
                    {mockItem.brand}
                  </span>
                  <div className="flex items-center justify-between gap-2 mt-1">
                    <span className="text-[11px] text-slate-500">Price</span>
                    <span className="text-white font-mono">₹{mockItem.price}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Customer + totals */}
        <Card className="border border-slate-800/80 bg-slate-900/60 rounded-2xl px-3 py-3 text-xs flex flex-col gap-3">
          <span className="text-[11px] uppercase tracking-[0.16em] text-slate-400">
            2 · Customer & checkout
          </span>
          <div className="space-y-2">
            <Input
              placeholder="Customer name"
              className="bg-slate-950/60 border-slate-800/80 text-xs rounded-2xl"
              value={customerName}
              onChange={e => setCustomerName(e.target.value)}
            />
            <Input
              placeholder="Phone number"
              className="bg-slate-950/60 border-slate-800/80 text-xs rounded-2xl"
              value={customerPhone}
              onChange={e => setCustomerPhone(e.target.value)}
            />
            <Input
              placeholder="Address (optional)"
              className="bg-slate-950/60 border-slate-800/80 text-xs rounded-2xl"
              value={customerAddr}
              onChange={e => setCustomerAddr(e.target.value)}
            />
            <div className="flex items-center gap-2">
              <span className="text-slate-400 whitespace-nowrap">Qty:</span>
              <Input
                placeholder="1"
                type="number"
                min="1"
                className="bg-slate-950/60 border-slate-800/80 text-xs rounded-2xl"
                value={qty}
                onChange={e => setQty(e.target.value)}
              />
            </div>
          </div>
          <div className="mt-2 space-y-1 text-[11px] text-slate-300">
            <div className="flex items-center justify-between">
              <span>Base amount</span>
              <span>₹{mockItem.price * (parseInt(qty) || 1)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Commission ({(mockItem.commission * 100).toFixed(0)}%)</span>
              <span>₹{(mockItem.price * (parseInt(qty) || 1) * mockItem.commission).toFixed(0)}</span>
            </div>
            <div className="flex items-center justify-between font-medium text-emerald-300">
              <span>Payout to brand</span>
              <span>₹{(mockItem.price * (parseInt(qty) || 1) * (1 - mockItem.commission)).toFixed(0)}</span>
            </div>
          </div>
          <Button
            className="mt-2 w-full bg-emerald-500 text-slate-950 hover:bg-emerald-400 text-xs"
            onClick={handleConfirmSale}
          >
            Confirm sale
          </Button>
          <p className="text-[11px] text-slate-500">
            After saving to the <code>sales</code> collection, open a
            <code>mailto:</code> link to notify the brand instantly.
          </p>
        </Card>
      </div>

      {confirmed && (
        <Card className="mt-2 border border-emerald-500/40 bg-emerald-500/5 rounded-2xl px-3 py-3 text-xs flex flex-col gap-2">
          <span className="text-[11px] uppercase tracking-[0.16em] text-emerald-300">
            Success
          </span>
          <p className="text-[11px] text-slate-200">
            Sale saved successfully to Firestore!
          </p>
        </Card>
      )}
    </section>
  );
};

// =========================
// /admin/invoices – Mock invoices & reconciliation
// =========================

const InvoicesView: React.FC = () => (
  <section className="flex flex-col gap-4">
    <div className="flex items-center justify-between gap-3 flex-wrap">
      <div className="flex flex-col gap-0.5">
        <span className="text-[11px] uppercase tracking-[0.16em] text-slate-400">Invoices</span>
        <span className="text-xs text-slate-400">
          Filter by month, review payouts and send brand statements
        </span>
      </div>
      <div className="flex items-center gap-2 text-[11px]">
        <Input
          type="month"
          className="h-8 w-32 bg-slate-950/60 border-slate-800/80 text-[11px] rounded-2xl"
          placeholder="2025-01"
        />
        <Input
          type="date"
          className="h-8 w-32 bg-slate-950/60 border-slate-800/80 text-[11px] rounded-2xl"
        />
        <Button
          size="sm"
          variant="outline"
          className="border-slate-700 bg-slate-900/60 text-xs"
        >
          Apply
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="border-slate-700 bg-slate-900/60 text-xs"
        >
          Download Excel
        </Button>
      </div>
    </div>

    <Card className="border border-slate-800/80 bg-slate-900/60 rounded-2xl px-3 py-3 text-xs flex flex-col gap-3">
      <span className="text-[11px] uppercase tracking-[0.16em] text-slate-400">Mock invoices</span>
      <p className="text-[11px] text-slate-500">
        In a real flow, aggregate all sales per brand (e.g. last month), sum
        <code>payoutAmount</code>, and generate a PDF / Excel invoice for settlement.
      </p>
      <div className="space-y-2">
        {[
          { brand: "AntiGravity Co.", period: "Oct 2025", amount: "₹2.8L", status: "Pending" },
          { brand: "Neon District", period: "Oct 2025", amount: "₹1.9L", status: "Sent" },
        ].map((invoice) => (
          <div
            key={invoice.brand}
            className="flex items-center justify-between rounded-xl bg-slate-950/40 px-3 py-2"
          >
            <div className="flex flex-col">
              <span className="font-medium tracking-tight">{invoice.brand}</span>
              <span className="text-[11px] text-slate-500">Period: {invoice.period}</span>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className="text-[11px] text-slate-200">{invoice.amount}</span>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 rounded-full px-2 py-0.5">
                  {invoice.status}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 px-2 text-[11px] border-slate-700"
                >
                  View & send mail
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  </section>
);

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
    <nav className="fixed bottom-0 inset-x-0 z-30 border-t border-slate-800/80 bg-slate-950/90 backdrop-blur-xl md:hidden">
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
          className="inline-flex items-center justify-center h-9 w-9 rounded-2xl bg-gradient-to-tr from-emerald-400 via-cyan-400 to-violet-500 text-slate-950 shadow-lg shadow-emerald-500/30 -translate-y-2"
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
    className={`flex flex-col items-center gap-0.5 ${active ? "text-slate-50" : "text-slate-400"
      }`}
  >
    {icon}
    <span>{label}</span>
  </button>
);

// End of file
export default StreetJunkiesConsole;
