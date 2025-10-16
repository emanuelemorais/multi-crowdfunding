import { NextResponse } from 'next/server';
import xrpl from 'xrpl';
import { neon } from '@neondatabase/serverless';

// Uses Postgres to fetch admin issuer address; no local state file

export async function POST(req: Request) {
  try {
    const { sell, buy, limit = 20, adminAddress } = await req.json();
    const sql = neon(process.env.DATABASE_URL as string);
    
    const client = new xrpl.Client('wss://s.altnet.rippletest.net:51233');
    await client.connect();
    try {
      const book = await client.request({
        command: 'book_offers',
        limit,
        taker_gets: sell === 'XRP' ? { currency: 'XRP' } : { currency: sell, issuer: adminAddress },
        taker_pays: buy === 'XRP' ? { currency: 'XRP' } : { currency: buy, issuer: adminAddress }
      } as any);
      return NextResponse.json(book.result);
    } finally {
      client.disconnect();
    }
  } catch (e: any) {
    return NextResponse.json({ error: 'failed_to_fetch_offers', details: e?.message ?? String(e) }, { status: 500 });
  }
}

export const runtime = 'nodejs';


