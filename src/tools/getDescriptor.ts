import * as descriptors from '@bitcoinerlab/descriptors';
import { networks } from 'bitcoinjs-lib';
import { mnemonicStore } from './getMasterNodeFromMnemonic';

const { scriptExpressions } = descriptors;

type DescriptorType = 'pkh' | 'wpkh' | 'sh-wpkh';
type NetworkType = 'REGTEST' | 'TESTNET' | 'BITCOIN';

interface DescriptorParams {
  fingerprint: string;
  type: DescriptorType;
  networkType: NetworkType;
  account?: number;
  change?: number;
  index?: number | '*';
}

export const getDescriptor = ({
  fingerprint,
  type,
  networkType,
  account = 0,
  change = 0,
  index = '*'
}: DescriptorParams): string => {
  const storedData = mnemonicStore.get(fingerprint);
  if (!storedData) {
    throw new Error(`No master node found for fingerprint: ${fingerprint}`);
  }

  const { masterNode } = storedData;
  const network = {
    REGTEST: networks.regtest,
    TESTNET: networks.testnet,
    BITCOIN: networks.bitcoin
  }[networkType];

  const descriptorFunctions = {
    pkh: scriptExpressions.pkhBIP32,
    wpkh: scriptExpressions.wpkhBIP32,
    'sh-wpkh': scriptExpressions.shWpkhBIP32
  };

  const descriptorFunction = descriptorFunctions[type];
  if (!descriptorFunction) {
    throw new Error(`Unsupported descriptor type: ${type}`);
  }

  return descriptorFunction({
    masterNode,
    network,
    account,
    change,
    index,
    isPublic: true
  });
};

export const getDescriptorSchema = {
  name: 'getDescriptor',
  description:
    'Generates a Bitcoin descriptor string for a given master node (identified by fingerprint) and parameters.',
  strict: true,
  parameters: {
    type: 'object',
    properties: {
      fingerprint: {
        type: 'string',
        description:
          'The fingerprint of the master node to use (previously generated with getMasterNodeFromMnemonic)'
      },
      type: {
        type: 'string',
        enum: ['pkh', 'wpkh', 'sh-wpkh'],
        description:
          'The type of descriptor to generate (pkh for legacy, wpkh for native segwit, sh-wpkh for wrapped segwit)'
      },
      networkType: {
        type: 'string',
        enum: ['REGTEST', 'TESTNET', 'BITCOIN'],
        description: 'The Bitcoin network type'
      },
      account: {
        type: 'number',
        description: 'The account number (defaults to 0)',
        default: 0
      },
      change: {
        type: 'number',
        description:
          'The change value (0 for external addresses, 1 for change addresses, defaults to 0)',
        default: 0
      },
      index: {
        type: ['number', 'string'],
        description:
          'The address index (use "*" for ranged descriptor, defaults to "*")',
        default: '*'
      }
    },
    required: ['fingerprint', 'type', 'networkType'],
    additionalProperties: false
  }
};
