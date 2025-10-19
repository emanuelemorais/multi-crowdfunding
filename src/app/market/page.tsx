"use client";
import { useEffect, useMemo, useState } from "react";
import { MarketOfferCard } from "@/components/MarketOfferCard";
import { InvestorsHeader } from "@/components/InvestorHeader";
import { toast } from "sonner";
import { ClipLoader } from "react-spinners";


type OtherCrowdfundingsBalances = {
  currency: string;
  balance: string;
  emissor: string;
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
  const [selectedToken, setSelectedToken] = useState<string>("XRP");
  const [balance, setBalance] = useState<string>("");
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [loading, setLoading] = useState(false);


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

  async function handleBuy(quantity: string, currency: string, originalIssuer: string, crowdfundingAdminWallet: string) {
    const investor = state?.investors.find(i => i.address === profile);
    if (!investor) return;

    let res;
    setLoading(true);
    toast.info('Compra em andamento... ');
    if (originalIssuer === crowdfundingAdminWallet) {
      res = await fetch("/api/market/mint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ buyerAddress: investor.address, quantity, currency, originalIssuer, crowdfundingAdminWallet, pricePerToken: 0.5}),
      });
    } else {
      res = await fetch("/api/market/wrapped", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ buyerAddress: investor.address, quantity, currency, originalIssuer, crowdfundingAdminWallet, pricePerToken: 0.5}),
      });   
    }
    setLoading(false);

    if (!res.ok) {
      const error = await res.json();
      if (error.error === 'trustline_not_found') {
        toast.error('Conta não possui trustline com token selecionado.');
        return;
      }
      if (error.error === 'not_enough_available') {
        toast.error('Saldo insuficiente para comprar.');
        return;
      }
      toast.error('Erro ao comprar');
      console.error('Failed to buy', error);
      return;
    }
    const data = await res.json();
    toast.success('Compra realizada com sucesso',
      {
        action: {
          label: 'Ver transação',
          onClick: () => window.open(`https://testnet.xrpl.org/transactions/${data.result.hash}`, '_blank'),
        },
      }
    );

    const walletAddress = localStorage.getItem("xrpl_poc_admin");
    if (walletAddress) setAdminAddress(walletAddress);
    (async () => {
      const res = await fetch(`/api/market?adminAddress=${walletAddress}`);
      const data = await res.json();
      setMarketOffersData(Array.isArray(data) ? data : []);
    })();
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

  useEffect(() => {
    if (selectedToken && profile && state) {
      fetchBalance();
    }
  }, [selectedToken, profile, state]);

  const tokenOptions = useMemo(() => {
    const cs = state?.currencies ?? [];
    const flattened = cs.map((c: any) => typeof c === 'string' ? { code: c, link: undefined } : c);
    return flattened.map(c => ({ label: c.code, value: c.code })).concat([{ label: "XRP", value: "XRP" }]);
  }, [state]);

  return (
    <div className="min-h-screen bg-gray-50">

      <div className="p-6 max-w-7xl mx-auto">
        < InvestorsHeader
          title="Mercado Primario"
          profile={profile}
          state={state}
          selectedToken={selectedToken}
          onTokenChange={setSelectedToken}
          tokenOptions={tokenOptions}
          balance={balance}
          balanceLoading={balanceLoading}
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
          {(marketOffersData ?? []).map((item: OtherCrowdfundingsBalances, idx) => (
            item.available > 0 && (
            <MarketOfferCard
              key={`${item.currency}-${item.emissor}-${idx}`}
              item={item}
              onBuy={handleBuy}
              adminAddress={adminAddress}
              loading={loading}
            />
            )
          ))}
        </div>
      </div>
    </div>
  );
}