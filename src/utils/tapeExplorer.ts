/**
 * Utility functions for generating Tape explorer URLs
 */

/**
 * Generates a URL to view a transaction on the Tape explorer
 * @param txId The transaction ID to view
 * @returns The complete URL to the transaction on the Tape explorer
 */
export const getTapeTransactionUrl = (txId: string): string => {
  return `https://tape.rewindbitcoin.com/explorer/tx/${txId}`;
};

/**
 * Generates a URL to view an address on the Tape explorer
 * @param address The Bitcoin address to view
 * @returns The complete URL to the address on the Tape explorer
 */
export const getTapeAddressUrl = (address: string): string => {
  return `https://tape.rewindbitcoin.com/explorer/address/${address}`;
};
