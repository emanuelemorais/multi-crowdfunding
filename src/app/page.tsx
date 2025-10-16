"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Link from "next/link";
import { PocState } from "@/app/api/common/utils";


export default function Home() {
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<string | null>(null);
  const [crowdfundingId, setCrowdfundingId] = useState<string | null>(null);
  const [state, setState] = useState<PocState | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [adminAddress, setAdminAddress] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/state', { method: 'GET' });
        console.log(res);
        if (res.ok) {
          const data = await res.json();
          setState(data);
        }
      } catch (_) {}
      finally { setLoading(false); }
    })();
  }, []);

  useEffect(() => {
    if (profile) localStorage.setItem("xrpl_poc_investor", profile);
    if (adminAddress) localStorage.setItem("xrpl_poc_admin", adminAddress);
  }, [profile, adminAddress]);

  const investorOptions = useMemo(() => (state?.investors ?? []).map(inv => ({ id: inv.id, label: inv.name, value: inv.address, crowdfunding_id: inv.crowdfunding_id })), [state]);
  const adminOptions = useMemo(() => (state?.admin ?? []).map(adm => ({ id: adm.id, name: adm.name, admin_name: adm.admin_name, adminAddress: adm.address })), [state]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-lg border p-8 space-y-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Multi-Crowdfund Dashboard</h1>
            <p className="text-gray-600">Selecione seu perfil para começar</p>
          </div>

          {loading && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-gray-600 text-sm">
              Carregando...
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-600 text-sm">
              {error}
            </div>
          )}

          <div className="space-y-4">

              <Select
                value={adminAddress && adminOptions.find(o => o.adminAddress === adminAddress) ? adminAddress : ''}
                onValueChange={(v: string) => setAdminAddress(v)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione um administrador de Crowdfunding" />
                </SelectTrigger>
                <SelectContent>
                  {adminOptions.map((option) => (
                    <SelectItem key={option.adminAddress} value={option.adminAddress}>
                      Crowdfunding {option.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              { adminAddress && (
              <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                <div className="text-sm text-gray-600">
                  <span className="font-medium">Perfil atual:</span> Crowdfunding {adminOptions.find(o => o.adminAddress === adminAddress)?.name}
                </div>
                {adminAddress && (
                  <Link href="/admin" className="block">
                    <Button variant="outline" className="w-full">
                      Ir para painel de administração
                    </Button>
                  </Link>
                )}
              </div>
            )}

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">ou</span>
              </div>
            </div>

            <div className="w-full">
              <Select
                value={crowdfundingId && adminOptions.find(o => o.id === crowdfundingId) ? crowdfundingId : ''}
                onValueChange={(v: string) => setCrowdfundingId(v)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione uma plataforma de Crowdfunding" />
                </SelectTrigger>
                <SelectContent>
                  {adminOptions.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      Crowdfunding {option.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {crowdfundingId && (
              <div className="w-full">
                <Select
                  value={profile && investorOptions.find(o => o.value === profile) ? profile : ''}
                  onValueChange={(v: string) => setProfile(v)}
                >
            
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione um investidor" />
                  </SelectTrigger>
                  <SelectContent>
                    {investorOptions
                      .filter(option => option.crowdfunding_id === crowdfundingId)
                      .map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            { profile && (
              <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                <div className="text-sm text-gray-600">
                  <span className="font-medium">Perfil atual:</span> {profile === 'admin' ? 'Admin' : (() => {
                    const investor = state?.investors.find(i => i.address === profile);
                    const admin = state?.admin.find(a => a.id === investor?.crowdfunding_id);
                    return investor && admin ? `Crowdfunding ${admin.name} - ${investor.name}` : 'Nenhum';
                  })()}
                </div>
                {profile && profile !== 'admin' && (
                  <Link href="/offers" className="block">
                    <Button variant="outline" className="w-full">
                      Ir para ofertas
                    </Button>
                  </Link>
                )}
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-gray-200">
            <Link href="/poc" className="block">
              <Button variant="ghost" size="sm" className="w-full text-gray-500 hover:text-gray-700">
                Inicializar POC
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
