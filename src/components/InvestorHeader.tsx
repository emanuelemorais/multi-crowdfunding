import Link from "next/link";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { TokenSelector } from "@/components/TokenSelector";

type State = {
  admin: Array<{ id: number; name: string; address: string; secret: string }>;
  investors: { id: number; name: string; address: string; secret: string; crowdfunding_id: number }[];
  currencies: Array<{ id: number; code: string; crowdfunding_id: number }>;
  wrappedTokens: Array<{ id: number; currency_id: number; code: string; crowdfunding_id: number; created_at: string }>;
  network: string;
  distributed: boolean;
};

type TokenOption = {
  value: string;
  label: string;
};

type OffersHeaderProps = {
  title: string;
  profile: string | null;
  state: State | null;
  selectedToken: string;
  onTokenChange: (token: string) => void;
  tokenOptions: TokenOption[];
  balance: string;
  balanceLoading: boolean;
};

export function InvestorsHeader({ 
  title,
  profile, 
  state, 
  selectedToken, 
  onTokenChange, 
  tokenOptions, 
  balance, 
  balanceLoading 
}: OffersHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-2">
      <h1 className="text-2xl font-bold">{title}</h1>
      <div className="text-sm text-gray-600 gap-2 flex gap-4">
        <p>Perfil: {profile === 'admin' ? 'Admin' : (state?.investors.find(i => i.address === profile)?.name || '—')}</p>
        <p>Carteira: {profile === 'admin' ? state?.admin[0]?.address : state?.investors.find(i => i.address === profile)?.address}</p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border py-0.5 px-0.5">
        <TokenSelector
          selectedToken={selectedToken}
          onTokenChange={onTokenChange}
          tokenOptions={tokenOptions}
          balance={balance}
          balanceLoading={balanceLoading}
        />
      </div>
      
      <div className="space-x-2">
        <Link href="/">
          <Button variant="outline" className="flex items-center gap-2">
            Trocar perfil <LogOut className="w-4 h-4" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
