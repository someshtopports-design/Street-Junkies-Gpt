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
    CheckCircle2
} from "lucide-react";
import { collection, query, onSnapshot, addDoc, doc, updateDoc, increment, getDocs, where } from "firebase/firestore";
import { db } from "@/lib/firebase";

export const SalesPanel: React.FC = () => {
    const [step, setStep] = useState<"search" | "details" | "review" | "success">("search");
    const [loading, setLoading] = useState(true);
    const [inventoryItems, setInventoryItems] = useState<any[]>([]);

    // Form State
    const [manualId, setManualId] = useState("");
    const [selectedItem, setSelectedItem] = useState<any>(null);

    // Transaction State
    const [sellingPrice, setSellingPrice] = useState("");
    const [qty, setQty] = useState("1");
    const [customerName, setCustomerName] = useState("");
    const [customerPhone, setCustomerPhone] = useState("");
    const [customerAddr, setCustomerAddr] = useState("");

    useEffect(() => {
        const q = query(collection(db, "inventory"));
        const unsub = onSnapshot(q, snap => {
            setInventoryItems(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            setLoading(false);
        });
        return () => unsub();
    }, []);

    const handleSearch = () => {
        const found = inventoryItems.find(i => i.id === manualId);
        if (found) {
            selectItem(found);
        } else {
            alert("Item ID not found. Please check and try again.");
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
                status: "confirmed"
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
    }

    return (
        <div className="max-w-xl mx-auto py-6 animate-in slide-in-from-bottom-8 duration-500">

            {/* Header Stepper */}
            <div className="flex items-center justify-between mb-8 px-2">
                <div>
                    <h1 className="text-xl font-bold tracking-tight">New Sale</h1>
                    <p className="text-xs text-muted-foreground">Process a new transaction</p>
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
                        <div className="text-center p-8 border-2 border-dashed border-border rounded-2xl bg-secondary/10 flex flex-col items-center gap-4 hover:bg-secondary/20 transition-colors cursor-pointer group">
                            <div className="h-16 w-16 bg-background rounded-full flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                                <Camera className="w-8 h-8 text-primary" />
                            </div>
                            <div className="space-y-1">
                                <h3 className="font-semibold text-sm">Scan QR Code</h3>
                                <p className="text-[10px] text-muted-foreground max-w-[200px] mx-auto">Point camera at the item tag to instantly fetch details.</p>
                            </div>
                            {/* Mock Scanner Select */}
                            <select
                                className="text-xs border max-w-[200px] opacity-0 absolute inset-0 cursor-pointer"
                                onChange={(e) => {
                                    const found = inventoryItems.find(i => i.id === e.target.value);
                                    if (found) selectItem(found);
                                }}
                            >
                                <option value="">Mock Scan...</option>
                                {inventoryItems.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                            </select>
                            <Badge variant="secondary" className="text-[9px]">MOCK MODE: CLICK TO SELECT ITEM</Badge>
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
                                    else alert("Please enter basic customer details")
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
                                    try {
                                        const { sendInvoiceEmail } = await import("@/lib/emailService");

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

                                        await sendInvoiceEmail({
                                            to_name: selectedItem?.brand || "Brand Partner",
                                            to_email: brandEmail,
                                            message: `New Sale Confirmed: ${selectedItem?.name}`,
                                            invoice_details: `Item: ${selectedItem?.name}\nQty: ${qty}\nTotal: ₹${parseFloat(sellingPrice) * parseInt(qty)}\nPayout: ₹${((parseFloat(sellingPrice) * parseInt(qty)) * 0.8).toFixed(2)}`
                                        });
                                        alert(`Invoice sent to ${selectedItem?.brand || 'Brand'} at ${brandEmail}!`);
                                    } catch (error) {
                                        console.error(error);
                                        alert("Failed to send email. Check configuration.");
                                    }
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

            </Card>
        </div>
    );
};
