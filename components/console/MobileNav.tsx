import React from "react";
import { Compass, Package, DollarSign, Activity, FileText } from "lucide-react";

interface MobileNavProps {
    role: string | null;
    route: string;
    onNavigate: (route: any) => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({ role, route, onNavigate }) => {
    if (!role || route === "login") return null;

    return (
        <nav className="fixed bottom-0 inset-x-0 z-50 bg-background/80 backdrop-blur-xl border-t border-border md:hidden pb-safe-area-inset-bottom">
            <div className="flex items-center justify-around px-2 py-3">
                <MobileNavItem
                    label="Home"
                    icon={<Compass className="w-5 h-5" />}
                    active={route === "admin"}
                    onClick={() => onNavigate("admin")}
                />
                <MobileNavItem
                    label="Stock"
                    icon={<Package className="w-5 h-5" />}
                    active={route === "admin/inventory"}
                    onClick={() => onNavigate("admin/inventory")}
                />

                {/* Floating Action Button for Sales */}
                <div className="relative -top-5">
                    <button
                        onClick={() => onNavigate("admin/sales")}
                        className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/40 ring-4 ring-background transition-transform active:scale-95"
                    >
                        <DollarSign className="w-7 h-7" />
                    </button>
                </div>

                <MobileNavItem
                    label="Brands"
                    icon={<Activity className="w-5 h-5" />}
                    active={route === "admin/brands"}
                    onClick={() => onNavigate("admin/brands")}
                />
                <MobileNavItem
                    label="Invoices"
                    icon={<FileText className="w-5 h-5" />}
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
        className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-colors ${active ? "text-primary" : "text-muted-foreground hover:text-foreground"
            }`}
    >
        {icon}
        <span className="text-[10px] font-medium">{label}</span>
    </button>
);
