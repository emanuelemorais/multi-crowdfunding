import { NextResponse } from 'next/server';
import xrpl from 'xrpl';
import { neon } from '@neondatabase/serverless';
import { loadState } from '../common/utils';
import { createFundedWallet, waitForAccountActivated, submitTx, sleep, setTrustLine, issueTokens } from '../common/utils';

export async function GET() {
  console.log('=== INICIANDO SETUP XRPL POC ===');
  
  const existing = await loadState();
  if (existing) {
    console.log('Estado já existe, retornando estado atual');
    return NextResponse.json(existing, { status: 200 });
  }

  console.log('Setting up XRPL POC...');

  const client = new xrpl.Client('wss://s.altnet.rippletest.net:51233');
  console.log('Conectando ao XRPL testnet...');
  await client.connect();
  console.log('Conectado ao XRPL testnet com sucesso');
  
  try {
    console.log('Inicializando conexão com banco de dados...');
    const sql = neon(process.env.DATABASE_URL as string);
    console.log('Conexão com banco de dados estabelecida');

    console.log('Criando Admin 1...');
    const admin1 = await createFundedWallet(client);
    console.log(`Admin 1 criado: ${admin1.address}`);
    await waitForAccountActivated(client, admin1.address);
    console.log('Admin 1 ativado');

    console.log('Criando Admin 2...');
    const admin2 = await createFundedWallet(client);
    console.log(`Admin 2 criado: ${admin2.address}`);
    await waitForAccountActivated(client, admin2.address);
    console.log('Admin 2 ativado');

    const admins = [admin1, admin2];
    const investors: Record<string, any[]> = {};
    console.log('Todos os administradores criados e ativados');

    console.log('Configurando AccountSet para administradores...');
    for (const [idx, admin] of admins.entries()) {
        console.log(`Configurando Admin ${idx + 1} (${admin.address})`);
        investors[admin.address] = [];
        
        console.log(`Criando 2 investidores para Admin ${idx + 1}...`);
        for (let i = 0; i < 2; i++) {
            console.log(`Criando investidor ${i + 1} para Admin ${idx + 1}...`);
            const inv = await createFundedWallet(client);
            console.log(`Investidor ${i + 1} criado: ${inv.address}`);
            await waitForAccountActivated(client, inv.address);
            console.log(`Investidor ${i + 1} ativado`);
            investors[admin.address].push(inv);
        }
        console.log(`Todos os investidores do Admin ${idx + 1} criados`);

        console.log(`Configurando AccountSet para Admin ${idx + 1}...`);
        await submitTx(client, admin, {
          TransactionType: "AccountSet",
          Account: admin.address,
          SetFlag: xrpl.AccountSetAsfFlags.asfDefaultRipple 
          });
        console.log(`AccountSet asfDefaultRipple aplicado para Admin ${idx + 1}`);
        await sleep(200);
  
        await submitTx(client, admin, {
          TransactionType: "AccountSet",
          Account: admin.address,
          SetFlag: xrpl.AccountSetAsfFlags.asfRequireAuth 
          });
        console.log(`AccountSet asfRequireAuth aplicado para Admin ${idx + 1}`);
        await sleep(200);
    }
    console.log('Configuração AccountSet concluída para todos os administradores');


    const codes: Record<string, any[]> = {};

    codes[admin1.address] = ['TKA'];
    codes[admin2.address] = ['TKB'];
    console.log('Códigos de moedas definidos:');
    console.log(`Admin 1 (${admin1.address}): ${codes[admin1.address].join(', ')}`);
    console.log(`Admin 2 (${admin2.address}): ${codes[admin2.address].join(', ')}`);

    console.log('Criando trustlines entre administradores...');
    for (const [idx, admin] of admins.entries()) {
      console.log(`Processando Admin ${idx + 1} (${admin.address})`);
      for (const [otherIdx, otherAdmin] of admins.entries()) {
        if (admin.address !== otherAdmin.address) {
          console.log(`Criando trustlines do Admin ${idx + 1} para Admin ${otherIdx + 1}`);
          for (const currency of codes[otherAdmin.address]) {
            console.log(`Criando trustline para moeda ${currency} do Admin ${otherIdx + 1}`);
            await setTrustLine(client, admin, otherAdmin, currency, '1000000');
            console.log(`Trustline criada para ${currency}`);
            await sleep(200);
          }
        }
      }
    }
    console.log('Todas as trustlines entre administradores criadas');

    console.log('Emissão de tokens entre administradores...');
    for (const [idx, admin] of admins.entries()) {
      console.log(`Processando emissão para Admin ${idx + 1} (${admin.address})`);
      for (const [otherIdx, otherAdmin] of admins.entries()) {
        if (admin.address !== otherAdmin.address) {
          console.log(`Admin ${idx + 1} recebendo tokens do Admin ${otherIdx + 1}`);
          for (const currency of codes[otherAdmin.address]) {
            console.log(`Emitindo 5000 ${currency} do Admin ${otherIdx + 1} para Admin ${idx + 1}`);
            await issueTokens(client, otherAdmin, admin.address, currency, '5000');
            console.log(`5000 ${currency} emitidos com sucesso`);
            await sleep(200);
          }
        }
      }
    }
    console.log('Emissão de tokens entre administradores concluída');

    console.log('Criando trustlines entre investidores e administradores...');
    
    for (const [adminIdx, admin] of admins.entries()) {
      console.log(`Processando investidores do Admin ${adminIdx + 1} (${admin.address})`);
      for (const [idx, investor] of investors[admin.address].entries()) {
        console.log(`Processando investidor ${idx + 1} (${investor.address}) do Admin ${adminIdx + 1}`);
        const base = (idx + 1) * 1000;
        console.log(`Valor base para investidor ${idx + 1}: ${base}`);
        
        for (const cur of codes[admin.address]) {
          console.log(`Criando trustline para moeda ${cur} entre investidor ${idx + 1} e Admin ${adminIdx + 1}`);
          await setTrustLine(client, investor, admin, cur, '1000000');
          console.log(`Trustline criada para ${cur}`);
          await new Promise(r => setTimeout(r, 500));

          console.log(`Emitindo ${base} ${cur} para investidor ${idx + 1}`);
          await issueTokens(client, admin, investor.address, cur, String(base));
          console.log(`${base} ${cur} emitidos com sucesso`);
          await new Promise(r => setTimeout(r, 500));
        }
        console.log(`Investidor ${idx + 1} do Admin ${adminIdx + 1} processado com sucesso`);
      }
      console.log(`Todos os investidores do Admin ${adminIdx + 1} processados`);
    }
    console.log('Todas as trustlines e emissões para investidores concluídas');

    console.log('Inserindo dados no banco de dados...');
    // Primeiro, inserir todos os administradores e suas moedas
    const adminIds: Record<string, string> = {};
    const currencyIds: Record<string, string> = {};
    
    const indexToLetters = (index: number) => {
      let n = index;
      let result = '';
      while (n >= 0) {
        result = String.fromCharCode(65 + (n % 26)) + result;
        n = Math.floor(n / 26) - 1;
      }
      return result;
    };

    for (const [idx, admin] of admins.entries()) {
        console.log(`Inserindo Admin ${idx + 1} no banco de dados...`);
        const crowdfundingName = indexToLetters(idx); // A, B, C, ...
        const adminInserted = await sql`INSERT INTO crowdfundings (name, admin_name, address, secret) VALUES (${crowdfundingName}, ${`Admin-${crowdfundingName}`}, ${admin.address}, ${admin.seed ?? ''}) RETURNING id`;
        const adminId = (adminInserted as any)[0]?.id as string;
        adminIds[admin.address] = adminId;
        console.log(`Admin ${idx + 1} inserido com ID: ${adminId}`);

        console.log(`Inserindo moedas do Admin ${idx + 1}...`);
        for (const code of codes[admin.address]) {
            console.log(`Inserindo moeda ${code} para Admin ${idx + 1}`);
            const currencyInserted = await sql`INSERT INTO crowdfunding_currencies (code, crowdfunding_id) VALUES (${code}, ${adminId}) ON CONFLICT (code, crowdfunding_id) DO NOTHING RETURNING id`;
            let currencyId = (currencyInserted as any)[0]?.id as string;
            
            // Se não retornou ID (por conflito), buscar o ID existente
            if (!currencyId) {
                console.log(`Moeda ${code} já existe, buscando ID existente...`);
                const existingCurrency = await sql`SELECT id FROM crowdfunding_currencies WHERE code = ${code} AND crowdfunding_id = ${adminId}`;
                currencyId = (existingCurrency as any)[0]?.id as string;
            }
            
            currencyIds[`${admin.address}-${code}`] = currencyId;
            console.log(`Moeda ${code} com ID: ${currencyId}`);
        }

        console.log(`Inserindo investidores do Admin ${idx + 1}...`);
        var investorId = idx + 1;
        for (const [invIdx, investor] of investors[admin.address].entries()) {
            console.log(`Inserindo investidor ${invIdx + 1} do Admin ${idx + 1}`);
            await sql`INSERT INTO crowdfunding_investors (name, address, secret, crowdfunding_id) VALUES (${`Investor-${investorId}`}, ${investor.address}, ${investor.seed ?? ''}, ${adminId})`;
            investorId ++;
            console.log(`Investidor ${invIdx + 1} inserido com sucesso`);
        }
        console.log(`Admin ${idx + 1} e seus dados inseridos no banco`);
    }
    console.log('Todos os dados inseridos no banco de dados');

    console.log('Criando wrapped tokens baseados no saldo dos outros administradores...');
    
    // Para cada admin, criar wrapped tokens baseado no saldo conhecido (5000 tokens)
    for (const [idx, admin] of admins.entries()) {
        console.log(`Processando wrapped tokens para Admin ${idx + 1} (${admin.address})`);
        const adminId = adminIds[admin.address];
        
        for (const [otherIdx, otherAdmin] of admins.entries()) {
            if (admin.address !== otherAdmin.address) {
                console.log(`Admin ${idx + 1} criando wrapped tokens baseados nos tokens do Admin ${otherIdx + 1}`);
                for (const currency of codes[otherAdmin.address]) {
                    console.log(`Processando moeda ${currency} do Admin ${otherIdx + 1}`);
                    // Sabemos que cada admin tem 5000 tokens dos outros admins
                    const balance = 5000;
                    const wrappedAmount = Math.floor(balance * 0.5); // 50% do saldo como wrapped token (2500)
                    console.log(`Saldo base: ${balance}, Wrapped amount: ${wrappedAmount}`);
                    
                    // Criar trustline para o wrapped token
                    const wrappedCode = `${currency}`;
                    console.log(`Código do wrapped token: ${wrappedCode}`);
                    
                    console.log(`Criando trustlines e emitindo wrapped tokens para investidores do Admin ${idx + 1}`);
                    for (const [invIdx, investor] of investors[admin.address].entries()) {
                        
                        
                        console.log(`Emitindo ${wrappedAmount} ${wrappedCode} para investidor ${invIdx + 1}`);
                        // Emitir wrapped token para o investidor
                        if (invIdx !== 0){ // O primeiro investidor não recebe wrapped token

                          console.log(`Processando investidor ${invIdx + 1} (${investor.address})`);
                          console.log(`Criando trustline para ${wrappedCode}`);
                          await setTrustLine(client, investor, admin, wrappedCode, '1000000');
                          console.log(`Trustline criada para ${wrappedCode}`);
                          await sleep(200);

                          await issueTokens(client, admin, investor.address, wrappedCode, String(wrappedAmount));
                          console.log(`${wrappedAmount} ${wrappedCode} emitidos com sucesso`);
                          await sleep(200);
                        }
                        
                    }
                    // Salvar wrapped token na tabela
                    console.log(`Salvando wrapped token ${wrappedCode} no banco de dados`);
                    const originalCurrencyId = currencyIds[`${otherAdmin.address}-${currency}`];
                    console.log(`ID da moeda original: ${originalCurrencyId}`);
                    
                    await sql`INSERT INTO wrapped_tokens (currency_id, code, crowdfunding_id) VALUES (${originalCurrencyId}, ${wrappedCode}, ${adminId})`;
                    console.log(`Wrapped token ${wrappedCode} salvo no banco`);
                    
                    console.log(`✅ Criado wrapped token ${wrappedCode} para admin ${admin.address} baseado em ${balance} ${currency} de ${otherAdmin.address}`);
                }
            }
        }
        console.log(`Wrapped tokens do Admin ${idx + 1} processados`);
    }
    console.log('Todos os wrapped tokens criados com sucesso');



    console.log('Carregando estado final...');
    const newState = await loadState();
    if (!newState) {
      console.error('❌ Falha ao carregar estado final');
      return NextResponse.json({ error: 'Failed to load state' }, { status: 500 });
    }
    console.log('✅ Estado final carregado com sucesso');
    console.log('=== SETUP XRPL POC CONCLUÍDO COM SUCESSO ===');
    return NextResponse.json(newState, { status: 200 });

  } catch (e: any) {
    console.error('❌ XRPL POC setup error:', e);
    return NextResponse.json({ error: 'Failed to setup XRPL POC', details: e?.message ?? String(e) }, { status: 500 });
  } finally {
    console.log('Desconectando do XRPL...');
    client.disconnect();
    console.log('Desconectado do XRPL');
  }
}

export const runtime = 'nodejs';
