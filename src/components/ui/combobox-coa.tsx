"use client";

import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";

interface CoA {
    id: string;
    code: string;
    name: string;
    accountType?: string;
}

interface ComboboxCoAProps {
    value: string;
    onValueChange: (value: string) => void;
    accounts: CoA[];
    placeholder?: string;
    disabled?: boolean;
    className?: string;
}

export function ComboboxCoA({
    value,
    onValueChange,
    accounts,
    placeholder = "Select Account...",
    disabled = false,
    className
}: ComboboxCoAProps) {
    const [open, setOpen] = React.useState(false);

    const selectedAccount = React.useMemo(() =>
        accounts.find((account) => account.id === value),
        [value, accounts]);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    disabled={disabled}
                    className={cn(
                        "w-full justify-between bg-[#0a0e1a] border-white/[0.1] text-white hover:bg-white/[0.04] font-normal text-xs",
                        !value && "text-slate-500",
                        className
                    )}
                >
                    <div className="flex items-center gap-2 truncate">
                        {selectedAccount ? (
                            <>
                                <span className="font-mono text-slate-400">{selectedAccount.code}</span>
                                <span className="truncate">{selectedAccount.name}</span>
                            </>
                        ) : (
                            placeholder
                        )}
                    </div>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[400px] p-0 bg-[#1e293b] border-white/[0.08] text-white">
                <Command
                    className="bg-transparent"
                    filter={(value, search) => {
                        if (value.includes(search.toLowerCase())) return 1;
                        return 0;
                    }}
                >
                    <CommandInput
                        placeholder="Search by code or name..."
                        className="text-xs h-9"
                    />
                    <CommandList>
                        <CommandEmpty className="py-4 text-center text-xs text-slate-400">
                            No account found.
                        </CommandEmpty>
                        <CommandGroup>
                            {accounts.map((account) => (
                                <CommandItem
                                    key={account.id}
                                    value={`${account.code} ${account.name}`.toLowerCase()}
                                    onSelect={() => {
                                        onValueChange(account.id);
                                        setOpen(false);
                                    }}
                                    className="text-xs cursor-pointer aria-selected:bg-blue-500/10 aria-selected:text-blue-400"
                                >
                                    <div className="flex items-center w-full gap-2">
                                        <div className="flex-1 flex justify-between items-center">
                                            <div className="flex items-center gap-2">
                                                <span className="font-mono text-slate-400 w-12">{account.code}</span>
                                                <span className="font-medium">{account.name}</span>
                                            </div>
                                            {account.accountType && (
                                                <span className="text-[10px] text-slate-500 uppercase ml-2">
                                                    {account.accountType}
                                                </span>
                                            )}
                                        </div>
                                        <Check
                                            className={cn(
                                                "h-4 w-4 shrink-0 text-blue-500",
                                                value === account.id ? "opacity-100" : "opacity-0"
                                            )}
                                        />
                                    </div>
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}
