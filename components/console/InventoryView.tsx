import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { AppAlertDialog } from "@/components/ui/app-dialogs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { QrCode, Plus, Search, Filter, Save, ChevronUp, ChevronDown, Edit2, Archive } from "lucide-react";
import { collection, query, orderBy, onSnapshot, addDoc, where, updateDoc, doc } from "firebase/firestore";
import { ConfirmDialog } from "@/components/ui/app-dialogs";
import { db } from "@/lib/firebase";

interface InventoryViewProps {
    store: string;
}

export const InventoryView: React.FC<InventoryViewProps> = ({ store }) => {
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

    const [isEditing, setIsEditing] = useState<string | null>(null);

    // QR & Previews
    const [createdItem, setCreatedItem] = useState<any>(null);
    const [showQrModal, setShowQrModal] = useState(false);
    const [alertConfig, setAlertConfig] = useState({ open: false, title: "", desc: "" });

    useEffect(() => {
        const q = query(
            collection(db, "inventory"),
            where("store", "==", store),
            orderBy("createdAt", "desc")
        );
        const unsubInv = onSnapshot(q, (snap) => {
            // Client-side filter for "archived" status if not in query (for backward compatibility), or add where clause
            // Better to client filter if mixed data, but let's assume we filter out archived
            const allItems = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setItems(allItems.filter((i: any) => i.status !== 'archived'));
            setLoading(false);
        });
        const unsubBrands = onSnapshot(query(collection(db, "brands"), orderBy("name")), (snap) => {
            setBrands(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });
        return () => { unsubInv(); unsubBrands(); };
    }, [store]);

    const handleAddItem = async () => {
        if (!name || !brandId || !size) {
            setAlertConfig({ open: true, title: "Validation Error", desc: "Please fill all required fields (Brand, Name, Size)." });
            return;
        }
        const selectedBrand = brands.find(b => b.id === brandId);

        try {
            const itemData: any = {
                name,
                brand: selectedBrand?.name,
                brandId: selectedBrand?.id,
                brandComm: selectedBrand?.commission || 20,
                size,
                price: parseFloat(price) || 0,
                stock: parseInt(stock) || 0,
                store: store
            };

            if (isEditing) {
                await updateDoc(doc(db, "inventory", isEditing), {
                    ...itemData,
                    updatedAt: new Date()
                });
                setAlertConfig({ open: true, title: "Success", desc: "Item updated successfully." });
                setIsEditing(null);
                setCreatedItem(null); // Clear preview
            } else {
                itemData.createdAt = new Date();
                itemData.qrToken = crypto.randomUUID();

                const docRef = await addDoc(collection(db, "inventory"), itemData);
                setCreatedItem({ id: docRef.id, ...itemData });
                setShowQrModal(true);
            }

            // Reset common fields
            if (!isEditing) {
                // Keep brand selected for faster entry, clear others
                setName(""); setSize(""); setPrice(""); setStock("1");
            } else {
                setIsAddOpen(false);
                setBrandId(""); setName(""); setSize(""); setPrice(""); setStock("1");
            }

        } catch (e) {
            console.error(e);
            setAlertConfig({ open: true, title: "Error", desc: "Failed to save item." });
        }
    };

    const handleEdit = (item: any) => {
        setIsEditing(item.id);
        setBrandId(item.brandId || brands.find(b => b.name === item.brand)?.id || "");
        setName(item.name);
        setSize(item.size);
        setPrice(item.price);
        setStock(item.stock);
        setIsAddOpen(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleArchive = (id: string) => {
        setSelectedIdToArchive(id);
    };

    const confirmArchive = async () => {
        if (!selectedIdToArchive) return;
        await updateDoc(doc(db, "inventory", selectedIdToArchive), { status: 'archived' });
        setSelectedIdToArchive(null);
    };

    const [selectedIdToArchive, setSelectedIdToArchive] = useState<string | null>(null);

    const closeModal = (retainDetails: boolean) => {
        setShowQrModal(false);
        if (!retainDetails) {
            setName(""); setBrandId(""); setSize(""); setPrice(""); setStock("1");
        } else {
            setStock("1");
        }
    }

    const filteredItems = items.filter(i => {
        const matchesStore = i.store === store || !i.store;
        const matchesText = i.name.toLowerCase().includes(filterText.toLowerCase()) ||
            i.brand.toLowerCase().includes(filterText.toLowerCase());
        return matchesStore && matchesText;
    });

    const [isAddOpen, setIsAddOpen] = useState(true);

    useEffect(() => {
        if (window.innerWidth < 768) {
            setIsAddOpen(false);
        }
    }, []);

    return (
        <div className="flex flex-col gap-6 pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
                <div>
                    <div className="flex items-center gap-2">
                        <h1 className="text-2xl font-bold tracking-tight">Inventory</h1>
                        <Badge variant="outline" className="text-xs bg-background">{store}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{filteredItems.length} SKUs in {store}</p>
                </div>
            </div>

            {/* TOP SECTION: Add New SKU (Collapsible) */}
            <Card className="shrink-0 bg-card border-primary/20 overflow-hidden shadow-sm">
                <div
                    onClick={() => setIsAddOpen(!isAddOpen)}
                    className="p-3 px-4 flex items-center justify-between cursor-pointer bg-secondary/20 hover:bg-secondary/30 transition-colors select-none"
                >
                    <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                        <Plus className="w-4 h-4" />
                        <span>{isEditing ? "Edit Item Details" : "Add New SKU"}</span>
                    </div>
                    {isAddOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                </div>

                {isAddOpen && (
                    <div className="p-4 border-t border-border/10 animate-in slide-in-from-top-2 duration-200">
                        <div className="flex flex-col md:flex-row gap-6">
                            {/* Form Fields */}
                            <div className="flex-1 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 items-end">
                                <div className="col-span-2 md:col-span-2 lg:col-span-1 space-y-1">
                                    <label className="text-[10px] uppercase font-bold text-muted-foreground">Brand</label>
                                    <select value={brandId} onChange={e => setBrandId(e.target.value)} className="w-full h-9 rounded-md border border-input bg-background text-sm px-2">
                                        <option value="">Select Partner</option>
                                        <option disabled>---</option>
                                        {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                    </select>
                                </div>
                                <div className="col-span-2 md:col-span-2 space-y-1">
                                    <label className="text-[10px] uppercase font-bold text-muted-foreground">Product Name</label>
                                    <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Graphic Tee" className="bg-background h-9" />
                                </div>
                                <div className="col-span-1 md:col-span-1 space-y-1">
                                    <label className="text-[10px] uppercase font-bold text-muted-foreground">Size</label>
                                    <Input value={size} onChange={e => setSize(e.target.value)} placeholder="M" className="bg-background h-9" />
                                </div>
                                <div className="col-span-1 md:col-span-1 space-y-1">
                                    <label className="text-[10px] uppercase font-bold text-muted-foreground">Qty</label>
                                    <Input value={stock} onChange={e => setStock(e.target.value)} type="number" className="bg-background h-9" />
                                </div>
                                <div className="col-span-1 md:col-span-1 space-y-1">
                                    <label className="text-[10px] uppercase font-bold text-muted-foreground">Price</label>
                                    <Input value={price} onChange={e => setPrice(e.target.value)} type="number" placeholder="₹" className="bg-background h-9" />
                                </div>
                                <div className="col-span-2 md:col-span-1">
                                    <Button onClick={handleAddItem} className="w-full bg-primary text-primary-foreground h-9 shadow-md shadow-primary/20">
                                        {isEditing ? <Save className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                                        {isEditing ? "Save" : "Add"}
                                    </Button>
                                </div>
                            </div>

                            {/* Live ID/QR Preview (Static Placeholder until saved) */}
                            <div className="hidden lg:flex flex-col items-center justify-center p-2 bg-white/50 rounded-lg border border-border/50 w-24 shrink-0">
                                <QrCode className="w-10 h-10 text-muted-foreground/40 mb-1" />
                                <span className="text-[9px] text-muted-foreground text-center leading-tight">QR Generated<br />on Save</span>
                            </div>
                        </div>
                    </div>
                )}
            </Card>

            {/* BOTTOM SECTION: Search & Full List */}
            <div className="flex flex-col gap-0 bg-card border border-border/50 rounded-xl shadow-sm">
                {/* Toolbar */}
                <div className="p-3 border-b border-border/50 flex items-center justify-between bg-muted/20 shrink-0 sticky top-0 z-20 backdrop-blur-md rounded-t-xl">
                    <div className="relative max-w-sm w-full">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                        <Input
                            placeholder="Search inventory..."
                            value={filterText}
                            onChange={e => setFilterText(e.target.value)}
                            className="pl-9 h-8 text-sm bg-background/50 border-transparent focus:bg-background focus:border-input transition-all shadow-sm"
                        />
                    </div>
                </div>

                {/* Table - No Internal Scroll, allow full page expansion */}
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-muted-foreground uppercase bg-muted/40 text-nowrap">
                            <tr>
                                <th className="px-4 py-2.5 font-semibold">Product</th>
                                <th className="px-4 py-2.5 font-semibold w-24 hidden md:table-cell">Brand</th>
                                <th className="px-2 py-2.5 font-semibold w-16 text-center">Size</th>
                                <th className="px-2 py-2.5 font-semibold w-16 text-center">Stock</th>
                                <th className="px-4 py-2.5 font-semibold w-24 text-right">Price</th>
                                <th className="px-2 py-2.5 font-semibold w-12 text-center">QR</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/40">
                            {filteredItems.map(item => (
                                <tr key={item.id} className="hover:bg-muted/30 transition-colors group">
                                    <td className="px-4 py-2.5 font-medium text-foreground">
                                        <div className="flex flex-col">
                                            <span>{item.name}</span>
                                            <span className="text-[10px] text-muted-foreground md:hidden">{item.brand}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-2.5 text-muted-foreground text-xs hidden md:table-cell">{item.brand}</td>
                                    <td className="px-2 py-2.5 text-center">
                                        <Badge variant="secondary" className="font-mono text-[10px] px-1.5 h-5">{item.size || "-"}</Badge>
                                    </td>
                                    <td className="px-2 py-2.5 text-center">
                                        <span className={`text-xs ${item.stock < 5 ? "text-red-500 font-bold" : "text-foreground"}`}>{item.stock}</span>
                                    </td>
                                    <td className="px-4 py-2.5 tabular-nums text-xs text-right">₹{item.price}</td>
                                    <td className="px-2 py-2.5 text-center">
                                        <div className="flex items-center justify-center gap-1">
                                            <Button size="icon" variant="ghost" className="h-7 w-7 hover:bg-primary/10 text-primary opacity-70 group-hover:opacity-100" onClick={() => {
                                                setCreatedItem(item);
                                                setShowQrModal(true);
                                            }}>
                                                <QrCode className="w-3.5 h-3.5" />
                                            </Button>
                                            <Button size="icon" variant="ghost" className="h-7 w-7 hover:bg-blue-500/10 text-blue-600 opacity-70 group-hover:opacity-100" onClick={() => handleEdit(item)}>
                                                <Edit2 className="w-3.5 h-3.5" />
                                            </Button>
                                            <Button size="icon" variant="ghost" className="h-7 w-7 hover:bg-red-500/10 text-red-600 opacity-70 group-hover:opacity-100" onClick={() => handleArchive(item.id)}>
                                                <Archive className="w-3.5 h-3.5" />
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filteredItems.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="text-center py-10 text-muted-foreground">
                                        <div className="flex flex-col items-center gap-2">
                                            <Search className="w-6 h-6 opacity-20" />
                                            <span>No items found in {store}</span>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* QR Modal */}
            {/* QR Modal (Replaced with Dialog) */}
            <Dialog open={showQrModal} onOpenChange={setShowQrModal}>
                <DialogContent className="sm:max-w-sm flex flex-col items-center">
                    {createdItem && (
                        <>
                            <div className="text-center space-y-1">
                                <h2 className="text-2xl font-bold">{createdItem.brand}</h2>
                                <p className="text-muted-foreground">{createdItem.name} — {createdItem.size}</p>
                            </div>

                            <div className="p-4 bg-white rounded-2xl shadow-inner">
                                <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${createdItem.id}`} alt="QR" className="w-48 h-48 mix-blend-multiply" />
                            </div>

                            <div className="w-full text-center space-y-1">
                                <p className="font-mono text-xs text-muted-foreground bg-secondary py-1 px-3 rounded-full inline-block">{createdItem.id}</p>
                            </div>

                            <div className="flex gap-3 w-full mt-4">
                                <Button onClick={() => closeModal(true)} className="flex-1 bg-primary">Add Variation</Button>
                                <Button variant="secondary" onClick={() => closeModal(false)} className="flex-1">Done</Button>
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>

            <AppAlertDialog
                open={alertConfig.open}
                onOpenChange={(open) => setAlertConfig(prev => ({ ...prev, open }))}
                title={alertConfig.title}
                description={alertConfig.desc}
            />

            <ConfirmDialog
                open={!!selectedIdToArchive}
                onOpenChange={(open) => !open && setSelectedIdToArchive(null)}
                title="Archive Item?"
                description="This item will be hidden from the inventory list but kept in the database."
                onConfirm={confirmArchive}
            />
        </div>
    );
};
