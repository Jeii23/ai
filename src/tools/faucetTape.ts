export const faucetTape = async ({ address }: { address: string }) => {
  try {
    const response = await fetch('https://tape.rewindbitcoin.com/faucet', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ address })
    });

    if (!response.ok) {
      const errorData = await response
        .json()
        .catch(() => ({ message: 'Unknown error' }));
      throw new Error(
        `Faucet request failed: ${errorData.message || response.statusText}`
      );
    }

    return await response.json();
  } catch (error) {
    throw new Error(
      `Faucet request failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
};

export const faucetTapeSchema = {
  name: 'faucetTape',
  description:
    'Requests Bitcoin from the Tape network faucet to be sent to the specified address. ' +
    'IMPORTANT: This tool can ONLY be used on the TAPE network. ' +
    'Do not offer or attempt to use this tool if the user is on any other network.',
  strict: true,
  parameters: {
    type: 'object',
    properties: {
      address: {
        type: 'string',
        description:
          'The Bitcoin address on the Tape network to receive the funds.'
      }
    },
    required: ['address'],
    additionalProperties: false
  }
};
