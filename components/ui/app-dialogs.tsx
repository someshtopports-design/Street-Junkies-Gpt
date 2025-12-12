import React from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface ConfirmDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    description: string;
    onConfirm: () => void;
    isLoading?: boolean;
    confirmLabel?: string;
    variant?: "default" | "destructive";
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
    open,
    onOpenChange,
    title,
    description,
    onConfirm,
    isLoading,
    confirmLabel = "Confirm",
    variant = "default"
}) => (
    <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
                <DialogTitle>{title}</DialogTitle>
                <DialogDescription>{description}</DialogDescription>
            </DialogHeader>
            <DialogFooter>
                <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                <Button
                    onClick={onConfirm}
                    disabled={isLoading}
                    variant={variant === "destructive" ? "destructive" : "default"}
                >
                    {isLoading ? "Processing..." : confirmLabel}
                </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
);

interface AlertDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    description: string;
}

export const AppAlertDialog: React.FC<AlertDialogProps> = ({ open, onOpenChange, title, description }) => (
    <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
                <DialogTitle>{title}</DialogTitle>
                <DialogDescription>{description}</DialogDescription>
            </DialogHeader>
            <DialogFooter>
                <Button onClick={() => onOpenChange(false)}>OK</Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
);
