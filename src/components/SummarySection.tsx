"use client";

import React from "react";

type Summary = {
  totalTrustLinesInvestors: number;
  totalTrustLinesAdmins: number;
  currenciesList: string[];
};

type Line = { account: string; currency: string; balance: string; limit: string };

type Props = {
  summary: Summary;
  originalTokensTrustLines: Array<Line>;
  wrappedTokensTrustLines: Array<Line>;
};

export function SummarySection({ summary, originalTokensTrustLines, wrappedTokensTrustLines }: Props) {
  return (
    <div className="bg-white rounded-lg shadow-sm border p-4">
      <h2 className="text-lg font-semibold mb-3">Resumo</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="text-center">
          <p className="text-2xl font-bold text-blue-600">{summary.totalTrustLinesInvestors}</p>
          <p className="text-sm text-gray-600">Total Trust Lines Investidores</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-green-600">{summary.totalTrustLinesAdmins}</p>
          <p className="text-sm text-gray-600">Total Trust Lines Entre Crowdfundings</p>
        </div>
        <div className="text-center">
          <div className="flex flex-wrap gap-1 justify-center mb-2">
            {originalTokensTrustLines.map((token, index) => (
              <span
                key={index}
                className="px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded-full"
              >
                {token.currency}
              </span>
            ))}
          </div>
          <p className="text-sm text-gray-600">Tokens originais emitidos pelo crowdfunding</p>
        </div>

        <div className="text-center">
          <div className="flex flex-wrap gap-1 justify-center mb-2">
            {
            wrappedTokensTrustLines.length > 0 ? (
            wrappedTokensTrustLines.map((token, index) => (
              <span
                key={index}
                className="px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded-full"
              >
                {token.currency} Wrapped
              </span>
              ) )
            ) : (
              <span
                className="px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded-full"
              >
                -
              </span>
            )}
          </div>
          <p className="text-sm text-gray-600">Tokens wrapped emitidos</p>
        </div>
      </div>
    </div>
  );
}


