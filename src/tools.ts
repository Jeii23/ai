import * as secp256k1 from '@bitcoinerlab/secp256k1';
import * as descriptors from '@bitcoinerlab/descriptors';
import { mnemonicToSeedSync } from 'bip39';

//const { pkhBIP32, wpkhBIP32 } = descriptors.scriptExpressions;
//const { Output, BIP32 } = descriptors.DescriptorsFactory(secp256k1);


export const getMasterNodeFromMnemonic = (mnemonic: string; network: 'REGTEST' | 'TESTNET' | 'BITCOIN') => {

const network = networks.regtest; //fix this to apply correct one
  const masterNode = BIP32.fromSeed(mnemonicToSeedSync(MNEMONIC), network);

  return masterNode;

}

