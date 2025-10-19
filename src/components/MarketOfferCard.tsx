"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { ClipLoader } from "react-spinners";

type MarketOffer = {
  currency: string;
  balance: string;
  emissor: string;
  available: number;
};

type MarketOfferCardProps = {
  item: MarketOffer;
  onBuy: (quantity: string, currency: string, originalIssuer: string, crowdfundingAdminWallet: string) => void;
  adminAddress: string | null;
  loading: boolean;
};

function BuyDialog({ currency, issuer, onBuy, adminAddress, loading }: { 
  currency: string; 
  issuer: string; 
  onBuy: (quantity: string, currency: string, originalIssuer: string, crowdfundingAdminWallet: string) => void;
  adminAddress: string | null;
  loading: boolean;
}) {
  const [qty, setQty] = useState<string>("");
  
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button className="w-full">Comprar</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Comprar {currency}</AlertDialogTitle>
          <AlertDialogDescription>
            Informe a quantidade que deseja comprar.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-2">
          <label className="block text-sm text-gray-600">Quantidade</label>
          <Input 
            type="number" 
            value={qty} 
            onChange={(e) => setQty(e.target.value)} 
            placeholder="0.0" 
            disabled={loading}
          />
        </div>
        Total: {Number(qty) * 0.5} XRP
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction 
            onClick={(e) => {
              onBuy(qty, currency, issuer, adminAddress ?? "");
            }} 
            disabled={loading}
          >
            {loading ? (
              <>
                <ClipLoader color="#fff" size={16} className="mr-2" />
                Processando...
              </>
            ) : (
              "Confirmar compra"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function MarketOfferCard({ item, onBuy, adminAddress, loading }: MarketOfferCardProps) {
  if (item.available === 0) return null;

  return (
    <div className="bg-white rounded-lg shadow-sm border p-4">
      <div className="text-sm text-gray-500">Currency</div>
      <div className="text-lg font-semibold">{item.currency}</div>
      <div className="flex gap-6">
        <div>
          <div className="mt-3 text-sm text-gray-500">Balance disponível</div>
          <div className="text-xl font-bold">{item.available}</div>
        </div>
        <div>
          <div className="mt-3 text-sm text-gray-500">Price per token</div>
          <div className="text-xl font-bold">0.5 XRP</div>
        </div>
      </div>
      <div className="mt-3 text-sm text-gray-500">Emissor (account)</div>
      <div className="font-mono text-sm break-all">{item.emissor}</div>
      <div className="mt-4">
        <BuyDialog 
          currency={item.currency} 
          issuer={item.emissor} 
          onBuy={onBuy}
          adminAddress={adminAddress}
          loading={loading}
        />
      </div>
    </div>
  );
}
