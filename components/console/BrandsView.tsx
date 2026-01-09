import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { collection, query, orderBy, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Plus, Trash2, Edit2, Mail } from "lucide-react";
import { ConfirmDialog, AppAlertDialog } from "@/components/ui/app-dialogs";

export const BrandsView: React.FC = () => {
    const [brands, setBrands] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState<string | null>(null);
    const [brandToDelete, setBrandToDelete] = useState<string | null>(null);
    const [alertConfig, setAlertConfig] = useState({ open: false, title: "", desc: "" });

    // Form
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [type, setType] = useState("Non-exclusive");
    const [comm, setComm] = useState("");

    useEffect(() => {
        const q = query(collection(db, "brands"), orderBy("createdAt", "desc"));
        const unsub = onSnapshot(q, snap => {
            setBrands(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            setLoading(false);
        });
        return () => unsub();
    }, []);

    const handleSubmit = async () => {
        if (!name || !comm) return;

        try {
            const data = {
                name,
                email,
                type,
                commission: comm,
                updatedAt: new Date()
            };

            if (isEditing) {
                await updateDoc(doc(db, "brands", isEditing), data);
            } else {
                await addDoc(collection(db, "brands"), {
                    ...data,
                    createdAt: new Date()
                });
            }
            resetForm();
        } catch (e: any) {
            console.error("Brand Save Error:", e);
            setAlertConfig({
                open: true,
                title: "Save Failed",
                desc: e.message ? `Error: ${e.message}` : "Failed to save brand details. Check console/permissions."
            });
        }
    }

    const handleDeleteClick = (id: string) => {
        setBrandToDelete(id);
    }

    const confirmDelete = async () => {
        if (brandToDelete) {
            await deleteDoc(doc(db, "brands", brandToDelete));
            setBrandToDelete(null);
        }
    }

    const editBrand = (b: any) => {
        setIsEditing(b.id);
        setName(b.name);
        setEmail(b.email || "");
        setType(b.type || "Non-exclusive");
        setComm(b.commission);
    }

    const resetForm = () => {
        setIsEditing(null);
        setName(""); setEmail(""); setType("Non-exclusive"); setComm("");
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Brand Partnerships</h1>
                    <p className="text-sm text-muted-foreground">Manage brands and commission structures.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Brand List */}
                <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                    {loading && <div className="p-4 text-muted-foreground text-sm col-span-2">Loading partners...</div>}
                    {brands.map(brand => (
                        <Card key={brand.id} className="p-4 flex flex-col gap-3 group hover:border-primary/50 transition-colors">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="font-bold text-foreground">{brand.name}</h3>
                                    <p className="text-xs text-muted-foreground">{brand.type} Partner</p>
                                </div>
                                <div className="text-right">
                                    <span className="text-lg font-bold text-primary">{brand.commission}%</span>
                                    <span className="text-[10px] block text-muted-foreground">Take Rate</span>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-auto">
                                <Mail className="w-3 h-3" />
                                {brand.email || "No contact email"}
                            </div>

                            <div className="border-t border-border pt-3 mt-1 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button size="sm" variant="outline" className="h-7 text-xs flex-1" onClick={() => editBrand(brand)}>
                                    <Edit2 className="w-3 h-3 mr-1" /> Edit
                                </Button>
                                <Button size="sm" variant="outline" className="h-7 text-xs flex-1 text-destructive hover:bg-destructive/10 border-destructive/20" onClick={() => handleDeleteClick(brand.id)}>
                                    <Trash2 className="w-3 h-3 mr-1" /> Remove
                                </Button>
                            </div>
                        </Card>
                    ))}
                </div>

                {/* Editor Panel */}
                <div>
                    <Card className="p-5 sticky top-24 border-primary/20 shadow-lg shadow-primary/5">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                <Plus className="w-4 h-4" />
                            </div>
                            <h3 className="font-semibold">{isEditing ? "Edit Partner" : "Onboard Partner"}</h3>
                        </div>

                        <div className="space-y-3">
                            <div className="space-y-1">
                                <label className="text-[10px] uppercase font-bold text-muted-foreground">Brand Name</label>
                                <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Nike" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] uppercase font-bold text-muted-foreground">Contact Email</label>
                                <Input value={email} onChange={e => setEmail(e.target.value)} placeholder="contact@brand.com" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="text-[10px] uppercase font-bold text-muted-foreground">Type</label>
                                    <select
                                        value={type}
                                        onChange={e => setType(e.target.value)}
                                        className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2"
                                    >
                                        <option>Non-exclusive</option>
                                        <option>Exclusive</option>
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] uppercase font-bold text-muted-foreground">Comm %</label>
                                    <Input value={comm} onChange={e => setComm(e.target.value)} placeholder="20" />
                                </div>
                            </div>

                            <div className="flex gap-2 pt-4">
                                {isEditing && <Button variant="ghost" onClick={resetForm} className="flex-1">Cancel</Button>}
                                <Button className="flex-1 bg-primary text-primary-foreground shadow-md" onClick={handleSubmit}>
                                    {isEditing ? "Update Brand" : "Add Brand"}
                                </Button>
                            </div>
                        </div>
                    </Card>
                </div>

            </div>
            <ConfirmDialog
                open={!!brandToDelete}
                onOpenChange={(open) => !open && setBrandToDelete(null)}
                title="Delete Brand?"
                description="This action cannot be undone. This will permanently remove the brand partner."
                onConfirm={confirmDelete}
            />

            <AppAlertDialog
                open={alertConfig.open}
                onOpenChange={(open) => setAlertConfig(prev => ({ ...prev, open }))}
                title={alertConfig.title}
                description={alertConfig.desc}
            />
        </div>
    );
};
