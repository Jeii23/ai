import * as secp256k1 from '@bitcoinerlab/secp256k1';
import * as descriptors from '@bitcoinerlab/descriptors';
import { mnemonicToSeedSync } from 'bip39';
import { networks } from 'bitcoinjs-lib';

const { BIP32 } = descriptors.DescriptorsFactory(secp256k1);

export const getMasterNodeFromMnemonic = (
  mnemonic: string,
  networkType: 'REGTEST' | 'TESTNET' | 'BITCOIN'
) => {
  const network = {
    REGTEST: networks.regtest,
    TESTNET: networks.testnet,
    BITCOIN: networks.bitcoin
  }[networkType];

  const masterNode = BIP32.fromSeed(mnemonicToSeedSync(mnemonic), network);
  return masterNode;
};

