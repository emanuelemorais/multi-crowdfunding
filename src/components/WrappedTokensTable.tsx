"use client";

import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type Line = { account: string; currency: string; balance: string; limit: string; emitted: string };

type Props = {
  issuer: string;
  lines: Array<Line>;
};

export function WrappedTokensTable({ issuer, lines }: Props) {
  return (
    <div className="mb-8">
      <h2 className="text-lg font-semibold mb-4">Wrapped tokens emitidos</h2>
      <div className="bg-white rounded-lg shadow-sm border">
        <Table className="w-full">
          <TableHeader className="bg-gray-100">
            <TableRow>
              <TableHead className="text-center font-bold text-gray-600">Crowdfund Emissor</TableHead>
              <TableHead className="text-center font-bold text-gray-600">Code</TableHead>
              <TableHead className="text-center font-bold text-gray-600">Quantidade onHold</TableHead>
              <TableHead className="text-center font-bold text-gray-600">Quantidade emitida</TableHead>
              <TableHead className="text-center font-bold text-gray-600">Ver Token Original do Crowdfund Emissor</TableHead>
              <TableHead className="text-center font-bold text-gray-600">Ver Wrapped Token</TableHead>
              <TableHead className="text-center font-bold text-gray-600"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lines.map((line, index) => (
              <TableRow key={index} className="hover:bg-gray-50">
                <TableCell className="text-center py-3 font-mono text-sm">
                  {line.account}
                </TableCell>
                <TableCell className="text-center py-3">{line.currency}</TableCell>
                <TableCell className="text-center py-3">{line.balance}</TableCell>
                <TableCell className="text-center py-3">{line.emitted}</TableCell>
                <TableCell className="text-center py-3">
                  <Link
                    href={`https://testnet.xrpl.org/token/${line.currency}.${line.account}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 hover:text-blue-600 transition-colors"
                  >
                    Acessar onChain
                    <ExternalLink className="w-4 h-4" />
                  </Link>
                </TableCell>
                <TableCell className="text-center py-3">
                  <Link
                    href={`https://testnet.xrpl.org/accounts/${issuer}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 hover:text-blue-600 transition-colors"
                  >
                    Acessar onChain
                    <ExternalLink className="w-4 h-4" />
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}


