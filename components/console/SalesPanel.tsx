import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    Camera,
    Search,
    ChevronRight,
    ShoppingBag,
    User,
    MapPin,
    CheckCircle2,
    Send
} from "lucide-react";
import { collection, query, onSnapshot, addDoc, doc, updateDoc, increment, getDocs, where } from "firebase/firestore";

import { db } from "@/lib/firebase";

import { Html5Qrcode } from "html5-qrcode";
import { AppAlertDialog } from "@/components/ui/app-dialogs";

interface SalesPanelProps {
    store: string;
}

export const SalesPanel: React.FC<SalesPanelProps> = ({ store }) => {
    const [step, setStep] = useState<"search" | "details" | "review" | "success">("search");
    const [loading, setLoading] = useState(true);
    const [inventoryItems, setInventoryItems] = useState<any[]>([]);

    // Preview Modal State
    const [emailPreview, setEmailPreview] = useState<any>(null);

    // Form State
    const [manualId, setManualId] = useState("");
    const [selectedItem, setSelectedItem] = useState<any>(null);
    const [isScanning, setIsScanning] = useState(false);

    // Transaction State
    const [sellingPrice, setSellingPrice] = useState("");
    const [qty, setQty] = useState("1");
    const [customerName, setCustomerName] = useState("");
    const [customerPhone, setCustomerPhone] = useState("");

    const [customerAddr, setCustomerAddr] = useState("");

    // Alert State
    const [alertConfig, setAlertConfig] = useState({ open: false, title: "", desc: "" });

    useEffect(() => {
        const q = query(
            collection(db, "inventory"),
            where("store", "==", store)
        );
        const unsub = onSnapshot(q, snap => {
            // Optional: Filter out archived items
            const activeItems = snap.docs
                .map(d => ({ id: d.id, ...d.data() } as any))
                .filter(item => item.status !== 'archived');
            setInventoryItems(activeItems);
            setLoading(false);
        });
        return () => unsub();
    }, [store]);

    useEffect(() => {
        let html5QrCode: Html5Qrcode | undefined;

        if (isScanning && step === 'search') {
            // Small delay to ensure DOM element exists
            const timer = setTimeout(() => {
                html5QrCode = new Html5Qrcode("reader");
                const config = { fps: 10, qrbox: { width: 250, height: 250 } };

                html5QrCode.start(
                    { facingMode: "environment" },
                    config,
                    (decodedText) => {
                        const found = inventoryItems.find(i => i.id === decodedText);
                        if (found) {
                            html5QrCode?.stop().then(() => html5QrCode?.clear()).catch(console.error);
                            setIsScanning(false);
                            selectItem(found);
                        } else {
                            // Beep or visual feedback could go here
                            console.log("Scanned code not found:", decodedText);
                            // Don't stop scanning immediately on fail, allows retry
                            // But for immediate feedback, maybe alert? 
                            // Let's stop to prevent endless alerting
                            html5QrCode?.stop().then(() => html5QrCode?.clear()).catch(console.error);
                            setAlertConfig({ open: true, title: "Scan Error", desc: "Item not found in inventory." });
                            setIsScanning(false);
                        }
                    },
                    (errorMessage) => {
                        // ignore frame errors
                    }
                ).catch(err => {
                    console.error("Error starting scanner", err);
                    setAlertConfig({ open: true, title: "Camera Error", desc: "Could not start camera. Please ensure permissions are granted." });
                    setIsScanning(false);
                });
            }, 100);

            return () => {
                clearTimeout(timer);
                if (html5QrCode && html5QrCode.isScanning) {
                    html5QrCode.stop().then(() => html5QrCode?.clear()).catch(console.error);
                }
            };
        }
    }, [isScanning, step, inventoryItems]);

    const handleSearch = () => {
        const found = inventoryItems.find(i => i.id === manualId);
        if (found) {
            selectItem(found);
        } else {
            setAlertConfig({ open: true, title: "Search Error", desc: "Item ID not found. Please check and try again." });
        }
    };

    const selectItem = (item: any) => {
        setSelectedItem(item);
        setSellingPrice(item.price?.toString() || "");
        setStep("details");
    };

    const submitSale = async () => {
        if (!selectedItem) return;
        try {
            const q = parseInt(qty) || 1;
            const finalPrice = parseFloat(sellingPrice) || 0;
            const total = finalPrice * q;
            const commissionRate = (selectedItem.brandComm || 20) / 100;
            const comm = total * commissionRate;
            const payout = total - comm;

            await addDoc(collection(db, "sales"), {
                item: selectedItem.name,
                itemId: selectedItem.id,
                brand: selectedItem.brand,
                size: selectedItem.size || "Free",
                customer: { name: customerName, phone: customerPhone, address: customerAddr },
                quantity: q,
                amount: total,
                unitPrice: finalPrice,
                commission: comm,
                payoutAmount: payout,
                createdAt: new Date(),
                status: "confirmed",
                store: store
            });

            await updateDoc(doc(db, "inventory", selectedItem.id), {
                stock: increment(-q)
            });

            setStep("success");
        } catch (e) {
            console.error(e);
            alert("Transaction Failure");
        }
    }

    const reset = () => {
        setManualId("");
        setSelectedItem(null);
        setCustomerName("");
        setCustomerPhone("");
        setCustomerAddr("");
        setQty("1");
        setStep("search");
        setIsScanning(false);
    }

    return (
        <div className="max-w-xl mx-auto py-6 animate-in slide-in-from-bottom-8 duration-500 relative">

            {/* Header Stepper */}
            <div className="flex items-center justify-between mb-8 px-2">
                <div>
                    <h1 className="text-xl font-bold tracking-tight">New Sale</h1>
                    <p className="text-xs text-muted-foreground">Store: {store}</p>
                </div>
                <div className="flex gap-2">
                    {['search', 'details', 'review', 'success'].map((s, i) => (
                        <div key={s} className={`h-2 w-2 rounded-full transition-all ${step === s ? "bg-primary w-4" : "bg-secondary"}`} />
                    ))}
                </div>
            </div>

            <Card className="min-h-[400px] border-border/50 bg-card p-6 shadow-xl shadow-black/5 flex flex-col relative overflow-hidden">

                {/* Step 1: Search */}
                {step === "search" && (
                    <div className="flex flex-col gap-6 animate-in fade-in duration-300">
                        <div className="relative overflow-hidden min-h-[250px] rounded-2xl bg-secondary/10 border-2 border-dashed border-border flex flex-col items-center justify-center transition-colors">
                            {!isScanning ? (
                                <div
                                    className="flex flex-col items-center gap-4 cursor-pointer p-8 w-full h-full hover:bg-secondary/20 transition-colors"
                                    onClick={() => setIsScanning(true)}
                                >
                                    <div className="h-16 w-16 bg-background rounded-full flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                                        <Camera className="w-8 h-8 text-primary" />
                                    </div>
                                    <div className="space-y-1 text-center">
                                        <h3 className="font-semibold text-sm">Scan QR Code</h3>
                                        <p className="text-[10px] text-muted-foreground max-w-[200px] mx-auto">Tap to start camera scanner</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="w-full p-4 flex flex-col items-center">
                                    <div id="reader" className="w-full max-w-[300px] overflow-hidden rounded-lg"></div>
                                    <Button
                                        variant="destructive"
                                        size="sm"
                                        onClick={() => setIsScanning(false)}
                                        className="mt-4"
                                    >
                                        Stop Scanner
                                    </Button>
                                </div>
                            )}
                        </div>

                        <div className="relative">
                            <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
                            <div className="relative flex justify-center text-[10px] uppercase font-bold text-muted-foreground"><span className="bg-card px-2">Or enter ID</span></div>
                        </div>

                        <div className="flex gap-2">
                            <Input
                                placeholder="e.g. INV-2023-001"
                                className="bg-secondary/30 text-center font-mono placeholder:font-sans"
                                value={manualId}
                                onChange={(e) => setManualId(e.target.value)}
                            />
                            <Button onClick={handleSearch} className="bg-primary text-primary-foreground">
                                <Search className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                )}

                {/* Step 2: Details */}
                {step === "details" && selectedItem && (
                    <div className="flex flex-col gap-5 animate-in slide-in-from-right-8 duration-300">
                        <div className="flex items-start gap-4 p-4 rounded-xl bg-secondary/30 border border-border/50">
                            <div className="h-12 w-12 rounded-lg bg-white flex items-center justify-center border border-border">
                                <ShoppingBag className="w-6 h-6 text-foreground" />
                            </div>
                            <div>
                                <h3 className="font-bold text-base">{selectedItem.name}</h3>
                                <div className="flex gap-2 mt-1">
                                    <Badge variant="outline" className="text-[10px] bg-background">{selectedItem.brand}</Badge>
                                    <Badge variant="outline" className="text-[10px] bg-background">{selectedItem.size}</Badge>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Price (₹)</label>
                                <Input
                                    type="number"
                                    value={sellingPrice}
                                    onChange={(e) => setSellingPrice(e.target.value)}
                                    className="font-mono"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Quantity</label>
                                <Input
                                    type="number"
                                    value={qty}
                                    onChange={(e) => setQty(e.target.value)}
                                    className="font-mono"
                                />
                            </div>
                        </div>

                        <div className="space-y-3 pt-2">
                            <div className="flex items-center gap-2 text-primary text-xs font-semibold">
                                <User className="w-3.5 h-3.5" />
                                Customer Details
                            </div>
                            <Input placeholder="Name (Required)" value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="bg-secondary/20" />
                            <Input placeholder="Phone Number (Required)" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} className="bg-secondary/20" />
                            <Input placeholder="Address (Optional)" value={customerAddr} onChange={(e) => setCustomerAddr(e.target.value)} className="bg-secondary/20" />
                        </div>

                        <div className="mt-auto flex gap-3 pt-4">
                            <Button variant="outline" className="flex-1" onClick={() => setStep("search")}>Cancel</Button>
                            <Button
                                className="flex-1"
                                onClick={() => {
                                    if (customerName && customerPhone) setStep("review")
                                    else setAlertConfig({ open: true, title: "Missing Information", desc: "Please enter basic customer details (Name & Phone)" })
                                }}
                            >
                                Review
                                <ChevronRight className="w-4 h-4 ml-2" />
                            </Button>
                        </div>
                    </div>
                )}

                {/* Step 3: Review */}
                {step === "review" && selectedItem && (
                    <div className="flex flex-col gap-6 animate-in slide-in-from-right-8 duration-300 h-full">
                        <div className="text-center space-y-1">
                            <h3 className="text-lg font-bold">Confirm Transaction</h3>
                            <p className="text-xs text-muted-foreground">Review final details before charging</p>
                        </div>

                        <div className="bg-secondary/30 rounded-2xl p-5 space-y-4 text-sm border border-border/50">
                            <div className="flex justify-between items-center pb-3 border-b border-border/50">
                                <span className="text-muted-foreground">Product</span>
                                <span className="font-semibold text-right">{selectedItem.name}<br /><span className="text-[10px] font-normal">{selectedItem.brand}</span></span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">Price x Qty</span>
                                <span className="font-mono">₹{sellingPrice} x {qty}</span>
                            </div>
                            <div className="flex justify-between items-center pt-2 border-t border-border font-bold text-base">
                                <span>Total</span>
                                <span className="text-primary">₹{(parseFloat(sellingPrice) * parseInt(qty)).toFixed(2)}</span>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 p-3 rounded-xl bg-blue-500/10 text-blue-600 text-xs">
                            <MapPin className="w-4 h-4 shrink-0" />
                            <div className="truncate">
                                <span className="font-bold">{customerName}:</span> {customerPhone}
                            </div>
                        </div>

                        <div className="mt-auto flex gap-3">
                            <Button variant="ghost" onClick={() => setStep("details")}>Back</Button>
                            <Button className="flex-1 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20" onClick={submitSale}>
                                Confirm Payment
                            </Button>
                        </div>
                    </div>
                )}

                {/* Step 4: Success */}
                {step === "success" && (
                    <div className="flex flex-col items-center justify-center flex-1 gap-6 animate-in zoom-in duration-300">
                        <div className="h-20 w-20 bg-green-500 rounded-full flex items-center justify-center text-white shadow-xl shadow-green-500/40 ring-4 ring-green-500/20">
                            <CheckCircle2 className="w-10 h-10" />
                        </div>
                        <div className="text-center space-y-2">
                            <h2 className="text-2xl font-bold">Payment Success</h2>
                            <p className="text-muted-foreground">Transaction ID: #{Math.floor(Math.random() * 10000)}</p>
                        </div>

                        <div className="flex flex-col gap-3 w-full max-w-[240px]">
                            <Button
                                onClick={async () => {
                                    // 1. Fetch Brand details to get the REAL email
                                    let brandEmail = "somesh.topports@gmail.com"; // default fallback
                                    try {
                                        const brandsQuery = query(collection(db, "brands"), where("name", "==", selectedItem?.brand || ""));
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

                                    // 2. Set Preview Data explicitly using the CURRENT transaction state
                                    const totalAmount = parseFloat(sellingPrice) * parseInt(qty);
                                    const payoutAmount = (totalAmount * 0.8).toFixed(2);
                                    const itemName = selectedItem?.name || "Unknown Item";

                                    // 3. Prepare Data for New V3 Template
                                    const items = [{
                                        desc: `${itemName} (${selectedItem?.brand} - ${selectedItem?.size || 'OS'})`,
                                        qty: parseInt(qty),
                                        price: parseFloat(sellingPrice),
                                        amount: totalAmount
                                    }];

                                    setEmailPreview({
                                        ui_to_name: selectedItem?.brand || "Brand Partner",
                                        ui_to_email: brandEmail,
                                        ui_message: `New Sale Confirmed: ${itemName}`,
                                        ui_details: `Item: ${itemName}\nQty: ${qty}\nTotal: ₹${totalAmount}\nPayout: ₹${payoutAmount}`,

                                        emailParams: {
                                            to_email: brandEmail,
                                            to_name: selectedItem?.brand || "Partner",
                                            status: "CONFIRMED",
                                            invoice_date: new Date().toLocaleDateString('en-IN'),
                                            invoice_period: new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
                                            items: items,
                                            totals: {
                                                total: totalAmount,
                                                comm: totalAmount * 0.2,
                                                payout: parseFloat(payoutAmount)
                                            }
                                        }
                                    });
                                }}
                                className="w-full bg-white text-black border border-gray-200 hover:bg-gray-50 shadow-sm"
                            >
                                <div className="mr-2 flex items-center justify-center h-4 w-4 rounded bg-red-500 text-white text-[8px] font-bold">M</div>
                                Email Invoice to Brand
                            </Button>

                            <Button onClick={reset} className="w-full" variant="outline">
                                Start New Sale
                            </Button>
                        </div>
                    </div>
                )}

                {/* Email Preview Modal */}
                {emailPreview && (
                    <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm animate-in fade-in duration-200 p-4">
                        <div className="w-full max-w-sm bg-card border border-border rounded-xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
                            <div className="p-4 border-b border-border bg-muted/30">
                                <h3 className="font-semibold text-sm">Confirm Email Send</h3>
                            </div>
                            <div className="p-4 space-y-3 text-sm">
                                <div className="grid grid-cols-[60px_1fr] gap-2">
                                    <span className="text-muted-foreground text-right">To:</span>
                                    <span className="font-medium">{emailPreview.ui_to_name}</span>

                                    <span className="text-muted-foreground text-right">Email:</span>
                                    <span className="font-mono text-xs">{emailPreview.ui_to_email}</span>

                                    <span className="text-muted-foreground text-right">Subject:</span>
                                    <span className="truncate">Invoice for {emailPreview.ui_to_name}...</span>
                                </div>
                                <div className="bg-secondary/20 p-3 rounded-lg text-xs font-mono text-muted-foreground whitespace-pre-wrap border border-border/50">
                                    {emailPreview.ui_message}
                                    {"\n\n"}
                                    {emailPreview.ui_details}
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
                                            setAlertConfig({ open: true, title: "Email Sent", desc: `Invoice sent successfully to ${emailPreview.ui_to_email}!` });
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
                        </div>
                    </div>
                )}

            </Card>


            <AppAlertDialog
                open={alertConfig.open}
                onOpenChange={(open) => setAlertConfig(prev => ({ ...prev, open }))}
                title={alertConfig.title}
                description={alertConfig.desc}
            />
        </div>
    );
};
