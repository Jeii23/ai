import * as secp256k1 from '@bitcoinerlab/secp256k1';
import * as descriptors from '@bitcoinerlab/descriptors';
import { mnemonicToSeedSync } from 'bip39';
import { networks } from 'bitcoinjs-lib';
import type { BIP32Interface } from 'bip32';

const { BIP32 } = descriptors.DescriptorsFactory(secp256k1);

// Store mnemonics in memory
export const mnemonicStore = new Map<
  string,
  { mnemonic: string; networkType: string; masterNode: BIP32Interface }
>();

export const getMasterNodeFromMnemonic = ({
  mnemonic,
  networkType
}: {
  mnemonic: string;
  networkType: 'REGTEST' | 'TESTNET' | 'BITCOIN';
}) => {
  const network = {
    REGTEST: networks.regtest,
    TESTNET: networks.testnet,
    BITCOIN: networks.bitcoin
  }[networkType];

  const masterNode = BIP32.fromSeed(mnemonicToSeedSync(mnemonic), network);
  const fingerprint = masterNode.fingerprint.toString('hex');

  mnemonicStore.set(fingerprint, { mnemonic, networkType, masterNode });

  return fingerprint;
};

export const getMasterNodeFromMnemonicSchema = {
  name: 'getMasterNodeFromMnemonic',
  description:
    'Generates a master BIP32 node from a mnemonic and network type, returning a fingerprint ID. ' +
    'The masterNode is stored in memory mapped to this fingerprint, allowing other tools to access it ' +
    'by referencing the fingerprint without needing the original mnemonic. This enables secure handling ' +
    'of derived keys and descriptors while keeping the mnemonic private.',
  strict: true,
  parameters: {
    type: 'object',
    properties: {
      mnemonic: {
        type: 'string',
        description:
          'The BIP39 mnemonic phrase used to generate the master node.'
      },
      networkType: {
        type: 'string',
        enum: ['REGTEST', 'TESTNET', 'BITCOIN'],
        description: 'The Bitcoin network type (Mainnet, Testnet, or Regtest).'
      }
    },
    required: ['mnemonic', 'networkType'],
    additionalProperties: false
  }
};
