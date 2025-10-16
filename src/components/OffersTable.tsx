"use client";

import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type Offer = {
  Account: string;
  TakerGets: any;
  TakerPays: any;
  quality?: string;
  PreviousTxnID: string;
};

type Props = {
  offers: Offer[] | undefined | null;
  loading: boolean;
  buy: string;
  sell: string;
};

function parseAmt(a: any): number {
  if (typeof a === 'string') return parseInt(a, 10) / 1_000_000;
  return parseFloat(a.value);
}

export function OffersTable({ offers, loading, buy, sell }: Props) {
  return (
    <div className="bg-white rounded-lg shadow-sm border">
      <Table className="w-full">
        <TableHeader className="bg-gray-100">
          <TableRow>
            <TableHead className="text-center font-bold text-gray-600 w-1/5">Carteira</TableHead>
            <TableHead className="text-center font-bold text-gray-600 w-1/5">Buy ({buy})</TableHead>
            <TableHead className="text-center font-bold text-gray-600 w-1/5">Sell ({sell})</TableHead>
            <TableHead className="text-center font-bold text-gray-600 w-1/5">Price ({sell}/{buy})</TableHead>
            <TableHead className="text-center font-bold text-gray-600 w-1/5">Transação</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center py-10">Carregando ofertas...</TableCell>
            </TableRow>
          ) : ((offers ?? []).length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center py-8">Nenhuma oferta</TableCell>
            </TableRow>
          ) : (
            (offers ?? []).map((o, idx) => {
              const takerPays = parseAmt(o.TakerPays);
              const takerGets = parseAmt(o.TakerGets);
              const price = takerGets / takerPays;
              return (
                <TableRow key={idx} className="hover:bg-gray-50">
                  <TableCell className="text-center py-3">{o.Account.slice(0, 6)}…{o.Account.slice(-4)}</TableCell>
                  <TableCell className="text-center py-3">{takerPays.toLocaleString(undefined, { maximumFractionDigits: 8 })} {buy}</TableCell>
                  <TableCell className="text-center py-3">{takerGets.toLocaleString()} {sell}</TableCell>
                  <TableCell className="text-center py-3">{price.toLocaleString(undefined, { maximumFractionDigits: 8 })} {sell}/{buy}</TableCell>
                  <TableCell className="text-center py-3">
                    <Link href={`https://testnet.xrpl.org/transactions/${o.PreviousTxnID}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 hover:text-blue-600 transition-colors">
                      {o.PreviousTxnID.slice(0, 6)}…{o.PreviousTxnID.slice(-4)}
                      <ExternalLink className="w-4 h-4" />
                    </Link>
                  </TableCell>
                </TableRow>
              );
            })
          ))}
        </TableBody>
      </Table>
    </div>
  );
}


