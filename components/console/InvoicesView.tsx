import React, { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Download, Filter, FileText, Calendar, Search } from "lucide-react";
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
        <div className="flex flex-col gap-6 h-[calc(100vh-140px)]">
            <div className="flex items-center justify-between shrink-0">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Financials & Invoices</h1>
                    <p className="text-sm text-muted-foreground">Reconcile payouts and download reports.</p>
                </div>
                <Button onClick={handleExport} className="bg-primary shadow-lg shadow-primary/20">
                    <Download className="w-4 h-4 mr-2" /> Export CSV
                </Button>
            </div>

            {/* Filter Bar */}
            <Card className="shrink-0 p-3 flex flex-wrap gap-4 items-center bg-card border-border/60">
                <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium">
                    <Filter className="w-4 h-4" />
                    Filters:
                </div>
                <div className="flex items-center gap-2 bg-secondary/30 p-1 rounded-lg border border-border">
                    <Search className="w-3.5 h-3.5 ml-2 text-muted-foreground" />
                    <input
                        placeholder="Filter by Brand"
                        value={filterBrand}
                        onChange={e => setFilterBrand(e.target.value)}
                        className="bg-transparent border-none text-sm focus:ring-0 outline-none h-8 w-32"
                    />
                </div>
                <div className="flex items-center gap-2 bg-secondary/30 p-1 rounded-lg border border-border">
                    <Calendar className="w-3.5 h-3.5 ml-2 text-muted-foreground" />
                    <input
                        type="date"
                        value={filterDate}
                        onChange={e => setFilterDate(e.target.value)}
                        className="bg-transparent border-none text-sm focus:ring-0 outline-none h-8"
                    />
                </div>
                {(filterBrand || filterDate) && (
                    <Button variant="ghost" size="sm" onClick={() => { setFilterBrand(""); setFilterDate(""); }} className="text-xs h-8">
                        Clear
                    </Button>
                )}
            </Card>

            <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 pb-2">
                {loading && <div className="text-muted-foreground text-sm col-span-full text-center py-10">Calculating payouts...</div>}

                {/* Payout Cards */}
                {payouts.map((p) => (
                    <Card key={p.brand} className="flex flex-col p-4 gap-4 hover:shadow-md transition-all border-l-4 border-l-primary/50">
                        <div className="flex justify-between items-start">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center font-bold text-muted-foreground">
                                    {p.brand.substring(0, 2).toUpperCase()}
                                </div>
                                <div className="space-y-0.5">
                                    <h3 className="font-bold text-base">{p.brand}</h3>
                                    <p className="text-xs text-muted-foreground">{p.count} transactions</p>
                                </div>
                            </div>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground"><FileText className="w-4 h-4" /></Button>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-sm border-t border-border pt-4">
                            <div className="space-y-1">
                                <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Gross Revenue</span>
                                <div className="font-semibold text-foreground">₹{p.total.toLocaleString()}</div>
                            </div>
                            <div className="space-y-1 text-right">
                                <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Commission</span>
                                <div className="font-semibold text-emerald-500">₹{p.comm.toLocaleString()}</div>
                            </div>
                        </div>

                        <div className="bg-secondary/30 rounded-lg p-3 flex justify-between items-center">
                            <span className="text-xs font-medium">Net Payout</span>
                            <span className="text-lg font-bold">₹{p.payout.toLocaleString()}</span>
                        </div>
                    </Card>
                ))}

                {payouts.length === 0 && !loading && (
                    <div className="col-span-full flex flex-col items-center justify-center text-muted-foreground h-40">
                        <p>No records found matching your filters.</p>
                    </div>
                )}
            </div>
        </div>
    );
};
