import * as bip39 from 'bip39';

export const generateMnemonic = ({ strength = 128 }: { strength?: number }) => {
  // Generate a random mnemonic (128-256 bits) and return it as a string
  return bip39.generateMnemonic(strength);
};

export const generateMnemonicSchema = {
  name: 'generateMnemonic',
  description:
    "Generates a random BIP39 mnemonic phrase that can be used to create a Bitcoin wallet. If this tool is used and the user did not specify a strength, then don't ask to choose an optoina dn directly pass 128 (12 words) by default.",
  strict: true,
  parameters: {
    type: 'object',
    properties: {
      strength: {
        type: 'number',
        description:
          'The strength of the mnemonic in bits (128, 160, 192, 224, or 256). This parameter is optional. Pick 128 bits (12 words) if not provided by the user.',
        enum: [128, 160, 192, 224, 256]
      }
    },
    additionalProperties: false,
    required: ['strength']
  }
};
