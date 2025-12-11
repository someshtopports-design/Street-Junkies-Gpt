import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { QrCode, Plus, Search, Filter } from "lucide-react";
import { collection, query, orderBy, onSnapshot, addDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export const InventoryView: React.FC = () => {
    const [items, setItems] = useState<any[]>([]);
    const [brands, setBrands] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterText, setFilterText] = useState("");

    // Create Form
    const [brandId, setBrandId] = useState("");
    const [name, setName] = useState("");
    const [size, setSize] = useState("");
    const [stock, setStock] = useState("1");
    const [price, setPrice] = useState("");

    // QR Modal
    const [createdItem, setCreatedItem] = useState<any>(null);
    const [showQrModal, setShowQrModal] = useState(false);
    const [selectedQR, setSelectedQR] = useState<string | null>(null);

    useEffect(() => {
        const unsubInv = onSnapshot(query(collection(db, "inventory"), orderBy("createdAt", "desc")), (snap) => {
            setItems(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setLoading(false);
        });
        const unsubBrands = onSnapshot(query(collection(db, "brands"), orderBy("name")), (snap) => {
            setBrands(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });
        return () => { unsubInv(); unsubBrands(); };
    }, []);

    const handleAddItem = async () => {
        if (!name || !brandId || !size) { alert("Please fill required fields"); return; }
        const selectedBrand = brands.find(b => b.id === brandId);

        try {
            const newItem = {
                name,
                brand: selectedBrand?.name,
                brandId: selectedBrand?.id,
                brandComm: selectedBrand?.commission || 20,
                size,
                price: parseFloat(price) || 0,
                stock: parseInt(stock) || 0,
                createdAt: new Date(),
                qrToken: crypto.randomUUID(),
            };

            const docRef = await addDoc(collection(db, "inventory"), newItem);
            setCreatedItem({ id: docRef.id, ...newItem });
            setShowQrModal(true);
        } catch (e) {
            console.error(e);
            alert("Error adding item");
        }
    };

    const closeModal = (retainDetails: boolean) => {
        setShowQrModal(false);
        if (!retainDetails) {
            setName(""); setBrandId(""); setSize(""); setPrice(""); setStock("1");
        } else {
            // If retaining details, maybe just clear size?
            setSize("");
            setStock("1");
        }
    }

    const filteredItems = items.filter(i =>
        i.name.toLowerCase().includes(filterText.toLowerCase()) ||
        i.brand.toLowerCase().includes(filterText.toLowerCase())
    );

    return (
        <div className="space-y-6 h-[calc(100vh-140px)] flex flex-col">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Inventory Management</h1>
                    <p className="text-sm text-muted-foreground">{items.length} SKUs across all brands</p>
                </div>

                <div className="flex gap-2">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            placeholder="Search items..."
                            value={filterText}
                            onChange={e => setFilterText(e.target.value)}
                            className="pl-9 w-[200px] md:w-[300px] h-10 bg-background"
                        />
                    </div>
                    <Button variant="outline" size="icon" className="h-10 w-10"><Filter className="w-4 h-4" /></Button>
                </div>
            </div>

            <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 overflow-hidden">

                {/* List View */}
                <div className="lg:col-span-2 flex flex-col gap-4 overflow-hidden">
                    <Card className="flex-1 overflow-y-auto p-2">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-muted-foreground uppercase bg-secondary/30 sticky top-0 z-10 backdrop-blur-md">
                                <tr>
                                    <th className="px-4 py-3 rounded-l-lg">Item</th>
                                    <th className="px-4 py-3 hidden sm:table-cell">Brand</th>
                                    <th className="px-4 py-3">Stock</th>
                                    <th className="px-4 py-3">Price</th>
                                    <th className="px-4 py-3 rounded-r-lg text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/50">
                                {filteredItems.map(item => (
                                    <tr key={item.id} className="group hover:bg-secondary/20 transition-colors">
                                        <td className="px-4 py-3 font-medium">
                                            <div className="flex flex-col">
                                                <span>{item.name}</span>
                                                <span className="text-[10px] text-muted-foreground sm:hidden">{item.brand}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 hidden sm:table-cell text-muted-foreground">{item.brand}</td>
                                        <td className="px-4 py-3">
                                            <Badge variant="outline" className={item.stock < 5 ? "text-red-500 border-red-500/20 bg-red-500/10" : "text-muted-foreground"}>
                                                {item.stock}
                                            </Badge>
                                        </td>
                                        <td className="px-4 py-3">₹{item.price}</td>
                                        <td className="px-4 py-3 text-right">
                                            <Button size="icon" variant="ghost" className="h-8 w-8 text-primary hover:bg-primary/10" onClick={() => setSelectedQR(item.id)}>
                                                <QrCode className="w-4 h-4" />
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </Card>
                </div>

                {/* Sidebar: Add New & QR Preview */}
                <div className="flex flex-col gap-6 overflow-y-auto">

                    {/* Add Item Form */}
                    <Card className="p-5 space-y-4 border-primary/20 bg-primary/5">
                        <div className="flex items-center gap-2 text-primary font-bold">
                            <Plus className="w-4 h-4" />
                            <span>Add New SKU</span>
                        </div>

                        <div className="space-y-3">
                            <div className="space-y-1">
                                <label className="text-[10px] uppercase font-bold text-muted-foreground">Brand</label>
                                <select value={brandId} onChange={e => setBrandId(e.target.value)} className="w-full h-9 rounded-md border border-input bg-background/50 text-sm px-2">
                                    <option value="">Select Partner</option>
                                    {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                </select>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] uppercase font-bold text-muted-foreground">Product Name</label>
                                <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Vintage Tee" className="bg-background/50 h-9" />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-1">
                                    <label className="text-[10px] uppercase font-bold text-muted-foreground">Size</label>
                                    <Input value={size} onChange={e => setSize(e.target.value)} placeholder="M" className="bg-background/50 h-9" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] uppercase font-bold text-muted-foreground">Qty</label>
                                    <Input value={stock} onChange={e => setStock(e.target.value)} type="number" className="bg-background/50 h-9" />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] uppercase font-bold text-muted-foreground">Price (₹)</label>
                                <Input value={price} onChange={e => setPrice(e.target.value)} type="number" className="bg-background/50 h-9" />
                            </div>

                            <Button onClick={handleAddItem} className="w-full bg-primary text-primary-foreground shadow-lg shadow-primary/20">
                                Generate QR
                            </Button>
                        </div>
                    </Card>

                    {/* QR Preview Panel */}
                    <Card className="flex-1 p-5 flex flex-col items-center justify-center text-center gap-4 min-h-[250px]">
                        {selectedQR ? (
                            <>
                                <div className="h-40 w-40 bg-white p-3 rounded-xl shadow-inner flex items-center justify-center">
                                    <img src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${selectedQR}`} alt="QR" className="w-full h-full" />
                                </div>
                                <div className="space-y-1">
                                    <p className="font-mono text-xs text-primary bg-primary/10 px-2 py-1 rounded">ID: {selectedQR}</p>
                                    <p className="text-[10px] text-muted-foreground">Print for product tag</p>
                                </div>
                            </>
                        ) : (
                            <div className="text-muted-foreground text-sm flex flex-col items-center gap-2">
                                <QrCode className="w-8 h-8 opacity-20" />
                                <span>Select an item to view QR</span>
                            </div>
                        )}
                    </Card>

                </div>
            </div>

            {/* Modal */}
            {showQrModal && createdItem && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <Card className="w-full max-w-sm p-6 flex flex-col items-center gap-5 shadow-2xl">
                        <div className="h-14 w-14 rounded-full bg-green-500/10 text-green-500 flex items-center justify-center">
                            <QrCode className="w-7 h-7" />
                        </div>
                        <div className="text-center">
                            <h2 className="text-lg font-bold">Item Registered!</h2>
                            <p className="text-sm text-muted-foreground">{createdItem.name} ({createdItem.size})</p>
                        </div>

                        <div className="p-4 bg-white rounded-xl border border-input shadow-sm">
                            <img src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${createdItem.id}`} alt="QR" className="w-32 h-32" />
                        </div>
                        <p className="text-[10px] text-muted-foreground font-mono">{createdItem.id}</p>

                        <div className="flex flex-col gap-2 w-full mt-2">
                            <Button onClick={() => closeModal(true)} className="w-full bg-primary">Add Variation (Same Item)</Button>
                            <Button variant="outline" onClick={() => closeModal(false)} className="w-full">Done</Button>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
};
