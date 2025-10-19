import { NextResponse } from "next/server";
import xrpl from "xrpl";
import { loadState } from "../common/utils";
import { neon } from "@neondatabase/serverless";
import { url } from "inspector";
import { checkAvailableBalance } from "../common/utils";

type MarketBalance = {
  emissor: string;
  currency: string;
  available: string;
};


export async function GET(req: Request) {
  
  try {
    const client = new xrpl.Client('wss://s.altnet.rippletest.net:51233');
    await client.connect();

    const state = await loadState();
    if (!state) return NextResponse.json({ error: 'state_not_found' }, { status: 404 });

    const sql = neon(process.env.DATABASE_URL as string);
    const url = new URL(req.url);

    const adminAddress = url.searchParams.get('adminAddress');
    if (!adminAddress) return NextResponse.json({ error: 'adminAddress parameter required' }, { status: 400 });

    const crowdfundingId = await sql`select id from crowdfundings where address = ${adminAddress}` as any;
    if (!crowdfundingId) return NextResponse.json({ error: 'crowdfunding_id_not_found' }, { status: 404 });
    const crowdfunding_currencies = await sql`select * from crowdfunding_currencies where crowdfunding_id = ${crowdfundingId[0].id}` as any;

    const adminsData = await sql`select * from crowdfundings where address = ${adminAddress}` as any;
    const adminData = adminsData[0];
    if (!adminData) return NextResponse.json({ error: 'admin_not_found' }, { status: 404 });

    const otherAdmins = await sql`select * from crowdfundings where address != ${adminAddress}` as any;
    if (!otherAdmins) return NextResponse.json({ error: 'other_admins_not_found' }, { status: 404 });

    const tokens = await sql`select * from crowdfunding_currencies` as any;
    if (!tokens) return NextResponse.json({ error: 'tokens_not_found' }, { status: 404 });

    const otherTokens = tokens.filter((token: any) => token.crowdfunding_id !== adminData.id);
    if (!otherTokens) return NextResponse.json({ error: 'other_tokens_not_found' }, { status: 404 });

    const lines = await client.request({ command: "account_lines", account: adminAddress })

    const crowdfundingBalances: MarketBalance[] = [];
    for (const currency of crowdfunding_currencies) {
      const crowdfundingLines = lines.result.lines.filter(line => line.currency === currency.code && line.balance !== '0');
      let currencyQty = 0;
      for (const line of crowdfundingLines) {
        if (line.currency === currency.code) {
          currencyQty += (Math.abs(Number(line.balance)));
        }
      }
      crowdfundingBalances.push({
        emissor: adminAddress,
        currency: currency.code,
        available: (Number(currency.maxquantity) - currencyQty).toString()
      });
    }

    const otherCrowdfundingsBalances = lines.result.lines.filter(
        (l: any) => otherTokens.some((token: any) => token.code === l.currency)
        && otherAdmins.some((admin: any) => admin.address === l.account)
    )

    const balancesWithAvailable: MarketBalance[] = await Promise.all(
      otherCrowdfundingsBalances.map(async (balance) => {
        const availableBalance = await checkAvailableBalance(client, adminAddress, balance.currency, balance.account);
        return {
          emissor: balance.account,
          currency: balance.currency,
          available: availableBalance.toString()
        };
      })
    );

    const allBalances = [...crowdfundingBalances, ...balancesWithAvailable];
        
    return NextResponse.json(allBalances);
  } catch (e: any) {
    return NextResponse.json({ error: 'failed_to_read_state', details: e?.message ?? String(e) }, { status: 500 });
  }
}