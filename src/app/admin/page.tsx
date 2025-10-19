"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import Link from "next/link";
import { SummarySection } from "../../components/SummarySection";
import { WrappedTokensTable } from "../../components/WrappedTokensTable";
import { InvestorsTable } from "../../components/InvestorsTable";

type AdminData = {
  crowdfundingName: string;
  issuer: string;
  summary: {
    totalTrustLinesInvestors: number;
    totalTrustLinesAdmins: number;
    currenciesList: string[];
  };
  wrappedTokensTrustLines: Array<{ account: string; currency: string; balance: string; limit: string }>;
  trustlineInvestorsByCurrency:  Record<string, Array<{ account: string; balance: string; limit: string, investor_name?: string }>>;
  originalTokensTrustLines: Array<{ account: string; currency: string; balance: string; limit: string }>;
};

export default function AdminPage() {
  const [data, setData] = useState<AdminData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const groupByWallet = (data: Record<string, Array<{ account: string; balance: string; limit: string, investor_name?: string }>>) => {
    const grouped: Record<string, { name?: string; currencies: string[] }> = {};
    Object.entries(data).forEach(([currency, lines]) => {
      lines.forEach(line => {
        if (!grouped[line.account]) {
          grouped[line.account] = { name: line.investor_name, currencies: [] };
        }
        if (!grouped[line.account].currencies.includes(currency)) {
          grouped[line.account].currencies.push(currency);
        }
        if (!grouped[line.account].name && line.investor_name) {
          grouped[line.account].name = line.investor_name;
        }
      });
    });
    return grouped;
  };

  useEffect(() => {
    async function fetchAdminData() {
      try {
        const adminAddress = localStorage.getItem("xrpl_poc_admin");
        const res = await fetch(`/api/admin?walletAddress=${adminAddress}`);
        const adminData = await res.json();
        if (!res.ok) throw new Error(adminData.error || 'Failed to fetch admin data');
        setData(adminData);
      } catch (e: any) {
        setError(e.message || 'Error fetching admin data');
      } finally {
        setLoading(false);
      }
    }
    fetchAdminData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-gray-600">Carregando dados admin...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <Link href="/">
            <Button variant="outline">Voltar</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-6 space-y-4 max-w-7xl mx-auto">
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-2xl font-bold">Painel do Administrador</h1>
          <div className="text-sm text-gray-600 gap-2 flex gap-4">
            <p>Perfil: Admin</p>
            <p>Crowdfunding: {data?.crowdfundingName}</p>
            <p>Endereço da Carteira: {data?.issuer}</p>
          </div>
          
          <div className="space-x-2">
            <Link href="/">
              <Button variant="outline" className="flex items-center gap-2">Trocar perfil <LogOut className="w-4 h-4" /></Button>
            </Link>
          </div>
        </div>

        {data && (
          <>
            <SummarySection 
              summary={data.summary}
              originalTokensTrustLines={data.originalTokensTrustLines}
              wrappedTokensTrustLines={data.wrappedTokensTrustLines}
            />

            <WrappedTokensTable issuer={data.issuer} lines={data.wrappedTokensTrustLines as any} />

            <InvestorsTable 
              grouped={groupByWallet(data.trustlineInvestorsByCurrency)} 
              allTokens={[
                ...data.originalTokensTrustLines.map(t => ({ label: t.currency, code: t.currency, issuer: t.account })),
                ...data.wrappedTokensTrustLines.map(t => ({ label: `${t.currency} Wrapped`, code: t.currency, issuer: data.issuer }))
              ].filter((tok, idx, arr) => arr.findIndex(x => x.label === tok.label) === idx)}
            />
          </>
        )}

      </div>
    </div>
  );
}
