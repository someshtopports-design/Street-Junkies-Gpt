import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Menu,
    Bell,
    Search,
    User,
    Settings,
    Package,
    BarChart2,
    Compass,
    Activity,
    FileText,
    LogOut,
    ChevronRight,
    DollarSign
} from "lucide-react";
import { Input } from "@/components/ui/input";

export type Role = "admin" | "manager" | "sales";
export type Route =
    | "login"
    | "admin"
    | "admin/brands"
    | "admin/inventory"
    | "admin/sales"
    | "admin/invoices";

interface SidebarItemProps {
    icon: React.ReactNode;
    label: string;
    active?: boolean;
    pill?: string;
    onClick?: () => void;
    expanded?: boolean;
}

export const SidebarItem: React.FC<SidebarItemProps> = ({ icon, label, active, pill, onClick, expanded = true }) => (
    <button
        onClick={onClick}
        className={`group flex items-center justify-between gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-all duration-200 outline-none ring-offset-2 focus-visible:ring-2 focus-visible:ring-ring ${active
            ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
    >
        <span className="flex items-center gap-3">
            {/* Icon Container */}
            <span className={`flex items-center justify-center w-5 h-5 transition-transform group-hover:scale-110 ${active ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground"}`}>
                {icon}
            </span>

            {/* Label */}
            {expanded && <span>{label}</span>}
        </span>

        {/* Pill / Badge */}
        {expanded && pill && (
            <Badge variant="secondary" className={`text-[10px] uppercase font-bold tracking-wider px-1.5 py-0 ${active ? "bg-white/20 text-white border-transparent" : "bg-primary/10 text-primary border-primary/20"}`}>
                {pill}
            </Badge>
        )}
    </button>
);

interface ConsoleSidebarProps {
    role: Role;
    route: Route;
    onNavigate: (route: Route) => void;
    className?: string;
}

export const ConsoleSidebar: React.FC<ConsoleSidebarProps> = ({ role, route, onNavigate, className }) => {
    return (
        <aside className={`flex flex-col gap-6 py-4 ${className}`}>
            {/* Brand Block */}
            <div className="px-2">
                <h3 className="mb-2 px-2 text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
                    Platform
                </h3>
                <div className="flex flex-col gap-1">
                    <SidebarItem
                        icon={<Compass className="w-4 h-4" />}
                        label="Dashboard"
                        active={route === "admin"}
                        onClick={() => onNavigate("admin")}
                    />
                    <SidebarItem
                        icon={<BarChart2 className="w-4 h-4" />}
                        label="Analytics"
                        active={route === "admin/analytics" as any}
                        onClick={() => { }} // Placeholder
                    />
                </div>
            </div>

            {/* Management Block */}
            <div className="px-2">
                <h3 className="mb-2 px-2 text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
                    Management
                </h3>
                <div className="flex flex-col gap-1">
                    <SidebarItem
                        icon={<Package className="w-4 h-4" />}
                        label="Inventory"
                        active={route === "admin/inventory"}
                        onClick={() => onNavigate("admin/inventory")}
                    />
                    <SidebarItem
                        icon={<Activity className="w-4 h-4" />}
                        label="Brands"
                        active={route === "admin/brands"}
                        onClick={() => onNavigate("admin/brands")}
                    />
                </div>
            </div>

            {/* Sales Block key for user flow */}
            <div className="px-2">
                <h3 className="mb-2 px-2 text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
                    Operations
                </h3>
                <div className="flex flex-col gap-1">
                    <SidebarItem
                        icon={<DollarSign className="w-4 h-4" />}
                        label="Sales Panel"
                        active={route === "admin/sales"}
                        pill="POS"
                        onClick={() => onNavigate("admin/sales")}
                    />
                    <SidebarItem
                        icon={<FileText className="w-4 h-4" />}
                        label="Invoices"
                        active={route === "admin/invoices"}
                        onClick={() => onNavigate("admin/invoices")}
                    />
                </div>
            </div>

            <div className="mt-auto px-4">
                <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-xs ring-2 ring-background">
                            {role[0].toUpperCase()}
                        </div>
                        <div className="flex flex-col overflow-hidden">
                            <span className="text-sm font-medium truncate capitalize">{role} Account</span>
                            <span className="text-[10px] text-muted-foreground truncate">Street Junkies</span>
                        </div>
                    </div>
                </div>
            </div>
        </aside>
    );
};
