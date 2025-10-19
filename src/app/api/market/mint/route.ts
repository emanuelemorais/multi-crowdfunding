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

    if (Math.abs(available) < quantity) return NextResponse.json({ error: 'not_enough_available' }, { status: 400 });
    
    const sql = neon(process.env.DATABASE_URL as string);
    const issuerRows = await sql`select * from crowdfundings where address = ${originalIssuer} limit 1` as any;
    const issuer = issuerRows?.[0];
    if (!issuer) return NextResponse.json({ error: 'issuer_not_found' }, { status: 404 });
    
    const issuerWallet = xrpl.Wallet.fromSeed(issuer.secret);

    const amountXrp = pricePerToken * quantity;

    const rows = await sql`select * from crowdfunding_investors where address = ${buyerAddress} limit 1` as any;
    const buyer = rows?.[0];
    if (!buyer) return NextResponse.json({ error: 'buyer_not_found' }, { status: 404 });
    const buyerWallet = xrpl.Wallet.fromSeed(buyer.secret);

    const payment: xrpl.Payment = {
        TransactionType: "Payment",
        Account: buyerAddress,
        Destination: crowdfundingAdminWallet,
        Amount: xrpToDrops(amountXrp), 
    };

    const txToSubmit = await client.autofill(payment);

    const signed = buyerWallet.sign(txToSubmit);
    const res2 = await client.submitAndWait(signed.tx_blob);
    const txResult2 = (res2.result as any)?.meta?.TransactionResult ?? (res2.result as any)?.engine_result;

    if (txResult2 === "tesSUCCESS") {
        const res = await issueTokens(client, issuerWallet, buyerAddress, currency, String(quantity));
        await new Promise(r => setTimeout(r, 500));

        const txResult = (res.result as any)?.meta?.TransactionResult ?? (res.result as any)?.engine_result;

        if (txResult === "telINSUF_FEE_P") {
            return NextResponse.json({ error: 'insufficient_fee' }, { status: 400 });
        }

        if (txResult === "tesSUCCESS") {
            return NextResponse.json({ result: res.result }, { status: 201 });
        } else {
            return NextResponse.json({ error: 'failed_to_mint', details: txResult }, { status: 400 });
        }

    } else {
        return NextResponse.json({ error: 'failed_to_mint', details: txResult2 }, { status: 400 });
    }

}
