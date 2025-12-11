import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Compass,
    MapPin,
    ChevronRight,
    ArrowUpRight,
    TrendingUp,
    Wallet,
    Clock
} from "lucide-react";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";

// --- Subcomponents ---

const MetricCard = ({ label, value, delta, deltaLabel, icon: Icon, colorClass }: any) => (
    <Card className="relative overflow-hidden border border-border/50 bg-card p-5 group hover:shadow-md transition-all duration-300">
        <div className={`absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity ${colorClass}`}>
            <Icon className="w-16 h-16" />
        </div>
        <div className="flex flex-col gap-4 relative z-10">
            <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{label}</span>
                {delta && (
                    <Badge variant="secondary" className="bg-green-500/10 text-green-600 border-green-500/20 text-[10px] gap-1 px-1.5">
                        <ArrowUpRight className="w-3 h-3" />
                        {delta}
                    </Badge>
                )}
            </div>
            <div>
                <div className="text-2xl font-bold tracking-tight text-foreground">{value}</div>
                <p className="text-[11px] text-muted-foreground mt-1">{deltaLabel}</p>
            </div>
        </div>
    </Card>
);

const RecentSalesList = ({ sales, loading }: { sales: any[], loading: boolean }) => (
    <Card className="flex flex-col gap-4 p-5 h-full border-border/50 bg-card">
        <div className="flex items-center justify-between">
            <div className="space-y-1">
                <h3 className="font-semibold text-sm">Recent Activity</h3>
                <p className="text-xs text-muted-foreground">Latest transactions across all outlets</p>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                <ChevronRight className="w-4 h-4" />
            </Button>
        </div>

        <div className="flex flex-col gap-3 flex-1 overflow-y-auto pr-2 custom-scrollbar">
            {loading && <div className="text-xs text-muted-foreground py-4 text-center">Syncing data...</div>}
            {!loading && sales.length === 0 && <div className="text-xs text-muted-foreground py-4 text-center">No recent sales found.</div>}

            {sales.map((sale) => (
                <div key={sale.id} className="group flex items-center justify-between p-3 rounded-xl bg-secondary/30 hover:bg-secondary/60 transition-colors border border-transparent hover:border-border/50">
                    <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center font-bold text-xs">
                            {sale.brand?.substring(0, 2).toUpperCase()}
                        </div>
                        <div className="flex flex-col">
                            <span className="text-sm font-medium text-foreground">{sale.item}</span>
                            <span className="text-[11px] text-muted-foreground">{sale.brand} · {sale.customer?.name || "Guest"}</span>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-sm font-bold text-foreground">₹{sale.amount}</div>
                        <div className="text-[10px] text-muted-foreground">{sale.createdAt?.toDate ? sale.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}</div>
                    </div>
                </div>
            ))}
        </div>
    </Card>
);

const BrandPerformanceMap = ({ sales }: { sales: any[] }) => {
    // Basic aggregation
    const brandStats: Record<string, number> = {};
    sales.forEach(s => {
        brandStats[s.brand] = (brandStats[s.brand] || 0) + (s.payoutAmount || 0);
    });
    const sorted = Object.entries(brandStats).sort(([, a], [, b]) => b - a).slice(0, 4);
    const max = sorted[0]?.[1] || 1;

    return (
        <Card className="flex flex-col gap-4 p-5 border-border/50 bg-card">
            <div className="space-y-1">
                <h3 className="font-semibold text-sm">Top Partners</h3>
                <p className="text-xs text-muted-foreground">Highest performing brands by payout</p>
            </div>
            <div className="flex flex-col gap-4 mt-2">
                {sorted.map(([brand, val], i) => (
                    <div key={brand} className="space-y-1.5">
                        <div className="flex justify-between text-xs font-medium">
                            <span>{brand}</span>
                            <span className="text-muted-foreground">₹{val.toLocaleString()}</span>
                        </div>
                        <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                            <div
                                className="h-full bg-primary rounded-full transition-all duration-1000 ease-out"
                                style={{ width: `${(val / max) * 100}%` }}
                            />
                        </div>
                    </div>
                ))}
                {sorted.length === 0 && <div className="text-xs text-muted-foreground">No data available yet.</div>}
            </div>
        </Card>
    )
}

// --- Main View ---

export const DashboardView: React.FC = () => {
    const [sales, setSales] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const q = query(collection(db, "sales"), orderBy("createdAt", "desc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setSales(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const totalRevenue = sales.reduce((acc, curr) => acc + (curr.amount || 0), 0);
    const totalComm = sales.reduce((acc, curr) => acc + (curr.commission || 0), 0);
    const totalPayout = sales.reduce((acc, curr) => acc + (curr.payoutAmount || 0), 0);

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

            {/* Hero Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">Dashboard</h1>
                    <p className="text-sm text-muted-foreground mt-1">Real-time overview of your store's performance.</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" className="text-xs h-9">Download Report</Button>
                    <Button size="sm" className="text-xs h-9 bg-primary text-primary-foreground shadow-lg shadow-primary/20">
                        <TrendingUp className="w-3.5 h-3.5 mr-2" />
                        View Live Sales
                    </Button>
                </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <MetricCard
                    label="Total Revenue"
                    value={`₹${totalRevenue.toLocaleString()}`}
                    delta="Live"
                    deltaLabel="Gross Volume"
                    icon={TrendingUp}
                    colorClass="text-blue-500"
                />
                <MetricCard
                    label="Commission"
                    value={`₹${totalComm.toLocaleString()}`}
                    delta={`${((totalComm / (totalRevenue || 1)) * 100).toFixed(1)}%`}
                    deltaLabel="Avg. Take Rate"
                    icon={Wallet}
                    colorClass="text-emerald-500"
                />
                <MetricCard
                    label="Payouts Pending"
                    value={`₹${totalPayout.toLocaleString()}`}
                    delta={`${sales.length}`}
                    deltaLabel="Orders Processed"
                    icon={Clock}
                    colorClass="text-orange-500"
                />
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <RecentSalesList sales={sales.slice(0, 10)} loading={loading} />
                </div>
                <div>
                    <BrandPerformanceMap sales={sales} />
                </div>
            </div>
        </div>
    );
};
