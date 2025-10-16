import { NextResponse } from 'next/server';
import xrpl from 'xrpl';
import { neon } from '@neondatabase/serverless';

async function getTrustLinesForIssuer(
  client: xrpl.Client,
  issuerAddress: string
): Promise<Array<{ account: string; currency: string; balance: string; limit: string }>> {
  const resp = await client.request({
    command: 'account_lines',
    account: issuerAddress,
    ledger_index: 'validated'
  });
  
  const lines = resp.result.lines ?? [];
  return lines.map(line => ({
    account: line.account,
    currency: line.currency,
    balance: line.balance,
    limit: line.limit
  }));
}

export async function GET(req: Request) {
  const client = new xrpl.Client('wss://s.altnet.rippletest.net:51233');
  await client.connect();

  try {
    const sql = neon(process.env.DATABASE_URL as string);
    const adminWalletRows = await sql`select * from crowdfundings` as any;

    const wrappedTokensRows = await sql`select * from wrapped_tokens where crowdfunding_id = ${adminWalletRows[0].id}` as any;
    const wrappedTokens = wrappedTokensRows.map((row: any) => row.code);
    
    const url = new URL(req.url);
    const walletAddress = url.searchParams.get('walletAddress');
    if (!walletAddress) {
      return NextResponse.json({ error: 'walletAddress parameter required' }, { status: 400 });
    }
    
    const trustLines = await getTrustLinesForIssuer(client, walletAddress);

    const wrappedTokensTrustLines = trustLines.filter(line => 
      adminWalletRows.some((wallet: any) => wallet.address === line.account && wrappedTokens.includes(line.currency))
    );

    const originalTokensTrustLines = trustLines.filter(line => 
      adminWalletRows.some((wallet: any) => wallet.address === line.account && !wrappedTokens.includes(line.currency))
    );

    const trustLinesInvestorsWallets = trustLines.filter(line => 
      !adminWalletRows.some((wallet: any) => wallet.address === line.account)
    );    

    const investorsRows = await sql`select * from crowdfunding_investors` as any;

    const trustlineInvestorsByCurrency: Record<string, Array<{ investor_name: string; account: string; balance: string; limit: string }>> = {};

    for (const line of trustLinesInvestorsWallets) {
      if (wrappedTokens.includes(line.currency)) {
        line.currency = line.currency.replace(line.currency, `${line.currency} Wrapped`);
      }
      if (!trustlineInvestorsByCurrency[line.currency]) {
        trustlineInvestorsByCurrency[line.currency] = [];
      }
      trustlineInvestorsByCurrency[line.currency].push({
        investor_name: investorsRows.find((investor: any) => investor.address === line.account)?.name,
        account: line.account,
        balance: line.balance,
        limit: line.limit
      });
    }

   
    return NextResponse.json({
      crowdfundingName: adminWalletRows[0].name,
      issuer: walletAddress,
      summary: {
        totalTrustLinesInvestors: trustLinesInvestorsWallets.length,
        totalTrustLinesAdmins: wrappedTokensTrustLines.length + originalTokensTrustLines.length,
      },
      wrappedTokensTrustLines,
      originalTokensTrustLines,
      trustlineInvestorsByCurrency
    }, { status: 200 });

  } catch (e: any) {
    return NextResponse.json(
      { error: 'Failed to query trust lines from blockchain', details: e?.message ?? String(e) },
      { status: 500 }
    );
  } finally {
    client.disconnect();
  }
}

export const runtime = 'nodejs';