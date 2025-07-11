import * as ecc from '@bitcoinerlab/secp256k1';
import * as descriptors from '@bitcoinerlab/descriptors';
import { coinselect } from '@bitcoinerlab/coinselect';
import { EsploraExplorer, ElectrumExplorer } from '@bitcoinerlab/explorer';
import { DiscoveryFactory } from '@bitcoinerlab/discovery';
import { Psbt, networks } from 'bitcoinjs-lib';

import { walletStore } from './createWallet';

const { Output } = descriptors.DescriptorsFactory(ecc);

/* ---------- CONFIG ---------- */
const MAINNET_EXPLORA = 'https://explorer.midomini.cat/api';
const TESTNET_ELECTRUM = {
  host: 'electrum.blockstream.info',
  port: 60002,
  protocol: 'ssl' as const
};
/* ---------------------------- */

export const createUnsignedTx = async ({
  walletId,
  toAddress,
  amountSats,
  feeRate = 5
}: {
  walletId: number;
  toAddress: string;
  amountSats: number;
  feeRate?: number; // sats/vB
}) => {
  /* 1. Wallet */
  const w = walletStore.get(walletId);
  if (!w) throw new Error(`Wallet ${walletId} no existeix`);

  const network =
    w.networkType === 'BITCOIN'
      ? networks.bitcoin
      : networks.testnet; // (TESTNET, REGTEST, TAPE → networks.testnet)

  /* 2. Explorer + Discovery */
  const explorer =
    w.networkType === 'BITCOIN'
      ? new EsploraExplorer({ url: MAINNET_EXPLORA })
      : new ElectrumExplorer(TESTNET_ELECTRUM);

  await explorer.connect();

  const { Discovery } = DiscoveryFactory(explorer, network);
  const discovery = new Discovery();

  // w.descriptors ja conté externs i change; els passem a discovery
  await discovery.fetch({ descriptors: w.descriptors });

  const { utxos: utxoKeys, txoMap } = discovery.getUtxosAndBalance({
    descriptors: w.descriptors
  });
  if (!utxoKeys.length) throw new Error('Wallet sense UTXOs');

  /* 3. Converteix UTXOs a format coinselect */
  type CSItem = { output: ReturnType<typeof Output>; value: number };
  const csUtxos: CSItem[] = [];
  const meta = new Map<
    ReturnType<typeof Output>,
    { txId: string; vout: number; value: number }
  >();

  for (const k of utxoKeys) {
    const [txId, voutStr] = k.split(':');
    const { value, indexedDescriptor } = txoMap[k];
    const out = new Output({
      descriptor: indexedDescriptor.descriptor,
      network
    });
    csUtxos.push({ output: out, value });
    meta.set(out, { txId, vout: Number(voutStr), value });
  }

  /* 4. Outputs (to + change) */
  const destOut = new Output({
    descriptor: `addr(${toAddress})`,
    network
  });

  // troba el primer descriptor de canvi del wallet (acaba en /1/*)
  const changeTemplate =
    w.descriptors.find((d) => /\/1\/\*$/.test(d)) ??
    w.descriptors[0].replace(/\/0\/\*$/, '/1/*');

  const nextChangeIndex = discovery.getNextIndex({ descriptor: changeTemplate });
  const changeDesc = changeTemplate.replace('*', `${nextChangeIndex}`);
  const changeOut = new Output({ descriptor: changeDesc, network });

  /* 5. coinselect */
  const sel = coinselect({
    utxos: csUtxos,
    targets: [{ output: destOut, value: amountSats }],
    remainder: changeOut,
    feeRate
  });
  if (!sel) throw new Error('Fons insuficients');

  /* 6. PSBT */
  const psbt = new Psbt({ network });

  for (const u of sel.utxos) {
    const { txId, vout, value } = meta.get(u.output)!;
    if (u.output.isSegwit) {
      u.output.updatePsbtAsInput({ psbt, txId, vout, value });
    } else {
      const txHex = await explorer.fetchTx(txId);
      u.output.updatePsbtAsInput({ psbt, txHex, vout });
    }
  }
  for (const t of sel.targets)
    t.output.updatePsbtAsOutput({ psbt, value: t.value });

  await explorer.close();

  return {
    psbtBase64: psbt.toBase64(),
    fee: sel.fee,
    vsize: sel.vsize
  };
};

/* ---------- JSON Schema perquè l’agent la reconegui ---------- */
export const createUnsignedTxSchema = {
  name: 'createUnsignedTx',
  description:
    'Creates a PSBT without signature: inputs walletId, toAddress, amountSats, feeRate (opcional). ' +
    'returns {psbtBase64, fee, vsize}.',
  strict: true,
  parameters: {
    type: 'object',
    properties: {
      walletId: { type: 'number' },
      toAddress: { type: 'string' },
      amountSats: { type: 'number' },
      feeRate: {
        type: 'number',
        description: 'Tarriff in sats/vB (default 5)',
        nullable: true
      }
    },
    required: ['walletId', 'toAddress', 'amountSats', 'feeRate'],
    additionalProperties: false
  }
};
