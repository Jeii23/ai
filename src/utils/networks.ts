import { networks } from 'bitcoinjs-lib';
import type { Network } from 'bitcoinjs-lib';
import type { NetworkType } from '../types';

export const getNetwork = (networkType: NetworkType): Network => {
  const networkMap = {
    REGTEST: networks.regtest,
    TESTNET: networks.testnet,
    BITCOIN: networks.bitcoin,
    TAPE: networks.regtest // TAPE network uses regtest configuration
  };
  return networkMap[networkType];
};
