import React, { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AppAlertDialog } from "@/components/ui/app-dialogs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Download, Filter, FileText, Calendar, Search, CheckCircle2, Mail, Send, X } from "lucide-react";
import { collection, query, orderBy, onSnapshot, getDocs, where } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface InvoicesViewProps {
    store: string;
}

export const InvoicesView: React.FC<InvoicesViewProps> = ({ store }) => {
    const [sales, setSales] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Filters
    const [filterBrand, setFilterBrand] = useState("");
    const [filterMonth, setFilterMonth] = useState(""); // YYYY-MM
    const [filterDate, setFilterDate] = useState(""); // YYYY-MM-DD

    // Preview Modal State
    const [emailPreview, setEmailPreview] = useState<any>(null);
    const [alertConfig, setAlertConfig] = useState({ open: false, title: "", desc: "" });

    React.useEffect(() => {
        const q = query(
            collection(db, "sales"),
            where("store", "==", store),
            orderBy("createdAt", "desc")
        );
        const unsub = onSnapshot(q, snap => {
            setSales(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            setLoading(false);
        });
        return () => unsub();
    }, [store]);

    const filtered = useMemo(() => {
        return sales.filter(s => {
            // 1. Store Filter (Strict or Legacy)
            if (store && s.store && s.store !== store) return false;
            // Legacy items handling: if !s.store, we decide. For now, let's include them or exclude based on preference.
            // Let's INCLUDE legacy items in both stores for visibility during transition.

            // 2. Brand Filter
            if (filterBrand && !s.brand.toLowerCase().includes(filterBrand.toLowerCase())) return false;

            // 3. Date/Month Filter
            const sDateObj = s.createdAt?.toDate ? s.createdAt.toDate() : new Date(s.createdAt);

            if (filterDate) {
                // Exact Date Match
                const sDateStr = sDateObj.toISOString().slice(0, 10);
                if (sDateStr !== filterDate) return false;
            } else if (filterMonth) {
                // Month Match
                const sMonthStr = sDateObj.toISOString().slice(0, 7);
                if (sMonthStr !== filterMonth) return false;
            }
            return true;
        });
    }, [sales, filterBrand, filterMonth, filterDate, store]);

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
        const header = "Date,Brand,Item,Customer,Amount,Commission,Payout,Store\n";
        const rows = filtered.map(s => {
            const date = s.createdAt?.toDate ? s.createdAt.toDate().toLocaleDateString() : "-";
            return `${date},${s.brand},${s.item},${s.customer?.name || "-"},${s.amount},${s.commission},${s.payoutAmount},${s.store || "N/A"}`;
        }).join("\n");
        const blob = new Blob([header + rows], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Invoices_${store}_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
    };

    const handleEmailInvoice = async (brand: string, data: any) => {
        // 1. Fetch Brand email dynamically
        let brandEmail = "somesh.topports@gmail.com";
        try {
            const brandsQuery = query(collection(db, "brands"), where("name", "==", brand));
            const querySnapshot = await getDocs(brandsQuery);
            if (!querySnapshot.empty) {
                const brandData = querySnapshot.docs[0].data();
                if (brandData.email) {
                    brandEmail = brandData.email;
                }
            }
        } catch (err) {
            console.error("Error fetching brand email:", err);
        }

        // 2. Open Preview
        // 2. Open Preview
        const timeLabel = filterDate ? `Date: ${filterDate}` : (filterMonth ? `Month: ${filterMonth}` : "All Time");

        // Recalculate context specific to this filtered view to be safe
        const specificPayout = data.payout || 0;
        const specificTotal = data.total || 0;

        // Generate Rows HTML for the list of items
        const rowsHtml = filtered
            .filter(s => s.brand === brand) // Ensure we only dump rows for this brand
            .map(s => `
              <tr>
                <td>
                    <div style="font-weight:bold;">${s.item}</div>
                    <div style="font-size:12px; color:#666;">ID: ${s.id?.slice(-6) || 'N/A'}</div>
                </td>
                <td style="text-align:center;">${s.quantity || 1}</td>
                <td style="text-align:right;">₹${s.amount}</td>
              </tr>
            `).join("");



        setEmailPreview({
            ui_to_name: brand,
            ui_to_email: brandEmail,
            ui_message: `Invoice Report (${store})\nPeriod: ${timeLabel}`,
            ui_details: `Total Sales Volume: ₹${specificTotal.toLocaleString()}\nCommission Deducted: ₹${data.comm.toLocaleString()}\n\nNET PAYOUT AMOUNT: ₹${specificPayout.toLocaleString()}`,

            emailParams: {
                to_email: brandEmail,
                to_name: brand,
                status: "CONFIRMED",
                invoice_date: new Date().toLocaleDateString('en-IN'),
                seller_name: "Street Junkies India",
                seller_address_line1: "New Delhi – 110048",
                seller_address_line2: "India",
                seller_gst: "07ABMCS5480Q1ZD",
                brand_name: brand,
                invoice_period: timeLabel,
                items_rows: rowsHtml,
                total_amount: specificTotal.toLocaleString(),
                commission_percent: "20",
                commission_amount: data.comm.toLocaleString(),
                payout_amount: specificPayout.toLocaleString(),
                signatory_name: "Admin",
                signatory_title: "Street Junkies Team"
            }
        });
    };

    return (
        <div className="flex flex-col h-[calc(100vh-140px)] animate-in fade-in duration-500 gap-6 relative">

            {/* Header & Toolbar */}
            <div className="flex flex-col gap-4 shrink-0">
                <div className="flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-2xl font-bold tracking-tight text-foreground">Invoices</h1>
                            <Badge variant="outline" className="text-xs bg-background">{store}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">Manage and export your financial statements.</p>
                    </div>
                    <Button onClick={handleExport} size="sm" className="bg-primary text-primary-foreground shadow-lg shadow-primary/20 rounded-full px-4 text-xs font-semibold h-9">
                        <Download className="w-3.5 h-3.5 mr-2" />
                        Export CSV
                    </Button>
                </div>

                {/* Minimalist Filter Bar */}
                <div className="flex flex-col md:flex-row items-start md:items-center gap-3">
                    <div className="relative group w-full max-w-xs">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                        <Input
                            placeholder="Filter by brand..."
                            value={filterBrand}
                            onChange={e => setFilterBrand(e.target.value)}
                            className="pl-9 h-9 rounded-xl bg-secondary/50 border-transparent focus:bg-background focus:border-border transition-all text-sm placeholder:text-muted-foreground/50"
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Month Picker */}
                        <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground z-10" />
                            <input
                                type="month"
                                value={filterMonth}
                                onChange={e => { setFilterMonth(e.target.value); setFilterDate(""); }} // Clear date if month selected
                                className="pl-9 pr-3 h-9 rounded-xl bg-secondary/50 border-none text-sm focus:ring-2 focus:ring-ring text-muted-foreground focus:text-foreground transition-all outline-none cursor-pointer w-36"
                            />
                        </div>
                        <span className="text-xs text-muted-foreground font-medium">OR</span>
                        {/* Date Picker */}
                        <div className="relative">
                            <input
                                type="date"
                                value={filterDate}
                                onChange={e => { setFilterDate(e.target.value); setFilterMonth(""); }} // Clear month if date selected
                                className="pl-3 pr-3 h-9 rounded-xl bg-secondary/50 border-none text-sm focus:ring-2 focus:ring-ring text-muted-foreground focus:text-foreground transition-all outline-none cursor-pointer w-36"
                            />
                        </div>
                    </div>

                    {(filterBrand || filterMonth || filterDate) && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => { setFilterBrand(""); setFilterMonth(""); setFilterDate(""); }}
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
                                <Button
                                    onClick={() => handleEmailInvoice(p.brand, p)}
                                    size="icon"
                                    variant="ghost"
                                    className="h-8 w-8 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-full transition-colors"
                                    title="Email Monthly Invoice"
                                >
                                    <Mail className="w-4 h-4" />
                                </Button>
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
                            <p className="text-sm font-medium text-foreground">No invoices found for {store}</p>
                            <p className="text-xs text-muted-foreground">Adjust filters or try a different date.</p>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => { setFilterBrand(""); setFilterMonth(""); setFilterDate(""); }}>
                            Clear Filters
                        </Button>
                    </div>
                )}
            </div>

            {/* Email Preview Modal Overlay */}
            <Dialog open={!!emailPreview} onOpenChange={(open) => !open && setEmailPreview(null)}>
                <DialogContent className="sm:max-w-sm p-0 gap-0 overflow-hidden">
                    <div className="p-4 border-b border-border bg-muted/30">
                        <h3 className="font-semibold text-sm">Confirm Email Send</h3>
                    </div>
                    <div className="p-4 space-y-3 text-sm">
                        <div className="grid grid-cols-[60px_1fr] gap-2">
                            <span className="text-muted-foreground text-right">To:</span>
                            <span className="font-medium">{emailPreview?.ui_to_name}</span>

                            <span className="text-muted-foreground text-right">Email:</span>
                            <span className="font-mono text-xs">{emailPreview?.ui_to_email}</span>

                            <span className="text-muted-foreground text-right">Subject:</span>
                            <span className="truncate">Invoice for {emailPreview?.ui_to_name}...</span>
                        </div>
                        <div className="bg-secondary/20 p-3 rounded-lg text-xs font-mono text-muted-foreground whitespace-pre-wrap border border-border/50">
                            {emailPreview?.ui_message}
                            {"\n\n"}
                            {emailPreview?.ui_details}
                        </div>
                    </div>
                    <div className="p-3 bg-muted/30 border-t border-border flex gap-2 justify-end">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEmailPreview(null)}
                            className="h-8"
                        >
                            Cancel
                        </Button>
                        <Button
                            size="sm"
                            className="h-8 bg-blue-600 hover:bg-blue-700 text-white"
                            onClick={async () => {
                                try {
                                    const { sendInvoiceEmail } = await import("@/lib/emailService");
                                    await sendInvoiceEmail(emailPreview.emailParams);
                                    setAlertConfig({ open: true, title: "Email Sent", desc: `Invoice sent successfully to ${emailPreview?.ui_to_email}!` });
                                    setEmailPreview(null);
                                } catch (e) {
                                    console.error(e);
                                    setAlertConfig({ open: true, title: "Error", desc: "Failed to send. Please check configuration." });
                                }
                            }}
                        >
                            Confirm <Send className="w-3 h-3 ml-2" />
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            <AppAlertDialog
                open={alertConfig.open}
                onOpenChange={(open) => setAlertConfig(prev => ({ ...prev, open }))}
                title={alertConfig.title}
                description={alertConfig.desc}
            />
        </div>
    );
};
