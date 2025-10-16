import { neon } from '@neondatabase/serverless';
import xrpl from 'xrpl';

export type Investor = {
    id: string;
    name: string;
    address: string;
    secret: string;
    crowdfunding_id: string;
  };
  
export type CurrencyCrowdfunding = {
  id: string;
  code: string;
  crowdfunding_id: string;
}

export type WrappedToken = {
  id: string;
  currency_id: string;
  code: string;
  crowdfunding_id: string;
  created_at: string;
}

export type AdminCrowdfunding = {
  id: string;
  name: string;
  admin_name: string;
  address: string;
  secret: string;
};

export type PocState = {
    network: 'testnet';
    admin: AdminCrowdfunding[];
    investors: Investor[];
    currencies: CurrencyCrowdfunding[];
    wrappedTokens: WrappedToken[];
    distributed: boolean;
};

export async function loadState(): Promise<PocState | null> {
  const sql = neon(process.env.DATABASE_URL as string);
  const admins = await sql`select * from crowdfundings` as any;
  if (!admins || admins.length === 0) return null;

  const investors = await sql`select * from crowdfunding_investors` as any;
  const currencies = await sql`select * from crowdfunding_currencies` as any;
  const wrappedTokens = await sql`select * from wrapped_tokens` as any;

  if (!investors || investors.length === 0) return null;
  if (!currencies || currencies.length === 0) return null;

  return {
    network: 'testnet',
    admin: admins as AdminCrowdfunding[],
    investors: investors as Investor[],
    currencies: currencies as CurrencyCrowdfunding[],
    wrappedTokens: wrappedTokens as WrappedToken[],
    distributed: true
  };
}

export async function createFundedWallet(client: xrpl.Client) {
  const funded = await client.fundWallet();
  return funded.wallet as xrpl.Wallet;
}

export async function waitForAccountActivated(client: xrpl.Client, address: string, retries = 15, delayMs = 1000) {
  for (let i = 0; i < retries; i++) {
    try {
      const info = await client.request({
        command: 'account_info',
        account: address,
        ledger_index: 'validated'
      });
      if (info.result?.account_data?.Balance) return;
    } catch (_e) {}
    await new Promise(r => setTimeout(r, delayMs));
  }
  throw new Error(`Timeout waiting account activation: ${address}`);
}

export async function submitTx(client: xrpl.Client, wallet: xrpl.Wallet, tx: xrpl.SubmittableTransaction) {
  const prepared = await client.autofill(tx);
  const signed = wallet.sign(prepared);
  const res = await client.submitAndWait(signed.tx_blob);
  const engine = (res.result as any)?.engine_result as string | undefined;
  const meta = res.result?.meta as unknown;
  const code = typeof meta === 'string' ? engine : (meta as { TransactionResult?: string })?.TransactionResult ?? engine;
  if (code !== "tesSUCCESS") {
    throw new Error(`Transaction failed: ${code ?? "unknown"} for ${tx.TransactionType}`);
  }
  return res;
}

export function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function setTrustLine(
  client: xrpl.Client,
  holder: xrpl.Wallet,
  admin: xrpl.Wallet,
  currency: string,
  limit: string
) {

  await submitTx(client, holder, {
    TransactionType: "TrustSet",
    Account: holder.address,
    LimitAmount: { currency, issuer: admin.address, value: limit }
  });

  await sleep(200);

  await submitTx(client, holder, {
    TransactionType: "TrustSet",
    Account: holder.address,
    LimitAmount: { currency, issuer: admin.address, value: limit },
    Flags: xrpl.TrustSetFlags.tfClearNoRipple
  });

  await sleep(200);


  await submitTx(client, admin, {
    TransactionType: "TrustSet",
    Account: admin.address,
    LimitAmount: { currency, issuer: holder.address, value: "0" },
    Flags: xrpl.TrustSetFlags.tfSetfAuth
  });
}

export async function issueTokens(
  client: xrpl.Client,
  issuer: xrpl.Wallet,
  destination: string,
  currency: string,
  value: string
) {
  const tx: xrpl.Payment = {
    TransactionType: 'Payment',
    Account: issuer.address,
    Destination: destination,
    Amount: {
      currency,
      issuer: issuer.address,
      value
    }
  };
  const prepared = await client.autofill(tx);
  const signed = issuer.sign(prepared);
  await client.submitAndWait(signed.tx_blob);
}

export async function checkAvailableBalance(
  client: xrpl.Client, 
  adminAddress: string, 
  currency: string,
  issuer: string,
) {

  const lines = await client.request({ command: "account_lines", account: adminAddress })

  const tokenLine = lines.result.lines.find(l => l.currency === currency && l.account === issuer);
  const originalTokenBalance = Number(tokenLine?.balance ?? 0);

  const response = await client.request({
      command: "gateway_balances",
      account: adminAddress,
      ledger_index: "validated",
      strict: true,
    });

    const obligations = response.result.obligations;

    if (!obligations || Object.keys(obligations).length === 0) {
      console.log("Nenhum token emitido por esta conta.");
      return originalTokenBalance;
    }

    const tokenBalance = Object.entries(obligations).find(o => o[0] === currency);

    if (!tokenBalance) return 0;
    return Number(originalTokenBalance - Number(tokenBalance[1]));
}