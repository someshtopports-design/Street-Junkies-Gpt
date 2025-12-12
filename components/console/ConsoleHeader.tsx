import React from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Bell, Sun, Moon, LogOut, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    collection,
    query,
    where,
    onSnapshot,
    orderBy,
    limit
} from "firebase/firestore";
import { db } from "@/lib/firebase";

interface ConsoleHeaderProps {
    role: string | null;
    onLogout: () => void;
    theme: "dark" | "light";
    onToggleTheme: () => void;
    onMenuClick?: () => void;
    store: string | null;
}

export const ConsoleHeader: React.FC<ConsoleHeaderProps> = ({ role, onLogout, theme, onToggleTheme, onMenuClick, store }) => {
    const [notifications, setNotifications] = React.useState<any[]>([]);
    const [unreadCount, setUnreadCount] = React.useState(0);

    React.useEffect(() => {
        if (!store) return;

        // 1. Low Stock Notifications
        const qStock = query(collection(db, "inventory"), where("store", "==", store), where("stock", "<", 5));

        // 2. Pending Payouts (High Value > 5000) - Just as an example of an "alert"
        const qSales = query(collection(db, "sales"), where("store", "==", store), where("payoutStatus", "!=", "settled"), where("amount", ">", 5000));

        const unsubStock = onSnapshot(qStock, (snap) => {
            const lowStockItems = snap.docs.map(doc => ({
                id: doc.id,
                type: 'low_stock',
                title: 'Low Stock Alert',
                message: `${doc.data().name} (${doc.data().size}) is low on stock (${doc.data().stock}).`,
                time: new Date()
            }));

            setNotifications(prev => {
                // Filter out old low_stock
                const others = prev.filter(n => n.type !== 'low_stock');
                return [...others, ...lowStockItems];
            });
        });

        const unsubSales = onSnapshot(qSales, (snap) => {
            const pendingPayouts = snap.docs.map(doc => ({
                id: doc.id,
                type: 'pending_payout',
                title: 'High Value Payout',
                message: `Pending payout for ${doc.data().brand}: ₹${doc.data().payoutAmount}`,
                time: new Date()
            }));

            setNotifications(prev => {
                const others = prev.filter(n => n.type !== 'pending_payout');
                return [...others, ...pendingPayouts];
            });
        });

        return () => {
            unsubStock();
            unsubSales();
        };
    }, [store]);

    React.useEffect(() => {
        setUnreadCount(notifications.length);
    }, [notifications]);
    return (
        <header className="sticky top-0 z-40 w-full glass">
            <div className="max-w-[1400px] mx-auto flex h-16 items-center justify-between px-4 md:px-6 gap-4">

                {/* Left: Branding & Mobile Menu */}
                <div className="flex items-center gap-3 md:gap-4">


                    <div className="flex items-center gap-2.5 group cursor-pointer">
                        <div className="h-9 w-9 rounded-2xl bg-gradient-to-tr from-primary to-violet-500 flex items-center justify-center shadow-lg shadow-primary/25 transition-transform group-hover:scale-105 duration-300">
                            <span className="text-xs font-bold tracking-tight text-white drop-shadow-md">SJ</span>
                        </div>
                        <div className="hidden md:flex flex-col leading-none">
                            <span className="text-sm font-semibold tracking-tight text-foreground group-hover:text-primary transition-colors">Street Junkies</span>
                            <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mt-1">Console</span>
                        </div>
                    </div>
                </div>

                {/* Center: Search (Desktop) */}
                <div className="hidden md:flex flex-1 items-center justify-center max-w-lg mx-auto">
                    <div className="relative w-full group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors duration-300" />
                        <Input
                            placeholder="Search inventory, brands, or invoices..."
                            className="pl-10 h-10 w-full rounded-2xl bg-secondary/50 border-transparent focus:bg-background focus:border-input focus:ring-2 focus:ring-ring/20 transition-all duration-300 text-sm placeholder:text-muted-foreground/70"
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                            <span className="text-[10px] bg-background/50 border border-border px-1.5 py-0.5 rounded text-muted-foreground">⌘K</span>
                        </div>
                    </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-2 md:gap-3">
                    <Badge variant="outline" className="hidden sm:inline-flex capitalize bg-primary/5 text-primary border-primary/20 h-7 px-3">
                        {role || 'Guest'}
                    </Badge>

                    <div className="h-6 w-px bg-border mx-1 hidden sm:block"></div>

                    <Button variant="ghost" size="icon" onClick={onToggleTheme} className="rounded-xl h-9 w-9 text-muted-foreground hover:text-foreground">
                        {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                    </Button>

                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="ghost" size="icon" className="relative rounded-xl h-9 w-9 text-muted-foreground hover:text-foreground">
                                <Bell className="w-4 h-4" />
                                {unreadCount > 0 && <span className="absolute top-2 right-2.5 h-1.5 w-1.5 rounded-full bg-red-500 border border-background"></span>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80 p-0 mr-4" align="end">
                            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
                                <h4 className="font-semibold text-sm">Notifications</h4>
                                <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-mono">{unreadCount} new</span>
                            </div>
                            <div className="max-h-[300px] overflow-y-auto">
                                {notifications.length === 0 ? (
                                    <div className="p-8 text-center text-muted-foreground text-sm">
                                        No new notifications
                                    </div>
                                ) : (
                                    <div className="divide-y divide-border/50">
                                        {notifications.map((n, i) => (
                                            <div key={i} className="p-3 hover:bg-muted/50 transition-colors cursor-pointer flex gap-3 items-start">
                                                <div className="h-2 w-2 mt-1.5 rounded-full bg-orange-500 shrink-0" />
                                                <div className="space-y-1">
                                                    <p className="text-sm font-medium leading-none">{n.title}</p>
                                                    <p className="text-xs text-muted-foreground line-clamp-2">{n.message}</p>
                                                    <p className="text-[10px] text-muted-foreground/60">{n.time.toLocaleTimeString()}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </PopoverContent>
                    </Popover>

                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onLogout}
                        className="flex items-center gap-2 ml-1 rounded-xl h-9 px-3 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                    >
                        <LogOut className="w-4 h-4" />
                        <span className="hidden sm:inline text-xs font-medium">Log out</span>
                    </Button>
                </div>

            </div>
        </header>
    );
};
