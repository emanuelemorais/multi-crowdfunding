import { neon, NeonQueryFunction } from "@neondatabase/serverless";
import { NextResponse } from "next/server";
import xrpl from "xrpl";
import { xrpToDrops } from "xrpl";
import { setTrustLine, issueTokens, sleep } from "../../common/utils";
import { checkAvailableBalance } from "../../common/utils";


export async function POST(req: Request) {

    const { buyerAddress, quantity, currency, originalIssuer, crowdfundingAdminWallet, pricePerToken } = await req.json();
    if (!buyerAddress || !quantity || !currency || !originalIssuer || !crowdfundingAdminWallet) {
        return NextResponse.json({ error: 'missing_parameters' }, { status: 400 });
    }
    
    const client = new xrpl.Client('wss://s.altnet.rippletest.net:51233');
    await client.connect();

    const available = await checkAvailableBalance(client, crowdfundingAdminWallet, currency, originalIssuer);
    if (!available) return NextResponse.json({ error: 'not_available' }, { status: 400 });

    if (available < quantity) return NextResponse.json({ error: 'not_enough_available' }, { status: 400 });

    const sql = neon(process.env.DATABASE_URL as string);
    const rows = await sql`select * from crowdfunding_investors where address = ${buyerAddress} limit 1` as any;
    const buyer = rows?.[0];
    if (!buyer) return NextResponse.json({ error: 'buyer_not_found' }, { status: 404 });

    const adminRows = await sql`select * from crowdfundings where address = ${crowdfundingAdminWallet} limit 1` as any;
    const admin = adminRows?.[0];
    if (!admin) return NextResponse.json({ error: 'admin_not_found' }, { status: 404 });

    const issuerRows = await sql`select * from crowdfundings where address = ${originalIssuer} limit 1` as any;
    const issuer = issuerRows?.[0];
    if (!issuer) return NextResponse.json({ error: 'issuer_not_found' }, { status: 404 });
    
    const issuerWallet = xrpl.Wallet.fromSeed(admin.secret);
    
  
    const currencyRows = await sql`select id from crowdfunding_currencies where code = ${currency} and crowdfunding_id = ${issuer.id} limit 1` as any;
    const currencyId = currencyRows?.[0]?.id;
    if (!currencyId) return NextResponse.json({ error: 'currency_not_found' }, { status: 404 });

    const buyerWallet = xrpl.Wallet.fromSeed(buyer.secret);


    const amountXrp = pricePerToken * quantity;

    const lines = await client.request({ command: "account_lines", account: buyerWallet.address })
    const line = lines.result.lines.find(l => l.currency === currency && l.account === issuerWallet.address);
    if (!line) {
        return NextResponse.json({ error: 'trustline_not_found' }, { status: 404 });
    }

    try {
        const payment: xrpl.Payment = {
            TransactionType: "Payment",
            Account: buyerWallet.address,
            Destination: crowdfundingAdminWallet,
            Amount: xrpToDrops(amountXrp), 
        };

        const txToSubmit = await client.autofill(payment);

        const signed = buyerWallet.sign(txToSubmit);
        const res = await client.submitAndWait(signed.tx_blob);
        const txResult = (res.result as any)?.meta?.TransactionResult ?? (res.result as any)?.engine_result;

        if (txResult === "tesSUCCESS") {

            const res = await issueTokens(client, issuerWallet, buyerWallet.address, currency, String(quantity));
            console.log(`${quantity} ${currency} emitidos com sucesso para ${buyerWallet.address}`);

            await sql`INSERT INTO wrapped_tokens (currency_id, code, crowdfunding_id) VALUES (${currencyId}, ${currency}, ${admin.id}) ON CONFLICT (currency_id, code, crowdfunding_id) DO NOTHING`;

            return NextResponse.json({ result: res.result } , { status: 201 });

        }

        else {
            return NextResponse.json({ error: 'failed_to_buy', details: txResult }, { status: 400 });
        }
       

    } catch (e: any) {
        return NextResponse.json({ error: 'failed_to_buy', details: e?.message ?? String(e) }, { status: 500 });
    }
}
