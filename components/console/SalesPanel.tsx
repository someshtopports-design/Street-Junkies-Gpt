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

    // Form State with Session Persistence
    const [cart, setCart] = useState<any[]>(() => {
        if (typeof window !== "undefined") {
            const saved = sessionStorage.getItem("sj_cart_temp");
            return saved ? JSON.parse(saved) : [];
        }
        return [];
    });

    // Transaction State
    const [customerName, setCustomerName] = useState(() => {
        if (typeof window !== "undefined") return sessionStorage.getItem("sj_cust_name") || "";
        return "";
    });
    const [customerPhone, setCustomerPhone] = useState(() => {
        if (typeof window !== "undefined") return sessionStorage.getItem("sj_cust_phone") || "";
        return "";
    });

    // Effect to persist state
    useEffect(() => {
        sessionStorage.setItem("sj_cart_temp", JSON.stringify(cart));
        sessionStorage.setItem("sj_cust_name", customerName);
        sessionStorage.setItem("sj_cust_phone", customerPhone);
    }, [cart, customerName, customerPhone]);

    const [customerAddr, setCustomerAddr] = useState("");

    // Alert State
    const [alertConfig, setAlertConfig] = useState({ open: false, title: "", desc: "" });

    // Form State
    const [manualId, setManualId] = useState("");
    const [isScanning, setIsScanning] = useState(false);


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
                            addItemToCart(found);
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
            addItemToCart(found);
            setManualId("");
        } else {
            setAlertConfig({ open: true, title: "Search Error", desc: "Item ID not found." });
        }
    };

    const addItemToCart = (item: any) => {
        setCart(prev => {
            const existing = prev.find(p => p.id === item.id);
            if (existing) {
                return prev.map(p => p.id === item.id ? { ...p, qty: p.qty + 1 } : p);
            }
            return [...prev, { ...item, qty: 1, sellingPrice: item.price || 0 }];
        });
        setAlertConfig({ open: true, title: "Item Added", desc: `${item.name} added to cart.` });
        // Stay on search step or go to details? Let's stay on search to allow rapid scanning
        // But maybe show a toast?
    };

    const removeFromCart = (id: string) => {
        setCart(prev => prev.filter(p => p.id !== id));
    };

    const updateCartItem = (id: string, field: 'qty' | 'sellingPrice', val: number) => {
        setCart(prev => prev.map(p => p.id === id ? { ...p, [field]: val } : p));
    };

    const proceedToDetails = () => {
        if (cart.length === 0) {
            setAlertConfig({ open: true, title: "Cart Empty", desc: "Please add items first." });
            return;
        }
        setStep("details");
    };

    const submitSale = async () => {
        if (cart.length === 0) return;
        try {
            const batchEmailItems: any[] = [];
            let totalSaleAmount = 0;
            let totalPayoutAmount = 0;

            // Process each item in cart
            for (const item of cart) {
                const q = item.qty || 1;
                const finalPrice = parseFloat(item.sellingPrice) || 0;
                const total = finalPrice * q;
                const commissionRate = (item.brandComm || 20) / 100;
                const comm = total * commissionRate;
                const payout = total - comm;

                totalSaleAmount += total;
                totalPayoutAmount += payout;

                // Add to Firestore
                await addDoc(collection(db, "sales"), {
                    item: item.name,
                    itemId: item.id,
                    brand: item.brand,
                    size: item.size || "Free",
                    customer: { name: customerName, phone: customerPhone, address: customerAddr },
                    quantity: q,
                    amount: total,
                    unitPrice: finalPrice,
                    commission: comm,
                    payoutAmount: payout,
                    store: store,
                    date: new Date().toISOString(),
                    timestamp: Date.now()
                });

                // Update Inventory (Decrease Stock)
                // Note: Logic depends on how you handle stock. Assuming "qty" field in inventory.
                // If unique items, maybe mark status='sold'.
                // For now, decrement stock if available.
                if (item.stock && item.stock > 0) {
                    const itemRef = doc(db, "inventory", item.id);
                    await updateDoc(itemRef, {
                        stock: increment(-q)
                    });
                }

                // Prepare for Email
                batchEmailItems.push({
                    desc: `${item.name} (${item.brand} - ${item.size || 'OS'})`,
                    qty: q,
                    price: finalPrice,
                    amount: total,
                    brand: item.brand,
                    brandEmail: item.brandEmail // Assuming brandEmail is on the item
                });
            }

            // Send Email (Grouped by Brand if possible, or just send one to admin/first brand?)
            // For simplicity, let's send to the first item's brand or a gathered list.
            // Requirement was specific brand. If mixed brands, we might need multiple emails.
            // Let's assume mostly 1 brand per transaction or send distinct emails.
            // For MVP: Send 1 email using the first item's brand info as context, or if mixed, warn user.

            // Let's Group items by Brand Email to send correct summaries
            const itemsByEmail: Record<string, any[]> = {};
            batchEmailItems.forEach(i => {
                const email = i.brandEmail || "unknown@brand.com"; // Fallback
                if (!itemsByEmail[email]) itemsByEmail[email] = [];
                itemsByEmail[email].push(i);
            });

            // Trigger Email Preview for the FIRST brand (or loop? but preview is modal)
            // If strictly needing email, let's just trigger for the first one for now or 
            // if user asks for specific brand. 
            // Let's take the first unique brand to show in preview.
            const uniqueEmails = Object.keys(itemsByEmail);
            if (uniqueEmails.length > 0) {
                const targetEmail = uniqueEmails[0];
                const brandItems = itemsByEmail[targetEmail];
                const brandName = brandItems[0].brand;

                const brandTotal = brandItems.reduce((acc, curr) => acc + curr.amount, 0);
                const brandPayout = brandItems.reduce((acc, curr) => acc + (curr.amount * 0.8), 0); // Approx 20% comm

                setEmailPreview({
                    ui_to_name: brandName,
                    ui_to_email: targetEmail,
                    ui_message: `Sale Confirmed (${brandItems.length} Items)`,
                    ui_details: `Total: ₹${brandTotal}\nPayout: ₹${brandPayout.toFixed(2)}`,
                    emailParams: {
                        to_email: targetEmail,
                        to_name: brandName,
                        status: "CONFIRMED",
                        invoice_date: new Date().toLocaleDateString('en-IN'),
                        invoice_period: new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
                        items: brandItems,
                        totals: {
                            total: brandTotal,
                            comm: brandTotal * 0.2,
                            payout: brandPayout
                        }
                    }
                });
            }

            setStep("success");
        } catch (error) {
            console.error(error);
            setAlertConfig({ open: true, title: "Error", desc: "Could not record sale. Check connection." });
        }
    };

    const reset = () => {
        setManualId("");
        setCart([]);
        setCustomerName("");
        setCustomerPhone("");
        setCustomerAddr("");
        setStep("search");
        setIsScanning(false);
        // Clear session storage
        sessionStorage.removeItem("sj_cart_temp");
        sessionStorage.removeItem("sj_cust_name");
        sessionStorage.removeItem("sj_cust_phone");
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
                        <div className="pt-4 border-t">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="font-semibold text-sm">Cart ({cart.length})</h3>
                                {cart.length > 0 && <Button variant="link" size="sm" onClick={proceedToDetails}>Next</Button>}
                            </div>
                            {cart.length === 0 ? (
                                <div className="text-center text-muted-foreground text-sm py-8">
                                    No items added yet.
                                </div>
                            ) : (
                                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                                    {cart.map((item, idx) => (
                                        <div key={idx} className="flex justify-between items-center p-2 bg-secondary/20 rounded border text-sm">
                                            <div className="truncate w-32 font-medium">{item.name}</div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-muted-foreground">x{item.qty}</span>
                                                <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => removeFromCart(item.id)}>
                                                    &times;
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                            {cart.length > 0 && (
                                <Button className="w-full mt-4" size="lg" onClick={proceedToDetails}>
                                    Proceed with {cart.length} Items <ChevronRight className="ml-2 w-4 h-4" />
                                </Button>
                            )}
                        </div>
                    </div>
                )}

                {/* Step 2: Details */}
                {step === "details" && (
                    <div className="flex flex-col gap-5 animate-in slide-in-from-right-8 duration-300">
                        <div className="space-y-4 max-h-[300px] overflow-y-auto">
                            {cart.map((item) => (
                                <div key={item.id} className="p-4 rounded-xl border border-border bg-card/50 space-y-3">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h3 className="font-bold text-lg leading-tight">{item.name}</h3>
                                            <p className="text-xs text-muted-foreground mt-1 font-mono uppercase tracking-wide">
                                                {item.brand} • {item.size || 'OS'}
                                            </p>
                                        </div>
                                        <Badge variant="secondary" className="font-mono">ID: {item.id.slice(-6)}</Badge>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5 item-group">
                                            <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider ml-1">Price (₹)</label>
                                            <Input
                                                type="number"
                                                className="h-9 font-mono bg-background/50"
                                                value={item.sellingPrice}
                                                onChange={(e) => updateCartItem(item.id, 'sellingPrice', parseFloat(e.target.value))}
                                            />
                                        </div>
                                        <div className="space-y-1.5 item-group">
                                            <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider ml-1">Qty</label>
                                            <Input
                                                type="number"
                                                className="h-9 font-mono bg-background/50"
                                                value={item.qty}
                                                onChange={(e) => updateCartItem(item.id, 'qty', parseInt(e.target.value))}
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="flex gap-2">
                            <Button variant="outline" className="w-full" onClick={() => setStep("search")}>
                                + Add More Items
                            </Button>
                        </div>

                        <div className="pt-2">
                            <h4 className="font-semibold text-sm mb-2">Customer Details (Optional)</h4>
                            <div className="space-y-3">
                                <div className="relative">
                                    <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input placeholder="Customer Name" className="pl-9" value={customerName} onChange={e => setCustomerName(e.target.value)} />
                                </div>
                                <div className="relative">
                                    <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input placeholder="Phone (e.g. 98765xxxxx)" className="pl-9" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} />
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3 pt-2">
                            <Button variant="outline" className="flex-1" onClick={() => setStep("search")}>Back</Button>
                            <Button className="flex-1 bg-primary text-primary-foreground shadow-lg shadow-primary/20" onClick={() => setStep("review")}>Next: Review</Button>
                        </div>
                    </div>
                )}

                {/* Step 3: Review */}
                {step === "review" && (
                    <div className="flex flex-col gap-6 animate-in slide-in-from-right-8 duration-300 h-full">
                        <div className="text-center space-y-1">
                            <h3 className="text-lg font-bold">Confirm Transaction</h3>
                            <p className="text-xs text-muted-foreground">Review final details before charging</p>
                        </div>

                        <div className="bg-secondary/30 rounded-2xl p-5 space-y-4 text-sm border border-border/50">
                            <div className="flex justify-between items-center pb-3 border-b border-border/50">
                                <span className="text-muted-foreground">Product</span>
                                <span className="font-semibold text-right">Multiple Items<br /><span className="text-[10px] font-normal">{cart.length} unique items</span></span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">Total Quantity</span>
                                <span className="font-mono">{cart.reduce((sum, i) => sum + i.qty, 0)}</span>
                            </div>
                            <div className="flex justify-between items-center pt-2 border-t border-border font-bold text-base">
                                <span>Total</span>
                                <span className="text-primary">₹{cart.reduce((sum, i) => sum + (parseFloat(i.sellingPrice) * i.qty), 0).toFixed(2)}</span>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 p-3 rounded-xl bg-blue-500/10 text-blue-600 text-xs">
                            <MapPin className="w-4 h-4 shrink-0" />
                            <div className="truncate">
                                <span className="font-bold">{customerName || "Walk-in"}:</span> {customerPhone || "N/A"}
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
                                    // 1. Group Items by Brand
                                    const itemsByBrand: Record<string, any[]> = {};
                                    cart.forEach(item => {
                                        const brand = item.brand || "Unknown";
                                        if (!itemsByBrand[brand]) itemsByBrand[brand] = [];
                                        itemsByBrand[brand].push(item);
                                    });

                                    // 2. Prepare Batches
                                    const batches = [];
                                    const brands = Object.keys(itemsByBrand);

                                    for (const brand of brands) {
                                        let brandEmail = "somesh.topports@gmail.com"; // default
                                        // Fetch Real Email
                                        try {
                                            const brandsQuery = query(collection(db, "brands"), where("name", "==", brand));
                                            const snap = await getDocs(brandsQuery);
                                            if (!snap.empty && snap.docs[0].data().email) {
                                                brandEmail = snap.docs[0].data().email;
                                            }
                                        } catch (e) {
                                            console.error(`Error fetching email for ${brand}`, e);
                                        }

                                        const brandItems = itemsByBrand[brand];
                                        const brandTotal = brandItems.reduce((sum, i) => sum + (parseFloat(i.sellingPrice) * i.qty), 0);
                                        const brandPayout = (brandTotal * 0.8).toFixed(2);

                                        // V3 Items for this brand
                                        const v3Items = brandItems.map(item => ({
                                            desc: `${item.name} (${item.brand} - ${item.size || 'OS'})`,
                                            qty: item.qty,
                                            price: parseFloat(item.sellingPrice),
                                            amount: parseFloat(item.sellingPrice) * item.qty
                                        }));

                                        batches.push({
                                            brandName: brand,
                                            email: brandEmail,
                                            itemsCount: brandItems.length,
                                            total: brandTotal,
                                            emailParams: {
                                                to_email: brandEmail,
                                                to_name: brand,
                                                status: "CONFIRMED",
                                                invoice_date: new Date().toLocaleDateString('en-IN'),
                                                invoice_period: new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
                                                items: v3Items,
                                                totals: {
                                                    total: brandTotal,
                                                    comm: brandTotal * 0.2,
                                                    payout: parseFloat(brandPayout)
                                                }
                                            }
                                        });
                                    }

                                    // 3. Set Preview based on Batches
                                    if (batches.length === 1) {
                                        // Single Brand Mode (Legacy View)
                                        const b = batches[0];
                                        setEmailPreview({
                                            type: 'single',
                                            ui_to_name: b.brandName,
                                            ui_to_email: b.email,
                                            ui_message: `New Sale Confirmed: ${b.itemsCount} Items`,
                                            ui_details: `Total: ₹${b.total}\nItems: ${b.itemsCount}`,
                                            emailParams: b.emailParams
                                        });
                                    } else {
                                        // Multi Brand Mode
                                        setEmailPreview({
                                            type: 'multi',
                                            batches: batches,
                                            ui_to_name: "Multiple Brands",
                                            ui_to_email: `${batches.length} Emails`,
                                            ui_message: `This wil send ${batches.length} separate invoices.`,
                                            ui_details: batches.map(b => `${b.brandName}: ${b.itemsCount} items (₹${b.total})`).join('\n')
                                        });
                                    }
                                }}
                                className="w-full bg-white text-black border border-gray-200 hover:bg-gray-50 shadow-sm"
                            >
                                <div className="mr-2 flex items-center justify-center h-4 w-4 rounded bg-red-500 text-white text-[8px] font-bold">M</div>
                                Email Invoice(s)
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
                                    <span className="truncate">{emailPreview.batches ? "Multi-Brand Invoice Run" : `Invoice for ${emailPreview.ui_to_name}...`}</span>
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

                                            if (emailPreview.batches) {
                                                // Multi-send
                                                await Promise.all(emailPreview.batches.map((b: any) => sendInvoiceEmail(b.emailParams)));
                                                setAlertConfig({ open: true, title: "Emails Sent", desc: `${emailPreview.batches.length} invoices sent successfully!` });
                                            } else {
                                                // Single-send
                                                await sendInvoiceEmail(emailPreview.emailParams);
                                                setAlertConfig({ open: true, title: "Email Sent", desc: `Invoice sent successfully!` });
                                            }

                                            setEmailPreview(null);
                                        } catch (e: any) {
                                            console.error(e);
                                            setAlertConfig({
                                                open: true,
                                                title: "Email Error",
                                                desc: e.message || "Failed to send. Please check Internet or API Key."
                                            });
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
