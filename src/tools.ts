import * as secp256k1 from '@bitcoinerlab/secp256k1';
import * as descriptors from '@bitcoinerlab/descriptors';
import { mnemonicToSeedSync } from 'bip39';
import { networks } from 'bitcoinjs-lib';

const { BIP32 } = descriptors.DescriptorsFactory(secp256k1);

// Store mnemonics in memory
const mnemonicStore = new Map<
  string,
  { mnemonic: string; networkType: string }
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

  // Store mnemonic with fingerprint as key
  mnemonicStore.set(fingerprint, { mnemonic, networkType });

  return fingerprint;
};

export const getMasterNodeFromMnemonicSchema = {
  name: 'getMasterNodeFromMnemonic',
  description:
    'Generates a master BIP32 node from a given mnemonic and network type, returning a fingerprint ID that can be used to reference this master node.',
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
