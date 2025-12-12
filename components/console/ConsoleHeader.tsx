import React from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Bell, Sun, Moon, LogOut, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ConsoleHeaderProps {
    role: string | null;
    onLogout: () => void;
    theme: "dark" | "light";
    onToggleTheme: () => void;
    onMenuClick?: () => void;
}

export const ConsoleHeader: React.FC<ConsoleHeaderProps> = ({ role, onLogout, theme, onToggleTheme, onMenuClick }) => {
    return (
        <header className="sticky top-0 z-40 w-full glass">
            <div className="max-w-[1400px] mx-auto flex h-16 items-center justify-between px-4 md:px-6 gap-4">

                {/* Left: Branding & Mobile Menu */}
                <div className="flex items-center gap-3 md:gap-4">


                    <div className="flex items-center gap-2.5 group cursor-pointer">
                        <div className="h-9 w-9 rounded-2xl bg-gradient-to-tr from-primary to-violet-500 flex items-center justify-center shadow-lg shadow-primary/25 transition-transform group-hover:scale-105 duration-300">
                            <span className="text-xs font-bold tracking-tight text-white drop-shadow-md">SJ</span>
                        </div>
                        <div className="hidden md:flex flex-col leading-none">
                            <span className="text-sm font-semibold tracking-tight text-foreground group-hover:text-primary transition-colors">Street Junkies</span>
                            <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mt-1">Console</span>
                        </div>
                    </div>
                </div>

                {/* Center: Search (Desktop) */}
                <div className="hidden md:flex flex-1 items-center justify-center max-w-lg mx-auto">
                    <div className="relative w-full group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors duration-300" />
                        <Input
                            placeholder="Search inventory, brands, or invoices..."
                            className="pl-10 h-10 w-full rounded-2xl bg-secondary/50 border-transparent focus:bg-background focus:border-input focus:ring-2 focus:ring-ring/20 transition-all duration-300 text-sm placeholder:text-muted-foreground/70"
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                            <span className="text-[10px] bg-background/50 border border-border px-1.5 py-0.5 rounded text-muted-foreground">⌘K</span>
                        </div>
                    </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-2 md:gap-3">
                    <Badge variant="outline" className="hidden sm:inline-flex capitalize bg-primary/5 text-primary border-primary/20 h-7 px-3">
                        {role || 'Guest'}
                    </Badge>

                    <div className="h-6 w-px bg-border mx-1 hidden sm:block"></div>

                    <Button variant="ghost" size="icon" onClick={onToggleTheme} className="rounded-xl h-9 w-9 text-muted-foreground hover:text-foreground">
                        {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                    </Button>

                    <Button variant="ghost" size="icon" className="relative rounded-xl h-9 w-9 text-muted-foreground hover:text-foreground">
                        <Bell className="w-4 h-4" />
                        <span className="absolute top-2 right-2.5 h-1.5 w-1.5 rounded-full bg-red-500 border border-background"></span>
                    </Button>

                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onLogout}
                        className="flex items-center gap-2 ml-1 rounded-xl h-9 px-3 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                    >
                        <LogOut className="w-4 h-4" />
                        <span className="hidden sm:inline text-xs font-medium">Log out</span>
                    </Button>
                </div>

            </div>
        </header>
    );
};
