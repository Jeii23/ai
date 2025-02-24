import * as secp256k1 from '@bitcoinerlab/secp256k1';
import * as descriptors from '@bitcoinerlab/descriptors';
import { getNetwork } from '../utils/networks';
import type { NetworkType } from '../types';
import type { Preimage } from '@bitcoinerlab/descriptors/dist/types';
import type { Network } from 'bitcoinjs-lib';

const { Output } = descriptors.DescriptorsFactory(secp256k1);

// Store outputs in memory
const outputStore = new Map<string, descriptors.OutputInstance>();

interface GetOutputParams {
  descriptor: string;
  networkType: NetworkType;
  signersPubKeys: string[] | null;
  index: number | null;
  preimages: Array<Preimage> | null;
}

export const getOutput = ({
  descriptor,
  networkType,
  signersPubKeys,
  index,
  preimages
}: GetOutputParams): string => {
  const network = getNetwork(networkType);

  // Convert hex strings to Buffers for signersPubKeys if provided
  const pubKeyBuffers =
    signersPubKeys && signersPubKeys.map(hex => Buffer.from(hex, 'hex'));

  const outputParams: {
    descriptor: string;
    network: Network;
    signersPubKeys?: Buffer[];
    index?: number;
    preimages?: Preimage[];
  } = {
    descriptor,
    network
  };

  if (pubKeyBuffers !== null) outputParams.signersPubKeys = pubKeyBuffers;
  if (index !== null) outputParams.index = index;
  if (preimages !== null) outputParams.preimages = preimages;

  const output = new Output(outputParams);

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
        type: ['array', 'null'],
        items: {
          type: 'string',
          description: 'Public key in hex format'
        },
        description:
          'Array of public keys (in hex) that will be used for signing. Only needed for complex descriptors with multiple spending paths. Set this parameter to an array containing the public keys involved in the desired spending path. Use null if not applicable.'
      },
      index: {
        type: ['number', 'null'],
        description:
          'Index to use for ranged descriptors. This parameter is required when the descriptor is ranged (has a wildcard). Use null if not applicable.'
      },
      preimages: {
        type: ['array', 'null'],
        items: {
          type: 'object',
          properties: {
            digest: {
              type: 'string',
              description:
                'The digest string (e.g., "sha256(cdabb7...)" or "ripemd160(095ff4...)"). Accepted functions: sha256, hash256, ripemd160, hash160. Digests must be: 64-character HEX for sha256, hash256 or 30-character HEX for ripemd160 or hash160.'
            },
            preimage: {
              type: 'string',
              description:
                'Hex encoded preimage (32 bytes, 64 characters in hex)'
            }
          },
          required: ['digest', 'preimage'],
          additionalProperties: false
        },
        description:
          'Array of preimages if the miniscript-based descriptor uses them. Use null if not applicable.'
      }
    },
    // Include all keys so that strict mode is satisfied.
    required: [
      'descriptor',
      'networkType',
      'signersPubKeys',
      'index',
      'preimages'
    ],
    additionalProperties: false
  }
};

export { outputStore };
