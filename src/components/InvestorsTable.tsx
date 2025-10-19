"use client";

import { useState } from "react";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";

type TokenInfo = { label: string; code: string; issuer: string };
type Props = {
  grouped: Record<string, { name?: string; currencies: string[] }>; // wallet -> details
  allTokens: TokenInfo[]; // originals and wrapped with issuer
};

export function InvestorsTable({ grouped, allTokens }: Props) {
  const entries = Object.entries(grouped);

  function TokenAddDialog({ wallet, tokens }: { wallet: string; tokens: TokenInfo[] }) {
    const [selected, setSelected] = useState<string>(tokens[0]?.label ?? "");
    const [submitting, setSubmitting] = useState(false);
    async function submit() {
      if (!selected) return;
      const t = tokens.find(x => x.label === selected);
      if (!t) return;
      try {
        setSubmitting(true);
        await fetch('/api/trustline', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ walletAddress: wallet, currency: t.code, issuer: t.issuer })
        });
      } finally {
        setSubmitting(false);
      }
    }
    return (
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button size="sm">Adicionar</Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Adicionar trustline</AlertDialogTitle>
            <AlertDialogDescription>
              Selecione um token para criar trustline nesta carteira.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {tokens.length === 0 ? (
            <div className="text-sm text-gray-600 text-center">Nenhum token pendente</div>
          ) : (
            <div className="flex items-center gap-2">
              <Select value={selected} onValueChange={setSelected}>
                <SelectTrigger className="w-56">
                  <SelectValue placeholder="Selecione um token" />
                </SelectTrigger>
                <SelectContent>
                  {tokens.map((t, i) => (
                    <SelectItem key={i} value={t.label}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button size="sm" onClick={submit} disabled={!selected || submitting}>{submitting ? 'Criando...' : 'Criar trustline'}</Button>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Fechar</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }
  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">Investidores</h2>
      <div className="bg-white rounded-lg shadow-sm border">
        <Table className="w-full">
          <TableHeader className="bg-gray-100">
            <TableRow>
              <TableHead className="text-center font-bold text-gray-600">Investidor</TableHead>
              <TableHead className="text-center font-bold text-gray-600">Carteira</TableHead>
              <TableHead className="text-center font-bold text-gray-600">Tokens com Trustline</TableHead>
              <TableHead className="text-center font-bold text-gray-600">Ações</TableHead>
              <TableHead className="text-center font-bold text-gray-600">Trustlines</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map(([wallet, details]) => {
              const missing = allTokens.filter(t => !details.currencies.includes(t.label));
              console.log('details', details);
              console.log('allTokens', allTokens);
              console.log('missing', missing);
              return (
              <TableRow key={wallet} className="hover:bg-gray-50">
                <TableCell className="text-center py-3 font-mono text-sm">{details.name || "—"}</TableCell>
                <TableCell className="text-center py-3 font-mono text-sm">{wallet}</TableCell>
                <TableCell className="text-center py-3">
                  <div className="flex flex-wrap gap-1 justify-center">
                    {details.currencies.map((currency, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full"
                      >
                        {currency}
                      </span>
                    ))}
                  </div>
                </TableCell>
                <TableCell className="text-center py-3">
                  <div className="flex items-center justify-center gap-2">
                    <Link
                      href={`https://testnet.xrpl.org/accounts/${wallet}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 hover:text-blue-600 transition-colors"
                    >
                      Ver conta
                      <ExternalLink className="w-4 h-4" />
                    </Link>
                    
                  </div>
                </TableCell>
                <TableCell className="text-center py-3">
                  <div className="flex items-center justify-center gap-2">
                    <TokenAddDialog wallet={wallet} tokens={missing} />
                  </div>
                </TableCell>
              </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}




