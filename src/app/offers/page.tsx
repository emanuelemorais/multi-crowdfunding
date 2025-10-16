"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ClipLoader } from "react-spinners";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { 
  LogOut,
  ArrowUpDown,
  } from 'lucide-react';
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { OffersTable } from "@/components/OffersTable";


type State = {
  admin: Array<{ id: number; name: string; address: string; secret: string }>;
  investors: { id: number; name: string; address: string; secret: string; crowdfunding_id: number }[];
  currencies: Array<{ id: number; code: string; crowdfunding_id: number }>;
  wrappedTokens: Array<{ id: number; currency_id: number; code: string; crowdfunding_id: number; created_at: string }>;
  network: string;
  distributed: boolean;
};

type BookOffersResponse = {
  offers?: Array<{
    Account: string;
    TakerGets: any;
    TakerPays: any;
    quality?: string;
    PreviousTxnID: string;
  }>;
};

// Função para encontrar o endereço do admin baseado no crowdfunding_id
const findAdminAddressByCrowdfundingId = (state: State | null, crowdfundingId: number) => {
  const admin = state?.admin.find(admin => admin.id === crowdfundingId);
  return admin?.address;
};

export default function OffersPage() {
  const [state, setState] = useState<State | null>(null);
  const [profile, setProfile] = useState<string | null>(null);
  const [sell, setSell] = useState<string>("BRL");
  const [buy, setBuy] = useState<string>("XRP");
  const [loading, setLoading] = useState(false);
  const [offers, setOffers] = useState<BookOffersResponse["offers"]>([]);
  const [error, setError] = useState<string | null>(null);
  const [amountSell, setAmountSell] = useState<string>("");
  const [amountBuy, setAmountBuy] = useState<string>("");
  const [priceInput, setPriceInput] = useState<string>("");
  const [selectedToken, setSelectedToken] = useState<string>("XRP");
  const [balance, setBalance] = useState<string>("");
  const [balanceLoading, setBalanceLoading] = useState(false);

  const bestPrice = useMemo(() => {
    if (!offers || offers.length === 0) return "";
    function parseAmt(a: any): number { return typeof a === 'string' ? parseInt(a, 10) / 1_000_000 : parseFloat(a.value); }
    const paysBase = parseAmt(offers[0].TakerPays);
    const getsCounter = parseAmt(offers[0].TakerGets);
    const p = paysBase === 0 ? 0 : getsCounter / paysBase; // counter/base
    return String(p);
  }, [offers]);

  useEffect(() => {
    const p = localStorage.getItem("xrpl_poc_investor");
    if (p) setProfile(p);
  }, []);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/state");
        if (!res.ok) return;
        const data = (await res.json()) as State;
        setState(data);
        if (data.currencies?.length) {
          const first = data.currencies[0];
          const code = typeof first === 'string' ? first : first.code;
          if (code) setSell(code);
        }
      } catch {}
    }
    load();
  }, []);

  const tokenOptions = useMemo(() => {
    const cs = state?.currencies ?? [];
    const flattened = cs.map((c: any) => typeof c === 'string' ? { code: c, link: undefined } : c);
    return flattened.map(c => ({ label: c.code, value: c.code })).concat([{ label: "XRP", value: "XRP" }]);
  }, [state]);

  const sellOptions = useMemo(() => {
    return tokenOptions.map(option => ({
      ...option,
      disabled: option.value === buy
    }));
  }, [tokenOptions, buy]);

  const buyOptions = useMemo(() => {
    return tokenOptions.map(option => ({
      ...option,
      disabled: option.value === sell
    }));
  }, [tokenOptions, sell]);

  async function fetchBalance() {
    if (!profile || !state) return;
    setBalanceLoading(true);
    try {
      
      const res = await fetch(`/api/balance?address=${profile}&currency=${selectedToken}`);
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error);
      
      if (selectedToken === 'XRP') {
        setBalance(data.xrp || '0');
      } else {
        setBalance(data.iou || '0');
      }
    } catch (e: any) {
      setBalance('0');
    } finally {
      setBalanceLoading(false);
    }
  }

  async function fetchOffers() {
    if (!sell || !buy) return;
    setLoading(true);
    setError(null);
    try {
      const selectedInvestor = state!.investors.find(inv => inv.address === profile);
      const adminAddress = selectedInvestor ? findAdminAddressByCrowdfundingId(state, selectedInvestor.crowdfunding_id) : null;
      
      const res = await fetch("/api/offers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sell: sell, buy: buy, limit: 20, adminAddress: adminAddress })
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.details || data.error);
      setOffers(data.offers || []);
      if (!priceInput) setPriceInput(bestPrice || "");
    } catch (e: any) {
      setError(e.message || "Falha ao carregar ofertas");
    } finally {
      setLoading(false);
    }
  }

  async function createOffer() {
    if (!profile || profile === "admin") {
      alert("Selecione um investidor na página inicial");
      return;
    }
    let finalPrice = priceInput;
    const sellNum = parseFloat(amountSell);
    const buyNum = parseFloat(amountBuy);


    if (!isNaN(sellNum) && sellNum > 0 && !isNaN(buyNum) && buyNum > 0) {
      finalPrice = String(buyNum / sellNum);
    }
    if ((!finalPrice || isNaN(parseFloat(finalPrice))) || (isNaN(sellNum) && isNaN(buyNum))) return;

    // Encontrar o admin do investidor selecionado
    const selectedInvestor = state!.investors.find(inv => inv.address === profile);
    const adminAddress = selectedInvestor ? findAdminAddressByCrowdfundingId(state, selectedInvestor.crowdfunding_id) : null;
    
    if (!adminAddress) {
      alert("Admin não encontrado para este investidor");
      return;
    }

    const takerGets = { currency: sell, issuer: adminAddress, value: String(sellNum) };
    const takerPays = { currency: buy, issuer: adminAddress, value: String(buyNum) };

    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/offers/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ investorAddress: profile, takerGets, takerPays })
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        if (data.error === 'insufficient_balance') {
          toast.error("Saldo insuficiente", {
            description: "Carteira não possui saldo suficiente para criar esta oferta."
          });
          return;
        }
        throw new Error(data.details || data.error);
      }
      if (data.result.meta.TransactionResult === 'tecNO_AUTH' || data.result.meta.TransactionResult === 'tecNO_LINE') {
        toast.error("Carteira sem autorização", {
          description: "Não foi possível criar a oferta pois carteira não possui trustline para o ativo selecionado." 
        });
        return;
      }
      toast.success("Oferta criada com sucesso", {
        description: new Date(data.result.close_time_iso).toLocaleDateString("pt-BR", { dateStyle: "long" }),
        action: {
          label: "Ver transação",
          onClick: () => window.open(`https://testnet.xrpl.org/transactions/${data.result.hash}`, "_blank"),
        },
      })
      await fetchOffers();
    } catch (e: any) {
      setError(e.message || "Falha ao criar oferta");
    } finally {
      setLoading(false);
    }
  }

  // Auto-fetch offers when sell or buy changes
  useEffect(() => {
    if (sell && buy && sell !== buy) {
      fetchOffers();
    }
  }, [sell, buy]);

  // Auto-fetch balance when token changes
  useEffect(() => {
    if (selectedToken && profile && state) {
      fetchBalance();
    }
  }, [selectedToken, profile, state]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-6 space-y-4 max-w-7xl mx-auto">
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-2xl font-bold">Painel de Ofertas</h1>
          <div className="text-sm text-gray-600 gap-2 flex gap-4">
            <p>Perfil: {profile === 'admin' ? 'Admin' : (state?.investors.find(i => i.address === profile)?.name || '—')}</p>
            <p>Carteira: {profile === 'admin' ? state?.admin[0]?.address : state?.investors.find(i => i.address === profile)?.address}</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm border py-0.5 px-0.5">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <label className="text-sm font-medium text-gray-700 pl-0.5 font-semibold">Token:</label>
              <Select value={selectedToken} onValueChange={setSelectedToken}>
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
                {balanceLoading ? <ClipLoader color="#666" size={16} /> : `${Number(balance) % 1 === 0 ? Number(balance).toString() : Number(balance).toFixed(4)} ${selectedToken}`}
              </div>
            </div>
          </div>
        </div>
          
          <div className="space-x-2">
            <Link href="/">
              <Button variant="outline" className="flex items-center gap-2">Trocar perfil <LogOut className="w-4 h-4" /></Button>
            </Link>
          </div>
        </div>

        {/* Balance Section */}
        

        <div className="flex items-center justify-between gap-2 mt-16">

        <div className="flex items-center gap-3">
          <Select value={sell} onValueChange={setSell}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {sellOptions.map((option) => (
                <SelectItem key={option.value} value={option.value} disabled={option.disabled}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => {
              const tempSell = sell;
              const tempAmountSell = amountSell;
              setSell(buy);
              setBuy(tempSell);
              setAmountSell(amountBuy);
              setAmountBuy(tempAmountSell);
              setPriceInput("");
            }}
            className="rounded-full p-2"
            aria-label="Trocar lados"
            title="Trocar lados"
          >
            <ArrowUpDown className="w-4 h-4" />
          </Button>
          <Select value={buy} onValueChange={setBuy}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {buyOptions.map((option) => (
                <SelectItem key={option.value} value={option.value} disabled={option.disabled}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Sheet>
          <SheetTrigger asChild>
            <Button>Enviar oferta</Button>
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Enviar oferta</SheetTitle>
              <SheetDescription>
                Envie uma oferta para comprar ou vender um token.
              </SheetDescription>

            <div className="w-full space-y-4 mt-4">
              <div className="w-full">
                <label className="block text-xs text-gray-600 mb-1">Sell</label>
                <Input id="sell-input" value={sell} readOnly className="w-full !bg-gray-100 !text-gray-500 cursor-not-allowed hover:!bg-gray-100 focus:!bg-gray-100 focus:!ring-0 focus:!outline-none focus:!border-gray-300" />
              </div>

              <div className="w-full">
                <label className="block text-xs text-gray-600 mb-1">Quantidade ({sell})</label>
                <Input type="number" id="amount-sell" placeholder={`Quantidade em ${sell}`} value={amountSell} onChange={(e) => {
                  const v = e.target.value; 
                  setAmountSell(v);
                  const sn = parseFloat(v); 
                  const bn = parseFloat(amountBuy);
                  if (sn > 0 && bn > 0) {
                    setPriceInput(String(bn / sn));
                  } else {
                    setPriceInput("");
                  }
                }} className="w-full" />
              </div>

              <div className="w-full flex items-center justify-center">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => {
                    const tempSell = sell;
                    const tempAmountSell = amountSell;
                    setSell(buy);
                    setBuy(tempSell);
                    setAmountSell(amountBuy);
                    setAmountBuy(tempAmountSell);
                    setPriceInput("");
                  }}
                  className="rounded-full p-2"
                >
                  <ArrowUpDown className="w-4 h-4" />
                </Button>
              </div>

              <div className="w-full mt-6">
                <label className="block text-xs text-gray-600 mb-1">Buy</label>
                <Input id="buy-input" value={buy} readOnly className="w-full !bg-gray-100 !text-gray-500 cursor-not-allowed hover:!bg-gray-100 focus:!bg-gray-100 focus:!ring-0 focus:!outline-none focus:!border-gray-300" />
              </div>

              <div className="w-full">
                <label className="block text-xs text-gray-600 mb-1">Quantidade ({buy})</label>
                <Input type="number" id="amount-buy" placeholder={`Quantidade em ${buy}`} value={amountBuy} onChange={(e) => {
                  const v = e.target.value; 
                  setAmountBuy(v);
                  const sn = parseFloat(amountSell); 
                  const bn = parseFloat(v);
                  if (sn > 0 && bn > 0) {
                    setPriceInput(String(bn / sn));
                  } else {
                    setPriceInput("");
                  }
                }} className="w-full" />
              </div>

              

              <div className="w-full">
                <Button onClick={createOffer} disabled={loading || !state} className="w-full">{loading ? <ClipLoader color="#fff" size={16} /> : "Enviar oferta"}</Button>
              </div>
            </div>

            </SheetHeader>
          </SheetContent>
        </Sheet>
        </div>

        
        <OffersTable offers={offers ?? []} loading={loading} buy={buy} sell={sell} />
      </div>
    </div>
  );
}
