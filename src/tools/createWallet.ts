import { getMasterNodeFromMnemonic } from './getMasterNodeFromMnemonic';
import { getDescriptor } from './getDescriptor';
import { generateMnemonic } from './generateMnemonic';
import { mnemonicStore } from './getMasterNodeFromMnemonic';
import type { NetworkType } from '../types';

// Store wallets in memory with numeric IDs
export const walletStore = new Map<
  number,
  {
    id: number;
    fingerprint: string;
    networkType: NetworkType;
    descriptors: string[];
  }
>();

// Counter for wallet IDs
let nextWalletId = 1;

export const createWallet = async ({
  fingerprint,
  mnemonic,
  networkType,
  descriptorTypes = null
}: {
  fingerprint: string | null;
  mnemonic: string | null;
  networkType: NetworkType;
  descriptorTypes: Array<'wpkh' | 'pkh' | 'sh-wpkh'> | null;
}) => {
  let usedFingerprint: string;
  let generatedMnemonic: string | undefined;
  if (!descriptorTypes) descriptorTypes = ['wpkh', 'pkh', 'sh-wpkh'];

  // Use existing fingerprint, existing mnemonic, or generate new mnemonic
  if (fingerprint) {
    // Verify fingerprint exists
    if (!mnemonicStore.has(fingerprint)) {
      throw new Error(`No master node found for fingerprint: ${fingerprint}`);
    }
    usedFingerprint = fingerprint;
  } else if (mnemonic) {
    // Create master node from provided mnemonic
    usedFingerprint = getMasterNodeFromMnemonic({
      mnemonic,
      networkType
    });
  } else {
    // Generate new mnemonic and master node
    generatedMnemonic = generateMnemonic({ strength: 128 });
    usedFingerprint = getMasterNodeFromMnemonic({
      mnemonic: generatedMnemonic,
      networkType
    });
  }

  // Generate descriptors for each type (both external and change)
  const descriptors: string[] = [];

  for (const type of descriptorTypes) {
    // External addresses (m/purpose'/coin'/account'/0/*)
    const externalDescriptor = getDescriptor({
      fingerprint: usedFingerprint,
      type,
      networkType,
      account: 0,
      change: 0,
      index: '*'
    });

    descriptors.push(externalDescriptor);

    // Change addresses (m/purpose'/coin'/account'/1/*)
    const changeDescriptor = getDescriptor({
      fingerprint: usedFingerprint,
      type,
      networkType,
      account: 0,
      change: 1,
      index: '*'
    });

    descriptors.push(changeDescriptor);
  }

  // Assign a unique ID to the wallet
  const walletId = nextWalletId++;

  // Store wallet
  const wallet = {
    id: walletId,
    fingerprint: usedFingerprint,
    networkType,
    descriptors
  };

  walletStore.set(walletId, wallet);

  return {
    id: walletId,
    fingerprint: usedFingerprint,
    networkType,
    descriptors,
    generatedMnemonic
  };
};

export const createWalletSchema = {
  name: 'createWallet',
  description:
    'Creates a new wallet with descriptors for different address types. ' +
    'Can use an existing fingerprint, existing mnemonic, or generate a new mnemonic. ' +
    'By default, creates external and change descriptors for wpkh, pkh, and sh-wpkh types. ' +
    'Returns a wallet ID that can be used to reference this wallet in future operations.',
  strict: true,
  parameters: {
    type: 'object',
    properties: {
      fingerprint: {
        type: ['string', 'null'],
        description:
          'Optional fingerprint of an existing master node. If provided, uses this master node instead of creating a new one. If not provided then pass null.'
      },
      mnemonic: {
        type: ['string', 'null'],
        description:
          'Optional BIP39 mnemonic phrase. If not provided and no fingerprint is given, a new random mnemonic will be generated. If not provided then pass null.'
      },
      networkType: {
        type: 'string',
        enum: ['REGTEST', 'TESTNET', 'BITCOIN', 'TAPE'],
        description:
          'The Bitcoin network type for all descriptors in this wallet'
      },
      descriptorTypes: {
        type: 'array',
        items: {
          type: 'string',
          enum: ['wpkh', 'pkh', 'sh-wpkh']
        },
        description:
          'Optional array of descriptor types to include. Defaults to all three types: wpkh (native segwit), pkh (legacy), and sh-wpkh (wrapped segwit). If not provided pass null.'
      }
    },
    required: ['networkType', 'fingerprint', 'mnemonic', 'descriptorTypes'],
    additionalProperties: false
  }
};
