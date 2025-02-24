import * as secp256k1 from '@bitcoinerlab/secp256k1';
import * as descriptors from '@bitcoinerlab/descriptors';
import { getNetwork } from '../utils/networks';
import type { NetworkType } from '../types';

const { Output } = descriptors.DescriptorsFactory(secp256k1);

// Store outputs in memory
const outputStore = new Map<string, descriptors.OutputInstance>();

interface GetOutputParams {
  descriptor: string;
  networkType: NetworkType;
  signersPubKeys?: string[];
  index?: number;
}

export const getOutput = ({
  descriptor,
  networkType,
  signersPubKeys = [],
  index
}: GetOutputParams): string => {
  const network = getNetwork(networkType);

  // Convert hex strings to Buffers for signersPubKeys
  const pubKeyBuffers = signersPubKeys.map(hex => Buffer.from(hex, 'hex'));

  const output = new Output({
    descriptor,
    network,
    signersPubKeys: pubKeyBuffers,
    index
  });

  // Get the address which will serve as the ID
  const address = output.getAddress();

  // Store the output instance for later use
  outputStore.set(address, output);

  return address;
};

export const getOutputSchema = {
  name: 'getOutput',
  description:
    'Creates an Output instance from a descriptor and returns its address as an ID. ' +
    'The Output instance is stored in memory mapped to this address, allowing other tools to access it ' +
    'by referencing the address without needing to recreate the Output.',
  strict: true,
  parameters: {
    type: 'object',
    properties: {
      descriptor: {
        type: 'string',
        description:
          "The descriptor string that defines the output (e.g., \"wpkh([d34db33f/44'/0'/0']xpub6ERApfZwUNrhLCkDtcHTcxd75RbzS1ed54G1LkBUHQVHQKqhMkhgbmJbZRkrgZw4koxb5JaHWkY4ALHY2grBGRjaDMzQLcgJvLJuZZvRcEL/0/*)\")"
      },
      networkType: {
        type: 'string',
        enum: ['REGTEST', 'TESTNET', 'BITCOIN', 'TAPE'],
        description: 'The Bitcoin network type'
      },
      signersPubKeys: {
        type: 'array',
        items: {
          type: 'string',
          description: 'Public key in hex format'
        },
        description:
          'Array of public keys (in hex) that will be used for signing. Only needed for complex descriptors with multiple spending paths.'
      },
      index: {
        type: 'number',
        description:
          'Index to use for ranged descriptors. This parameter is required when the descriptor is ranged (has a wildcard).'
      }
    },
    required: ['descriptor', 'networkType'],
    additionalProperties: false
  }
};

export { outputStore };
