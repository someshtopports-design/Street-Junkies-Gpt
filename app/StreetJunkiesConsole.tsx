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
  const [role, setRole] = useState<Role | null>(null);
  const [route, setRoute] = useState<Route>("login");

  const handleMockLogin = (nextRole: Role) => {
    // In production: replace this with Firebase Auth + Firestore role lookup.
    setRole(nextRole);
    if (nextRole === "sales") {
      setRoute("admin/sales");
    } else {
      setRoute("admin");
    }
  };

  const handleLogout = () => {
    // In production: call Firebase signOut and clear state.
    setRole(null);
    setRoute("login");
  };

  if (!role || route === "login") {
    return <LoginScreen onLogin={handleMockLogin} />;
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
  onLogin: (role: Role) => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
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
            Use your console credentials. Roles are resolved from Firestore
            after Firebase Auth in production.
          </p>
        </div>

        <div className="space-y-4 text-xs">
          <div className="space-y-2">
            <label className="text-[11px] uppercase tracking-[0.16em] text-slate-400">
              Email
            </label>
            <Input
              type="email"
              placeholder="you@streetjunkies.io"
              className="bg-slate-950/60 border-slate-800/80 text-xs rounded-2xl"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[11px] uppercase tracking-[0.16em] text-slate-400">
              Password
            </label>
            <Input
              type="password"
              placeholder="••••••••"
              className="bg-slate-950/60 border-slate-800/80 text-xs rounded-2xl"
            />
          </div>

          {/* Mock role selector – remove when wired to Firestore */}
          <div className="space-y-2">
            <label className="text-[11px] uppercase tracking-[0.16em] text-slate-400">
              Quick role (mock)
            </label>
            <div className="grid grid-cols-3 gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="text-[11px] border-slate-700 bg-slate-950/60"
                onClick={() => onLogin("admin")}
              >
                Admin
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="text-[11px] border-slate-700 bg-slate-950/60"
                onClick={() => onLogin("manager")}
              >
                Manager
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="text-[11px] border-slate-700 bg-slate-950/60"
                onClick={() => onLogin("sales")}
              >
                Sales
              </Button>
            </div>
          </div>
        </div>

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
    className={`flex items-center justify-between gap-2 rounded-xl px-2 py-1.5 text-xs transition-colors ${
      active
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

const AdminDashboardView: React.FC = () => (
  <>
    <HeroStrip />

    <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <MetricCard
        label="Total revenue"
        value="₹8.4L"
        delta="▲ 18%"
        deltaLabel="vs last 30 days"
        pins="Live across DEL · BLR · BOM"
      />
      <MetricCard
        label="Commission earned"
        value="₹1.2L"
        delta="▲ 11%"
        deltaLabel="Street Junkies share"
        pins="Dynamic per brand"
      />
      <MetricCard
        label="Pending payouts"
        value="₹6.1L"
        delta="12 brands"
        deltaLabel="awaiting settlement"
        pins="Synced with invoices"
      />
    </section>

    <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2 flex flex-col gap-3">
        <RecentSales />
        <BrandPerformance />
      </div>
      <div className="flex flex-col gap-3">
        <FlowSummary />
      </div>
    </section>
  </>
);

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

const RecentSales: React.FC = () => (
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
      {[
        { brand: "AntiGravity Co.", item: "Hoodie AG-01", city: "DEL", amount: "₹4,200" },
        { brand: "Neon District", item: "Cargo ND-07", city: "BLR", amount: "₹3,100" },
        { brand: "Skyline Labs", item: "Sneaker SL-03", city: "BOM", amount: "₹7,800" },
      ].map((sale) => (
        <div
          key={sale.item}
          className="flex items-center justify-between rounded-xl bg-slate-950/40 px-3 py-2"
        >
          <div className="flex flex-col">
            <span className="font-medium tracking-tight">{sale.brand}</span>
            <span className="text-[11px] text-slate-500">
              {sale.item} · {sale.city}
            </span>
          </div>
          <span className="text-[11px] text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 rounded-full px-2 py-0.5">
            {sale.amount}
          </span>
        </div>
      ))}
    </div>
  </Card>
);

const BrandPerformance: React.FC = () => (
  <Card className="border border-slate-800/80 bg-slate-900/60 rounded-2xl px-3 py-3 flex flex-col gap-3">
    <div className="flex items-center justify-between">
      <div className="flex flex-col gap-0.5">
        <span className="text-[11px] uppercase tracking-[0.16em] text-slate-400">Brand performance</span>
        <span className="text-xs text-slate-400">Top partners by payout</span>
      </div>
    </div>
    <div className="flex flex-col gap-2 text-xs">
      {["AntiGravity Co.", "Neon District", "Skyline Labs"].map((brand, index) => (
        <div key={brand} className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <span className="text-slate-200">{brand}</span>
            <span className="text-[11px] text-slate-400">
              ₹{(5.3 - index * 1.2).toFixed(1)}L payout
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-slate-900 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-cyan-400 to-violet-500"
              style={{ width: `${80 - index * 15}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  </Card>
);

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

const BrandsView: React.FC<BrandsViewProps> = ({ canEdit }) => (
  <section className="flex flex-col gap-4">
    <div className="flex items-center justify-between">
      <div className="flex flex-col gap-0.5">
        <span className="text-[11px] uppercase tracking-[0.16em] text-slate-400">Brands</span>
        <span className="text-xs text-slate-400">
          Onboard partners and configure commission logic
        </span>
      </div>
      {canEdit && (
        <Button
          size="sm"
          className="bg-emerald-500 text-slate-950 hover:bg-emerald-400 text-xs"
        >
          <Plus className="w-3.5 h-3.5 mr-1" />
          Add brand
        </Button>
      )}
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Brand list */}
      <Card className="lg:col-span-2 border border-slate-800/80 bg-slate-900/60 rounded-2xl px-3 py-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] uppercase tracking-[0.16em] text-slate-400">Active partners</span>
          <span className="text-[11px] text-slate-500">3 brands</span>
        </div>
        <div className="flex flex-col gap-2 text-xs">
          {[
            { name: "AntiGravity Co.", type: "Exclusive", commission: "30%" },
            { name: "Neon District", type: "Non-exclusive", commission: "22%" },
            { name: "Skyline Labs", type: "Non-exclusive", commission: "18%" },
          ].map((brand) => (
            <div
              key={brand.name}
              className="flex items-center justify-between rounded-xl bg-slate-950/40 px-3 py-2"
            >
              <div className="flex flex-col">
                <span className="font-medium tracking-tight">{brand.name}</span>
                <span className="text-[11px] text-slate-500">{brand.type} partner</span>
                <span className="text-[11px] text-slate-500">
                  Commission: {brand.commission}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 px-2 text-[11px] border-slate-700"
                >
                  View
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 px-2 text-[11px] border-rose-500/60 text-rose-300"
                >
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Brand form skeleton */}
      <Card className="border border-slate-800/80 bg-slate-900/60 rounded-2xl px-3 py-3 text-xs">
        <span className="text-[11px] uppercase tracking-[0.16em] text-slate-400">New brand (form)</span>
        <p className="mt-1 text-[11px] text-slate-500">
          Wire this form to the <code>brands</code> collection in Firestore.
        </p>
        <div className="mt-3 space-y-2">
          <Input
            placeholder="Brand name"
            className="bg-slate-950/60 border-slate-800/80 text-xs rounded-2xl"
          />
          <Input
            placeholder="Contact email / phone"
            className="bg-slate-950/60 border-slate-800/80 text-xs rounded-2xl"
          />
          <div className="grid grid-cols-2 gap-2">
            <Input
              placeholder="Partner type (Exclusive)"
              className="bg-slate-950/60 border-slate-800/80 text-xs rounded-2xl"
            />
            <Input
              placeholder="Commission % (e.g. 25)"
              className="bg-slate-950/60 border-slate-800/80 text-xs rounded-2xl"
            />
          </div>
          <Button
            disabled={!canEdit}
            size="sm"
            className="w-full mt-2 bg-emerald-500 text-slate-950 hover:bg-emerald-400 text-xs disabled:opacity-50"
          >
            Save brand
          </Button>
        </div>
      </Card>
    </div>
  </section>
);

// =========================
// /admin/inventory – Inventory & QR generation
// =========================

interface InventoryViewProps {
  canEdit: boolean;
}

const InventoryView: React.FC<InventoryViewProps> = ({ canEdit }) => (
  <section className="flex flex-col gap-4">
    <div className="flex items-center justify-between">
      <div className="flex flex-col gap-0.5">
        <span className="text-[11px] uppercase tracking-[0.16em] text-slate-400">Inventory</span>
        <span className="text-xs text-slate-400">
          Add items, generate QR tokens, and sync stock per city
        </span>
      </div>
      {canEdit && (
        <Button
          size="sm"
          className="bg-emerald-500 text-slate-950 hover:bg-emerald-400 text-xs"
        >
          <Plus className="w-3.5 h-3.5 mr-1" />
          Add item
        </Button>
      )}
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Inventory list */}
      <Card className="lg:col-span-2 border border-slate-800/80 bg-slate-900/60 rounded-2xl px-3 py-3 text-xs">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] uppercase tracking-[0.16em] text-slate-400">Items</span>
          <span className="text-[11px] text-slate-500">3 SKUs · City-level stock</span>
        </div>
        <div className="space-y-1.5">
          {[
            {
              name: "AG Hoodie 01",
              brand: "AntiGravity Co.",
              size: "M",
              price: "₹3,499",
              stock: "DEL 8 · BLR 5",
            },
            {
              name: "ND Cargo 07",
              brand: "Neon District",
              size: "32",
              price: "₹2,799",
              stock: "DEL 3 · BLR 9",
            },
            {
              name: "SL Sneaker 03",
              brand: "Skyline Labs",
              size: "UK 9",
              price: "₹7,499",
              stock: "DEL 2 · BLR 2",
            },
          ].map((item) => (
            <div
              key={item.name}
              className="flex items-center justify-between rounded-xl bg-slate-950/40 px-3 py-2"
            >
              <div className="flex flex-col">
                <span className="font-medium tracking-tight">{item.name}</span>
                <span className="text-[11px] text-slate-500">
                  {item.brand} · {item.size}
                </span>
                <span className="text-[11px] text-slate-500">{item.stock}</span>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className="text-[11px] text-slate-200">{item.price}</span>
                <Button
                  size="icon"
                  variant="outline"
                  className="h-7 w-7 border-slate-700"
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
        <p className="text-[11px] text-slate-500">
          Click "Generate QR" in your real app to encode the <code>qrToken</code>
          from <code>inventoryItems</code>. Print and attach this to the product tag.
        </p>
        <div className="mt-1 flex flex-1 items-center justify-center">
          <div className="h-28 w-28 rounded-2xl border border-dashed border-slate-700 flex items-center justify-center bg-slate-950/60">
            <QrCode className="w-10 h-10 text-slate-500" />
          </div>
        </div>
        <span className="text-[11px] text-slate-500 text-center">
          Example payload: <code>{"{ qrToken: \"uuid-v4\" }"}</code>
        </span>
      </Card>
    </div>
  </section>
);

// =========================
// /admin/sales – Sales panel (core loop)
// =========================

const SalesPanel: React.FC = () => {
  const [confirmed, setConfirmed] = useState(false);

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
              <div className="rounded-2xl bg-slate-950/60 border border-slate-800/80 px-3 py-2">
                <span className="text-[11px] uppercase tracking-[0.16em] text-slate-400">
                  Matched item
                </span>
                <div className="mt-1 flex flex-col gap-0.5">
                  <span className="text-xs font-medium tracking-tight">AG Hoodie 01</span>
                  <span className="text-[11px] text-slate-500">
                    AntiGravity Co. · Size M
                  </span>
                  <div className="flex items-center justify-between gap-2 mt-1">
                    <span className="text-[11px] text-slate-500">Price</span>
                    <Input
                      defaultValue="₹3,499"
                      className="h-7 w-24 bg-slate-950/60 border-slate-800/80 text-[11px] rounded-2xl text-right"
                    />
                  </div>
                  <span className="text-[11px] text-slate-500">
                    Stock: DEL 8 · BLR 5
                  </span>
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
            />
            <Input
              placeholder="Phone number"
              className="bg-slate-950/60 border-slate-800/80 text-xs rounded-2xl"
            />
            <Input
              placeholder="Address (optional)"
              className="bg-slate-950/60 border-slate-800/80 text-xs rounded-2xl"
            />
            <Input
              placeholder="Quantity (default 1)"
              className="bg-slate-950/60 border-slate-800/80 text-xs rounded-2xl"
            />
          </div>
          <div className="mt-2 space-y-1 text-[11px] text-slate-300">
            <div className="flex items-center justify-between">
              <span>Base amount</span>
              <span>₹3,499</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Commission (30%)</span>
              <span>₹1,050</span>
            </div>
            <div className="flex items-center justify-between font-medium text-emerald-300">
              <span>Payout to brand</span>
              <span>₹2,449</span>
            </div>
          </div>
          <Button
            className="mt-2 w-full bg-emerald-500 text-slate-950 hover:bg-emerald-400 text-xs"
            onClick={() => setConfirmed(true)}
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
            Review & send
          </span>
          <p className="text-[11px] text-slate-200">
            Sale saved to <code>sales</code>. Review details, then send a confirmation email to the brand.
          </p>
          <div className="flex items-center justify-between text-[11px] text-slate-200">
            <span>AG Hoodie 01 · Qty 1 · AntiGravity Co.</span>
            <span>₹3,499 · 30% commission</span>
          </div>
          <div className="flex items-center justify-end gap-2 mt-1">
            <Button
              size="sm"
              variant="outline"
              className="border-slate-700 bg-slate-900/60 text-[11px]"
            >
              Edit details
            </Button>
            <Button
              size="sm"
              className="bg-emerald-500 text-slate-950 hover:bg-emerald-400 text-[11px]"
            >
              Send email to brand
            </Button>
          </div>
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
    className={`flex flex-col items-center gap-0.5 ${
      active ? "text-slate-50" : "text-slate-400"
    }`}
  >
    {icon}
    <span>{label}</span>
  </button>
);

export default StreetJunkiesConsole;
