import React, { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Download, Filter, FileText, Calendar, Search, ArrowUpRight, CheckCircle2 } from "lucide-react";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";

export const InvoicesView: React.FC = () => {
    const [sales, setSales] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Filters
    const [filterBrand, setFilterBrand] = useState("");
    const [filterDate, setFilterDate] = useState("");

    React.useEffect(() => {
        const q = query(collection(db, "sales"), orderBy("createdAt", "desc"));
        const unsub = onSnapshot(q, snap => {
            setSales(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            setLoading(false);
        });
        return () => unsub();
    }, []);

    const filtered = useMemo(() => {
        return sales.filter(s => {
            if (filterBrand && !s.brand.toLowerCase().includes(filterBrand.toLowerCase())) return false;
            if (filterDate) {
                const sDate = s.createdAt?.toDate ? s.createdAt.toDate().toISOString().slice(0, 10) : "";
                if (sDate !== filterDate) return false;
            }
            return true;
        });
    }, [sales, filterBrand, filterDate]);

    // Grouping for Payout Cards
    const payouts = useMemo(() => {
        const stats: Record<string, { count: number, total: number, comm: number, payout: number }> = {};
        filtered.forEach(s => {
            if (!stats[s.brand]) stats[s.brand] = { count: 0, total: 0, comm: 0, payout: 0 };
            stats[s.brand].count++;
            stats[s.brand].total += s.amount || 0;
            stats[s.brand].comm += s.commission || 0;
            stats[s.brand].payout += s.payoutAmount || 0;
        });
        return Object.entries(stats).map(([brand, data]) => ({ brand, ...data }));
    }, [filtered]);

    const handleExport = () => {
        const header = "Date,Brand,Item,Customer,Amount,Commission,Payout\n";
        const rows = filtered.map(s => {
            const date = s.createdAt?.toDate ? s.createdAt.toDate().toLocaleDateString() : "-";
            return `${date},${s.brand},${s.item},${s.customer?.name || "-"},${s.amount},${s.commission},${s.payoutAmount}`;
        }).join("\n");
        const blob = new Blob([header + rows], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Invoices_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
    };

    return (
        <div className="flex flex-col h-[calc(100vh-140px)] animate-in fade-in duration-500 gap-6">

            {/* Header & Toolbar */}
            <div className="flex flex-col gap-4 shrink-0">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-foreground">Invoices</h1>
                        <p className="text-sm text-muted-foreground">Manage and export your financial statements.</p>
                    </div>
                    <Button onClick={handleExport} size="sm" className="bg-primary text-primary-foreground shadow-lg shadow-primary/20 rounded-full px-4 text-xs font-semibold h-9">
                        <Download className="w-3.5 h-3.5 mr-2" />
                        Export CSV
                    </Button>
                </div>

                {/* Minimalist Filter Bar */}
                <div className="flex items-center gap-3">
                    <div className="relative group w-full max-w-xs">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                        <Input
                            placeholder="Filter by brand..."
                            value={filterBrand}
                            onChange={e => setFilterBrand(e.target.value)}
                            className="pl-9 h-9 rounded-xl bg-secondary/50 border-transparent focus:bg-background focus:border-border transition-all text-sm placeholder:text-muted-foreground/50"
                        />
                    </div>

                    <div className="relative group">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                        <input
                            type="date"
                            value={filterDate}
                            onChange={e => setFilterDate(e.target.value)}
                            className="pl-9 pr-3 h-9 rounded-xl bg-secondary/50 border-none text-sm focus:ring-2 focus:ring-ring text-muted-foreground focus:text-foreground transition-all outline-none cursor-pointer"
                        />
                    </div>

                    {(filterBrand || filterDate) && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => { setFilterBrand(""); setFilterDate(""); }}
                            className="h-9 px-3 rounded-xl text-xs text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                        >
                            Clear filters
                        </Button>
                    )}
                </div>
            </div>

            {/* Content Grid */}
            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                {loading && <div className="text-muted-foreground text-sm py-20 text-center animate-pulse">Syncing financial data...</div>}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {payouts.map((p) => (
                        <Card key={p.brand} className="group relative flex flex-col p-5 gap-5 rounded-[1.25rem] border border-border/50 bg-card hover:shadow-xl hover:shadow-black/5 transition-all duration-300 hover:-translate-y-1 overflow-hidden">
                            {/* Decorative background gradient */}
                            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-[50px] -translate-y-1/2 translate-x-1/2 group-hover:bg-primary/10 transition-colors" />

                            {/* Header */}
                            <div className="flex justify-between items-start relative z-10">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-secondary to-secondary/50 border border-white/10 flex items-center justify-center font-bold text-sm text-foreground shadow-sm">
                                        {p.brand.substring(0, 2).toUpperCase()}
                                    </div>
                                    <div className="flex flex-col">
                                        <h3 className="font-bold text-base tracking-tight text-foreground">{p.brand}</h3>
                                        <div className="flex items-center gap-1.5 pt-0.5">
                                            <Badge variant="secondary" className="text-[10px] h-5 px-1.5 font-medium bg-secondary text-muted-foreground border-transparent">
                                                Verified
                                            </Badge>
                                            <span className="text-[10px] text-muted-foreground">{p.count} orders</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Stats Grid */}
                            <div className="grid grid-cols-2 gap-x-4 gap-y-4 pt-2 relative z-10">
                                <div className="flex flex-col gap-1">
                                    <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground/70">Gross Vol.</span>
                                    <span className="text-sm font-medium text-foreground">₹{p.total.toLocaleString()}</span>
                                </div>
                                <div className="flex flex-col gap-1 items-end">
                                    <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground/70">Comm.</span>
                                    <span className="text-sm font-medium text-red-500/80">-₹{p.comm.toLocaleString()}</span>
                                </div>
                            </div>

                            {/* Footer / Total Payout */}
                            <div className="mt-auto pt-4 border-t border-dashed border-border/60 relative z-10">
                                <div className="flex justify-between items-end">
                                    <div className="flex flex-col gap-0.5">
                                        <span className="text-[10px] font-medium text-emerald-600 flex items-center gap-1">
                                            <CheckCircle2 className="w-3 h-3" />
                                            Ready for Payout
                                        </span>
                                        <span className="text-xs text-muted-foreground">Net Payable</span>
                                    </div>
                                    <div className="text-xl font-bold tracking-tight text-foreground tabular-nums">
                                        ₹{p.payout.toLocaleString()}
                                    </div>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>

                {payouts.length === 0 && !loading && (
                    <div className="flex flex-col items-center justify-center h-64 text-center space-y-3">
                        <div className="h-16 w-16 rounded-full bg-secondary/30 flex items-center justify-center">
                            <Filter className="w-6 h-6 text-muted-foreground/50" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-foreground">No invoices found</p>
                            <p className="text-xs text-muted-foreground">Adjust filters or search for another brand.</p>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => { setFilterBrand(""); setFilterDate(""); }}>
                            Clear Filters
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
};
