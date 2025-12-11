import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";

interface LoginScreenProps {
    onLogin: (email: string, pass: string) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
    const [email, setEmail] = useState("");
    const [pass, setPass] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        await onLogin(email, pass);
        setIsSubmitting(false);
    };

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-background relative overflow-hidden">
            {/* Ambient Background Effects */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 blur-[120px] rounded-full opacity-50" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-violet-500/20 blur-[120px] rounded-full opacity-50" />

            <Card className="w-full max-w-md border border-border/50 bg-card/60 backdrop-blur-2xl p-8 shadow-2xl shadow-black/5 z-10 rounded-[2rem]">
                <div className="flex flex-col items-center gap-6 mb-8 text-center">
                    <div className="h-14 w-14 rounded-3xl bg-gradient-to-tr from-primary via-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-primary/30 ring-4 ring-background">
                        <span className="text-xl font-bold tracking-tight text-white">SJ</span>
                    </div>
                    <div className="space-y-1">
                        <h1 className="text-2xl font-bold tracking-tight text-foreground">Welcome Back</h1>
                        <p className="text-sm text-muted-foreground">Sign in to access your dashboard</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="space-y-2">
                        <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground ml-1">
                            Email Address
                        </label>
                        <Input
                            type="email"
                            placeholder="name@streetjunkies.io"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="h-11 bg-secondary/30 border-secondary focus:bg-background focus:border-primary/50 text-foreground placeholder:text-muted-foreground/50 rounded-xl transition-all"
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground ml-1">
                                Password
                            </label>
                            <a href="#" className="text-[11px] text-primary hover:underline">Forgot password?</a>
                        </div>

                        <Input
                            type="password"
                            placeholder="••••••••"
                            value={pass}
                            onChange={(e) => setPass(e.target.value)}
                            className="h-11 bg-secondary/30 border-secondary focus:bg-background focus:border-primary/50 text-foreground placeholder:text-muted-foreground/50 rounded-xl transition-all"
                            required
                        />
                    </div>

                    <Button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full h-11 mt-2 bg-primary text-primary-foreground hover:bg-primary/90 font-medium tracking-wide rounded-xl shadow-lg shadow-primary/25 transition-all active:scale-[0.98]"
                    >
                        {isSubmitting ? "Authenticating..." : "Sign In"}
                    </Button>
                </form>

                <div className="mt-8 pt-6 border-t border-border/40 text-center">
                    <p className="text-xs text-muted-foreground">
                        Protected by AntiGravity Ops · v2.0
                    </p>
                </div>
            </Card>
        </div>
    );
};
