import React, { useState, useEffect, useMemo } from "react";
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
    Clock,
    Store,
    Calendar,
    Download,
    CheckCircle2,
    Upload,
    X,
    Filter
} from "lucide-react";
import { collection, query, orderBy, onSnapshot, writeBatch, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { ConfirmDialog, AppAlertDialog } from "@/components/ui/app-dialogs";

// --- Types ---
interface DashboardViewProps {
    store: string;
    onSwitchStore: () => void;
}

// --- Subcomponents ---

const MetricCard = ({ label, value, delta, deltaLabel, icon: Icon, colorClass, onClick }: any) => (
    <Card
        onClick={onClick}
        className="relative overflow-hidden border border-border/50 bg-card p-5 group hover:shadow-md transition-all duration-300 cursor-pointer hover:-translate-y-1"
    >
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
                <p className="text-xs text-muted-foreground">Latest transactions</p>
            </div>
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
        <Card className="flex flex-col gap-4 p-5 border-border/50 bg-card h-full">
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

export const DashboardView: React.FC<DashboardViewProps> = ({ store, onSwitchStore }) => {
    const [sales, setSales] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Filter Filters
    const [filterDate, setFilterDate] = useState("");
    const [filterMonth, setFilterMonth] = useState("");

    // Drill Down Modal
    const [selectedMetric, setSelectedMetric] = useState<"revenue" | "commission" | "payouts" | "settled" | null>(null);

    // Settlement State (Persistent)
    const [settleBrand, setSettleBrand] = useState<string | null>(null);
    const [isSettling, setIsSettling] = useState(false);
    const [alertConfig, setAlertConfig] = useState({ open: false, title: "", desc: "" });

    useEffect(() => {
        const q = query(collection(db, "sales"), orderBy("createdAt", "desc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setSales(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    // Filter Logic
    const filteredSales = useMemo(() => {
        return sales.filter(s => {
            // Store Filter
            if (store && s.store && s.store !== store) return false;
            // Date Filter
            if (filterDate || filterMonth) {
                const sDate = s.createdAt?.toDate ? s.createdAt.toDate() : new Date(s.createdAt);
                if (filterDate && sDate.toISOString().slice(0, 10) !== filterDate) return false;
                if (filterMonth && sDate.toISOString().slice(0, 7) !== filterMonth) return false;
            }
            return true;
        });
    }, [sales, store, filterDate, filterMonth]);

    const totalRevenue = filteredSales.reduce((acc, curr) => acc + (curr.amount || 0), 0);
    const totalComm = filteredSales.reduce((acc, curr) => acc + (curr.commission || 0), 0);
    const totalPayout = filteredSales.reduce((acc, curr) => {
        // Only count pending payouts for the dashboard metric
        if (curr.payoutStatus === 'settled') return acc;
        return acc + (curr.payoutAmount || 0);
    }, 0);

    // Aggregation for Modal
    const brandStats = useMemo(() => {
        const stats: Record<string, { revenue: number, comm: number, payout: number, pendingPayout: number }> = {};
        filteredSales.forEach(s => {
            if (!stats[s.brand]) stats[s.brand] = { revenue: 0, comm: 0, payout: 0, pendingPayout: 0 };
            stats[s.brand].revenue += s.amount || 0;
            stats[s.brand].comm += s.commission || 0;
            stats[s.brand].payout += s.payoutAmount || 0;

            if (s.payoutStatus !== 'settled') {
                stats[s.brand].pendingPayout += s.payoutAmount || 0;
            }
        });
        return Object.entries(stats).map(([brand, data]) => ({ brand, ...data }));
    }, [filteredSales]);

    const initiateSettle = (brandName: string) => {
        const pendingSales = filteredSales.filter(s => s.brand === brandName && s.payoutStatus !== 'settled');
        if (pendingSales.length === 0) {
            setAlertConfig({
                open: true,
                title: "No Pending Sales",
                desc: "There are no pending sales to settle for this brand."
            });
            return;
        }
        setSettleBrand(brandName);
    };

    const confirmSettle = async () => {
        if (!settleBrand) return;
        setIsSettling(true);
        const pendingSales = filteredSales.filter(s => s.brand === settleBrand && s.payoutStatus !== 'settled');

        try {
            const batch = writeBatch(db);
            pendingSales.forEach(s => {
                const ref = doc(db, "sales", s.id);
                batch.update(ref, {
                    payoutStatus: 'settled',
                    settledAt: new Date()
                });
            });
            await batch.commit();
            setSettleBrand(null);
            setAlertConfig({
                open: true,
                title: "Settlement Successful",
                desc: `Successfully settled ${pendingSales.length} transactions for ${settleBrand}.`
            });
        } catch (e) {
            console.error("Settlement failed", e);
            setAlertConfig({
                open: true,
                title: "Error",
                desc: "Failed to process settlement. Please try again."
            });
        } finally {
            setIsSettling(false);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 h-[calc(100vh-100px)] flex flex-col overflow-y-auto md:overflow-hidden">

            {/* Hero Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 shrink-0">
                <div>
                    <div className="flex items-center gap-2">
                        <h1 className="text-2xl font-bold tracking-tight text-foreground">Dashboard</h1>
                        <Badge variant="outline" className="text-xs bg-background gap-1 p-1 pr-2 cursor-pointer hover:bg-secondary transition-colors" onClick={onSwitchStore}>
                            <Store className="w-3 h-3" />
                            {store}
                        </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">Real-time overview for {store}.</p>
                </div>

                <div className="flex items-center gap-2">
                    {/* Filters */}
                    <div className="flex items-center gap-1 bg-secondary/30 p-1 rounded-lg border border-border/50">
                        <input
                            type="date"
                            className="bg-transparent text-xs border-none focus:ring-0 p-1 px-2"
                            value={filterDate}
                            onChange={(e) => { setFilterDate(e.target.value); setFilterMonth(""); }}
                        />
                        <span className="text-[10px] text-muted-foreground">OR</span>
                        <input
                            type="month"
                            className="bg-transparent text-xs border-none focus:ring-0 p-1 px-2 w-32"
                            value={filterMonth}
                            onChange={(e) => { setFilterMonth(e.target.value); setFilterDate(""); }}
                        />
                        {(filterDate || filterMonth) && (
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { setFilterDate(""); setFilterMonth("") }}>
                                <X className="w-3 h-3" />
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 shrink-0">
                <MetricCard
                    label="Total Revenue"
                    value={`₹${totalRevenue.toLocaleString()}`}
                    delta="Click for Breakdown"
                    deltaLabel="Gross Volume"
                    icon={TrendingUp}
                    colorClass="text-blue-500"
                    onClick={() => setSelectedMetric("revenue")}
                />
                <MetricCard
                    label="Commission"
                    value={`₹${totalComm.toLocaleString()}`}
                    delta="Click for Breakdown"
                    deltaLabel="Total Earnings"
                    icon={Wallet}
                    colorClass="text-emerald-500"
                    onClick={() => setSelectedMetric("commission")}
                />
                <MetricCard
                    label="Payouts Pending"
                    value={`₹${totalPayout.toLocaleString()}`}
                    delta="Manage Settlements"
                    deltaLabel="Pending Net Payable"
                    icon={Clock}
                    colorClass="text-orange-500"
                    onClick={() => setSelectedMetric("payouts")}
                />
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 shrink-0 h-auto md:flex-1 md:overflow-hidden md:min-h-0">
                <div className="lg:col-span-2 overflow-hidden h-[500px] md:h-full">
                    <RecentSalesList sales={filteredSales.slice(0, 20)} loading={loading} />
                </div>
                <div className="overflow-hidden h-[400px] md:h-full">
                    <BrandPerformanceMap sales={filteredSales} />
                </div>
            </div>

            {/* Drill Down Modal */}
            {selectedMetric && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <Card className="w-full max-w-2xl h-[80vh] flex flex-col overflow-hidden shadow-2xl">
                        <div className="p-4 border-b border-border flex justify-between items-center bg-muted/20">
                            <div>
                                <h2 className="text-lg font-bold capitalize">{selectedMetric} Breakdown</h2>
                                <p className="text-xs text-muted-foreground">Brand-wise Analysis ({store})</p>
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => setSelectedMetric(null)}>
                                <X className="w-4 h-4" />
                            </Button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-0">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-muted-foreground uppercase bg-muted/40 sticky top-0 backdrop-blur-sm z-10">
                                    <tr>
                                        <th className="px-6 py-3">Brand</th>
                                        <th className="px-6 py-3 text-right">
                                            {selectedMetric === 'revenue' ? 'Revenue' :
                                                selectedMetric === 'commission' ? 'Commission' : 'Payout Amount'}
                                        </th>
                                        {selectedMetric === 'payouts' && <th className="px-6 py-3 text-right">Status</th>}
                                        {selectedMetric === 'payouts' && <th className="px-6 py-3 text-right">Action</th>}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/50">
                                    {brandStats.map(stat => (
                                        <tr key={stat.brand} className="hover:bg-muted/10 transition-colors">
                                            <td className="px-6 py-4 font-medium">{stat.brand}</td>
                                            <td className="px-6 py-4 text-right font-mono text-base">
                                                ₹{
                                                    selectedMetric === 'revenue' ? stat.revenue.toLocaleString() :
                                                        selectedMetric === 'commission' ? stat.comm.toLocaleString() :
                                                            (selectedMetric === 'payouts' ? stat.pendingPayout.toLocaleString() : stat.payout.toLocaleString())
                                                }
                                                {selectedMetric === 'payouts' && stat.pendingPayout !== stat.payout && (
                                                    <div className="text-[10px] text-muted-foreground">Total: ₹{stat.payout.toLocaleString()}</div>
                                                )}
                                            </td>
                                            {selectedMetric === 'payouts' && (
                                                <>
                                                    <td className="px-6 py-4 text-right">
                                                        {stat.pendingPayout === 0 ? (
                                                            <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">Settled</Badge>
                                                        ) : (
                                                            <Badge variant="outline" className="bg-orange-500/10 text-orange-600 border-orange-500/20">Pending</Badge>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        {stat.pendingPayout > 0 && (
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                className="h-8 gap-2"
                                                                onClick={() => initiateSettle(stat.brand)}
                                                            >
                                                                Settle
                                                                <Upload className="w-3 h-3 text-muted-foreground" />
                                                            </Button>
                                                        )}
                                                    </td>
                                                </>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </div>
            )}


            <ConfirmDialog
                open={!!settleBrand}
                onOpenChange={(open) => !open && setSettleBrand(null)}
                title={`Settle ${settleBrand}?`}
                description="This will mark all pending sales for this brand as settled. This action cannot be undone."
                onConfirm={confirmSettle}
                isLoading={isSettling}
            />

            <AppAlertDialog
                open={alertConfig.open}
                onOpenChange={(open) => setAlertConfig(prev => ({ ...prev, open }))}
                title={alertConfig.title}
                description={alertConfig.desc}
            />
        </div >
    );
};
