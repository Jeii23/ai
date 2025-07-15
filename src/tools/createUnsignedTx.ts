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
/* ---------------------------------------------------- */

/* ---------- TIPUS AUXILIARS ---------- */
// Tipus base proporcionat per la llibreria
// (no és públic → l'obtenim via InstanceType)
type OutputBase = InstanceType<typeof Output>;

/**
 * Tipus "parchejat" 100 % compatible amb coinselect.
 *  • isSegwit i isTaproot són obligatoris i tornen boolean.
 *  • guessOutput() conté tots els flags (isWSH, isTR…)
 */
export type OutputFull = Omit<OutputBase, 'isSegwit' | 'isTaproot' | 'guessOutput'> & {
  isSegwit(): boolean;
  isTaproot(): boolean;
  guessOutput(): {
    isPKH: boolean;
    isWPKH: boolean;
    isSH: boolean;
    isWSH: boolean; // P2WSH
    isTR: boolean;  // P2TR
  };
};

// Funció que garanteix els mètodes/estructura exigits per coinselect
const toOutputFull = (o: OutputBase): OutputFull => {
  /* ---------- isSegwit / isTaproot ---------- */
  const segwitFn = (o as any).isSegwit
    ? () => Boolean((o as any).isSegwit())
    : () => false;
  const taprootFn = (o as any).isTaproot
    ? () => Boolean((o as any).isTaproot())
    : () => false;
  (o as any).isSegwit = segwitFn;
  (o as any).isTaproot = taprootFn;

  /* ---------- guessOutput amb flags extra ---------- */
  const originalGuess = o.guessOutput.bind(o);
  (o as any).guessOutput = () => {
    const g = originalGuess();
    return {
      isPKH: g.isPKH,
      isWPKH: g.isWPKH,
      isSH: g.isSH,
      // Els flags poden no existir en versions velles → default false
      isWSH: (g as any).isWSH ?? false,
      isTR: (g as any).isTR ?? false
    };
  };

  return o as OutputFull;
};

// Tipus per a coinselect amb el nostre OutputFull
export interface OutputWithValue {
  output: OutputFull;
  value: number;
}

interface TxoInfo {
  value: number;
  indexedDescriptor: { descriptor: string };
}
/* ------------------------------------- */

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
  /* 1. Wallet ------------------------------------------------------ */
  const w = walletStore.get(walletId);
  if (!w) throw new Error(`Wallet ${walletId} no existeix`);
  if (!w.descriptors.length) throw new Error('Wallet sense descriptors');

  const network =
    w.networkType === 'BITCOIN' ? networks.bitcoin : networks.testnet;

  /* 2. Explorer + Discovery --------------------------------------- */
  const explorer =
    w.networkType === 'BITCOIN'
      ? new EsploraExplorer({ url: MAINNET_EXPLORA })
      : new ElectrumExplorer(TESTNET_ELECTRUM);

  await explorer.connect();

  const { Discovery } = DiscoveryFactory(explorer, network);
  const discovery = new Discovery();
  await discovery.fetch({ descriptors: w.descriptors });

  const { utxos: utxoKeys, txoMap } = discovery.getUtxosAndBalance({
    descriptors: w.descriptors
  });
  if (!utxoKeys.length) throw new Error('Wallet sense UTXOs');

  /* 3. Converteix UTXOs a OutputWithValue ------------------------- */
  const csUtxos: OutputWithValue[] = [];
  // Use OutputBase because coinselect returns OutputInstance (alias of OutputBase)
  // and thus the references we get back from sel.utxos don't satisfy OutputFull at compile time.
  const meta = new Map<OutputBase, { txId: string; vout: number; value: number }>();

  for (const k of utxoKeys) {
    const [txId, voutStr] = k.split(':') as [string, string];

    const info = txoMap[k] as unknown as TxoInfo;
    if (!info) continue;

    const out = toOutputFull(
      new Output({ descriptor: info.indexedDescriptor.descriptor, network })
    );

    csUtxos.push({ output: out, value: info.value });
    meta.set(out, { txId, vout: Number(voutStr), value: info.value });
  }

  /* 4. Sortides (destí + canvi) ----------------------------------- */
  const destOut = toOutputFull(new Output({ descriptor: `addr(${toAddress})`, network }));

  const changeTemplate =
    w.descriptors.find((d) => /\/1\/\*$/.test(d)) ??
    w.descriptors[0]!.replace(/\/0\/\*$/, '/1/*');

  const nextChangeIndex = discovery.getNextIndex({ descriptor: changeTemplate });
  const changeDesc = changeTemplate.replace('*', `${nextChangeIndex}`);
  const changeOut = toOutputFull(new Output({ descriptor: changeDesc, network }));

  /* 5. coinselect -------------------------------------------------- */
  const sel = coinselect({
    utxos: csUtxos,
    targets: [{ output: destOut, value: amountSats }],
    remainder: changeOut,
    feeRate
  });
  if (!sel) throw new Error('Fons insuficients');

  /* 6. PSBT -------------------------------------------------------- */
  const psbt = new Psbt({ network });

  // inputs
  for (const { output: o } of sel.utxos) {
    const m = meta.get(o);
    if (!m) continue;
    const { txId, vout, value } = m;

    if (o.isSegwit()) {
      o.updatePsbtAsInput({ psbt, txId, vout, value });
    } else {
      const txHex = await explorer.fetchTx(txId);
      o.updatePsbtAsInput({ psbt, txHex, vout });
    }
  }

  // outputs
  for (const { output: o, value } of sel.targets) {
    o.updatePsbtAsOutput({ psbt, value });
  }

  await explorer.close();

  return {
    psbtBase64: psbt.toBase64(),
    fee: sel.fee,
    vsize: sel.vsize
  } as const;
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
        description: 'Tarifa en sats/vB (default 5)',
        nullable: true
      }
    },
    required: ['walletId', 'toAddress', 'amountSats'],
    additionalProperties: false
  }
};
