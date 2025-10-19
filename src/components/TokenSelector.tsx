"use client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ClipLoader } from "react-spinners";

type TokenOption = {
  value: string;
  label: string;
};

type TokenSelectorProps = {
  selectedToken: string;
  onTokenChange: (token: string) => void;
  tokenOptions: TokenOption[];
  balance: string;
  balanceLoading: boolean;
};

export function TokenSelector({ 
  selectedToken, 
  onTokenChange, 
  tokenOptions, 
  balance, 
  balanceLoading 
}: TokenSelectorProps) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1">
        <label className="text-sm font-medium text-gray-700 pl-0.5 font-semibold">Token:</label>
        <Select value={selectedToken} onValueChange={onTokenChange}>
          <SelectTrigger className="w-20 !h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {tokenOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center gap-1">
        <label className="text-sm font-medium text-gray-700 font-semibold">Saldo:</label>
        <div className="w-36 bg-gray-50 !h-8 flex items-center justify-center border rounded-md">
          {balanceLoading ? (
            <ClipLoader color="#666" size={16} />
          ) : (
            `${Number(balance) % 1 === 0 ? Number(balance).toString() : Number(balance).toFixed(4)} ${selectedToken}`
          )}
        </div>
      </div>
    </div>
  );
}
