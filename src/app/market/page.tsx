"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
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
import { LogOut } from "lucide-react";

type OtherCrowdfundingsBalances = {
  currency: string;
  balance: string;
  account: string;
  available: number;
}

type State = {
  admin: Array<{ id: number; name: string; address: string; secret: string }>;
  investors: { id: number; name: string; address: string; secret: string; crowdfunding_id: number }[];
  currencies: Array<{ id: number; code: string; crowdfunding_id: number }>;
  wrappedTokens: Array<{ id: number; currency_id: number; code: string; crowdfunding_id: number; created_at: string }>;
  network: string;
  distributed: boolean;
};

export default function MarketPage() {
  const [marketOffersData, setMarketOffersData] = useState<OtherCrowdfundingsBalances[]>([]);
  const [state, setState] = useState<State | null>(null);
  const [profile, setProfile] = useState<string | null>(null);
  const [adminAddress, setAdminAddress] = useState<string | null>(null);

  async function handleBuy(quantity: string, currency: string, originalIssuer: string, crowdfundingAdminWallet: string) {
    const investor = state?.investors.find(i => i.address === profile);
    if (!investor) return;

    const res = await fetch("/api/market/buy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ buyerAddress: investor.address, quantity, currency, originalIssuer, crowdfundingAdminWallet, pricePerToken: 0.5}),
    });
    
    if (!res.ok) {
      const error = await res.json();
      console.error('Failed to buy', error);
      return;
    }
    const data = await res.json();
    console.log('Compra realizada com sucesso', data);
  }

  function BuyDialog({ currency, issuer }: { currency: string; issuer: string }) {
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
              Informe a quantidade que deseja comprar deste emissor.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <label className="block text-sm text-gray-600">Quantidade</label>
            <Input type="number" value={qty} onChange={(e) => setQty(e.target.value)} placeholder="0.0" />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleBuy(qty, currency, issuer, adminAddress ?? "")}>
              Confirmar compra
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  useEffect(() => {
    

    const walletAddress = localStorage.getItem("xrpl_poc_admin");
    if (walletAddress) setAdminAddress(walletAddress);
    
    (async () => {
      const res = await fetch(`/api/market?adminAddress=${walletAddress}`);
      const data = await res.json();
      setMarketOffersData(Array.isArray(data) ? data : []);
    })();

    const p = localStorage.getItem("xrpl_poc_investor");
    if (p) setProfile(p);

    async function fetchInvestorData() {
      const res = await fetch("/api/state");
      if (!res.ok) return;
      const data = (await res.json());
      setState(data);
    }
    fetchInvestorData();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
       <div className="p-6 space-y-4 max-w-7xl mx-auto">
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-2xl font-bold">Mercado Primario</h1>
          <div className="text-sm text-gray-600 gap-2 flex gap-4">

            <p>Perfil: {profile === 'admin' ? 'Admin' : (state?.investors.find(i => i.address === profile)?.name || '—')}</p>
            <p>Carteira: {profile === 'admin' ? state?.admin[0]?.address : state?.investors.find(i => i.address === profile)?.address}</p>
          </div>
          
          <div className="space-x-2">
            <Link href="/">
              <Button variant="outline" className="flex items-center gap-2">Trocar perfil <LogOut className="w-4 h-4" /></Button>
            </Link>
          </div>
        </div>
       </div>

      <div className="p-6 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {(marketOffersData ?? []).map((item: OtherCrowdfundingsBalances, idx) => (
            item.available !== 0 && (
              <div key={`${item.currency}-${item.account}-${idx}`} className="bg-white rounded-lg shadow-sm border p-4">
                <div className="text-sm text-gray-500">Currency</div>
                <div className="text-lg font-semibold">{item.currency}</div>
                <div className="mt-3 text-sm text-gray-500">Balance disponível</div>
                <div className="text-xl font-bold">{item.available}</div>
                <div className="mt-3 text-sm text-gray-500">Emissor (account)</div>
                <div className="font-mono text-sm break-all">{item.account}</div>
                <div className="mt-4">
                  <BuyDialog currency={item.currency} issuer={item.account} />
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}