import { NextResponse } from 'next/server';
import xrpl from 'xrpl';
import { neon } from '@neondatabase/serverless';
import { setTrustLine } from '../common/utils';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    let { walletAddress, currency, issuer, limit = '1000000' } = body as {
      walletAddress: string;
      currency: string;
      issuer: string;
      limit?: string;
    };

    if (!walletAddress || !currency || !issuer) {
      return NextResponse.json({ error: 'missing_parameters' }, { status: 400 });
    }
    // Look up wallet secret from DB if not provided

    const sql = neon(process.env.DATABASE_URL as string);
    const adminRows = await sql`select * from crowdfundings where address = ${issuer} limit 1` as any;
    const admin = adminRows?.[0];

    const investorRows = await sql`select * from crowdfunding_investors where address = ${walletAddress} limit 1` as any;
    const investor = investorRows?.[0];

    const client = new xrpl.Client('wss://s.altnet.rippletest.net:51233');
    await client.connect();

    try {
      const investorWallet = xrpl.Wallet.fromSeed(investor.secret);

      // Ensure walletAddress matches
      if (investorWallet.address !== investor.address) {
        return NextResponse.json({ error: 'wallet_mismatch' }, { status: 400 });
      }

      // Check if trustline already exists
      const existing = await client.request({
        command: 'account_lines',
        account: investorWallet.address,
        ledger_index: 'validated',
        peer: issuer
      });
      const has = (existing.result.lines ?? []).some((l: any) => l.currency === currency && (l.account === issuer));
      if (has) {
        return NextResponse.json({ status: 'exists' }, { status: 200 });
      }

      // Get issuer wallet from DB
      
      const issuerWallet = xrpl.Wallet.fromSeed(admin.secret);

      await setTrustLine(client, investorWallet, issuerWallet, currency, limit);

      return NextResponse.json({ status: 'created' }, { status: 201 });
    } finally {
      client.disconnect();
    }
  } catch (e: any) {
    return NextResponse.json({ error: 'failed_to_create_trustline', details: e?.message ?? String(e) }, { status: 500 });
  }
}

export const runtime = 'nodejs';
