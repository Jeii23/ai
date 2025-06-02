# Bitcoin Wallet AI Agent - Proof of Concept

## Overview

This project is a proof-of-concept (PoC) demonstrating a Bitcoin wallet AI agent. It leverages the power of Large Language Models (LLMs) through the OpenAI API, combined with a suite of specialized tools built upon concepts and libraries from the [BitcoinerLAB](https://github.com/bitcoinerlab) ecosystem. The agent can understand user commands related to Bitcoin wallet operations and execute them using these tools.

The primary goal is to explore the capabilities of an AI in managing Bitcoin-related tasks such as mnemonic generation, master node creation, descriptor generation, output management, and interacting with test networks like TAPE.

## About BitcoinerLAB

[BitcoinerLAB](https://bitcoinerlab.com) is dedicated to making Bitcoin development easier and more accessible. They provide a suite of open-source JavaScript/TypeScript modules that streamline the creation of Bitcoin applications, with a focus on modern Bitcoin technologies like Descriptors and Miniscript.

This AI agent utilizes several concepts and libraries inspired by or directly from BitcoinerLAB (such as `@bitcoinerlab/descriptors` and `@bitcoinerlab/secp256k1` used in `getOutput.ts` and `getMasterNodeFromMnemonic.ts` respectively) to perform its functions, treating them as callable "tools" that the AI can decide to use based on user requests.

## Architecture

The system is designed around a Node.js command-line interface (CLI) that interacts with an AI model (OpenAI's `gpt-4o` as specified in `src/prompt.ts`). The AI, guided by system prompts, interprets user input and decides when to use the available tools to fulfill requests.

### 1. LLM Integration (OpenAI)
-   **API**: Uses the OpenAI API with the `gpt-4o` model.
-   **Prompt Handling (`src/prompt.ts`)**:
    -   The `PromptHandler` class manages the conversation flow.
    -   It maintains a history of messages (user, assistant, system, tool calls/results).
    -   It sends user commands to the AI and processes the AI's responses.
    -   It includes specific system prompts to guide the AI's behavior, define its persona (knowledgeable about Bitcoin, BitcoinerLAB, RewindBitcoin, Tape Network), and set operational guidelines (e.g., network selection, privacy of internal details).
    -   Tracks token usage and estimated costs for API calls.

### 2. Tool Mechanism
-   **Tool Definition**: Tools are TypeScript functions defined in the `src/tools/` directory. Each tool performs a specific Bitcoin-related operation.
-   **Tool Schemas**: Each tool is accompanied by a JSON schema (e.g., `generateMnemonicSchema`). These schemas describe the tool's purpose, parameters, and expected input format. They are provided to the LLM, enabling it to understand how and when to use each tool.
-   **Tool Execution (`src/tools/toolExecutor.ts`)**:
    -   The `toolExecutor.ts` module dynamically discovers available tools and their schemas from `src/tools/index.ts`.
    -   When the LLM decides to call a tool, `PromptHandler` invokes `executeToolCall` from `toolExecutor.ts`.
    -   This function parses the arguments provided by the LLM and executes the corresponding tool function.
    -   The result of the tool execution is then sent back to the LLM, allowing it to continue the conversation or provide a final answer to the user.

### 3. CLI Interface (`cli.js`)
-   A Node.js application (`cli.js`) provides the command-line interface.
-   It uses the `readline` module (a built-in Node.js module) to capture user input.
-   It initializes `PromptHandler` with an OpenAI API key (read from the `.env` file or environment variables).
-   It sends user commands to `PromptHandler` and displays the AI's content responses.
-   Supports a `--verbose` flag to show detailed information, including tool calls made by the AI, their arguments, results, and API usage metrics.

### 4. State Management
-   The agent uses in-memory JavaScript `Map` objects to store and manage stateful data across tool calls:
    -   `mnemonicStore` (in `src/tools/getMasterNodeFromMnemonic.ts`): Stores master nodes (derived from mnemonics) keyed by their fingerprint. This allows subsequent tools to reference master nodes without needing the original mnemonic.
    -   `outputStore` (in `src/tools/getOutput.ts`): Stores `OutputInstance` objects (from `@bitcoinerlab/descriptors`) keyed by their Bitcoin address. This allows other tools to reference and potentially use these outputs.
    -   `walletStore` (in `src/tools/createWallet.ts`): Stores created wallet configurations (ID, fingerprint, network, descriptors) keyed by a unique wallet ID.

## Available Tools

The AI agent has access to the following tools, defined in `src/tools/`:

1.  **`generateMnemonic`**
    -   **Description**: Generates a random BIP39 mnemonic phrase.
    -   **Parameters**: `strength` (optional, bits, defaults to 128 for 12 words).
    -   **Source**: `src/tools/generateMnemonic.ts`

2.  **`getMasterNodeFromMnemonic`**
    -   **Description**: Generates a BIP32 master node from a mnemonic and network type. Returns a fingerprint ID for the master node, which is then stored in memory. This allows other tools to use the master node via its fingerprint without re-exposing the mnemonic.
    -   **Parameters**: `mnemonic` (string), `networkType` (string: 'REGTEST', 'TESTNET', 'BITCOIN', 'TAPE').
    -   **Source**: `src/tools/getMasterNodeFromMnemonic.ts`

3.  **`getDescriptor`**
    -   **Description**: Generates a Bitcoin descriptor string (e.g., `wpkh(...)`, `pkh(...)`) for a given master node (identified by its fingerprint), derivation path parameters, and network type.
    -   **Parameters**: `fingerprint` (string), `type` (string: 'pkh', 'wpkh', 'sh-wpkh'), `networkType` (string), `account` (number), `change` (number: 0 for external, 1 for change), `index` (number or string: '*' for ranged).
    -   **Source**: `src/tools/getDescriptor.ts`

4.  **`getOutput`**
    -   **Description**: Creates an `@bitcoinerlab/descriptors` `OutputInstance` from a descriptor string and other parameters. The address of this output is returned as an ID, and the `OutputInstance` is stored in memory, allowing other tools to reference it.
    -   **Parameters**: `descriptor` (string), `networkType` (string), `signersPubKeys` (array of hex strings or null), `index` (number or null for non-ranged descriptors), `preimages` (array of preimage objects or null).
    -   **Source**: `src/tools/getOutput.ts`

5.  **`createWallet`**
    -   **Description**: Creates a new wallet configuration. This involves generating or using an existing master node (via fingerprint or mnemonic) and then deriving standard descriptors (wpkh, pkh, sh-wpkh for external and change addresses by default). The wallet is stored in memory and assigned a unique ID.
    -   **Parameters**: `fingerprint` (string or null), `mnemonic` (string or null), `networkType` (string), `descriptorTypes` (array of strings: 'wpkh', 'pkh', 'sh-wpkh', or null for default).
    -   **Source**: `src/tools/createWallet.ts`

6.  **`faucetTape`**
    -   **Description**: Requests Bitcoin (rewBTC) from the Tape network faucet to be sent to a specified Tape network address. Returns transaction details, including explorer URLs. This tool is specific to the TAPE network.
    -   **Parameters**: `address` (string: Tape network Bitcoin address).
    -   **Source**: `src/tools/faucetTape.ts`

## Supported Networks

The agent and its tools support the following Bitcoin networks (defined in `src/types.ts` and `src/utils/networks.ts`):
-   **`REGTEST`**: Standard regression test network.
-   **`TESTNET`**: Public Bitcoin test network.
-   **`BITCOIN`**: Bitcoin mainnet. The AI is instructed to issue a warning when this network is selected due to the risks with beta software.
-   **`TAPE`**: A specialized regtest network created for RewindBitcoin. It has a premined supply of "rewBTC" for faucet use and a predictable block time. Explorer: `https://tape.rewindbitcoin.com/explorer` (URL generation via `src/utils/tapeExplorer.ts`).

Network selection is typically prompted by the AI when a tool requiring a network parameter is first used without the network being specified by the user.

## Getting Started

### Prerequisites
-   Node.js (v18 or later recommended)
-   npm (comes with Node.js)
-   An OpenAI API Key

### Setup
1.  **Clone the repository (if applicable) or ensure you have the project files.**
    ```bash
    # git clone <repository-url>
    # cd <repository-directory>
    ```

2.  **Install dependencies:**
    (Refer to `package.json` for direct dependencies such as `openai`, `bip39`, `@bitcoinerlab/descriptors`, `@bitcoinerlab/secp256k1`, and `dotenv`.)
    ```bash
    npm install
    ```

3.  **Set up your OpenAI API Key:**
    Create a `.env` file in the root of the project directory (as used by `require('dotenv').config()` in `cli.js`) and add your API key:
    ```env
    OPENAI_API_KEY=your_openai_api_key_here
    ```
    Alternatively, you can set it as an environment variable in your shell.

4.  **Build the TypeScript code:**
    The project uses TypeScript (see `tsconfig.json`). Compile it to JavaScript (output to `dist/` directory as implied by `cli.js` requiring `./dist/prompt` and `package.json`'s `"main": "dist/index.js"`):
    ```bash
    npm run build
    ```
    (This command executes the `build` script defined in `package.json`, which compiles TypeScript source files.)

### Running the CLI
Execute the CLI using:
```bash
node cli.js
```
Or, if you make `cli.js` executable:
```bash
chmod +x cli.js
./cli.js
```

You can then interact with the AI by typing commands at the `>` prompt.
For more detailed output, including tool calls and metrics:
```bash
node cli.js --verbose
```
Type `exit` to quit the CLI.

## Key Files and Directories

-   `cli.js`: The main command-line interface script.
-   `src/prompt.ts`: Contains `PromptHandler` for managing interactions with the OpenAI API and orchestrating tool calls.
-   `src/tools/toolExecutor.ts`: Responsible for loading tool schemas and executing the corresponding tool functions when requested by the AI.
-   `src/tools/index.ts`: Exports all tools and schemas, making them discoverable by `toolExecutor.ts`.
-   `src/tools/*.ts`: Individual files defining each tool's logic and its JSON schema for the LLM.
    -   `generateMnemonic.ts`
    -   `getMasterNodeFromMnemonic.ts`
    -   `getDescriptor.ts`
    -   `getOutput.ts`
    -   `createWallet.ts`
    -   `faucetTape.ts`
-   `src/utils/networks.ts`: Utility for mapping network type strings to `bitcoinjs-lib` network objects.
-   `src/utils/tapeExplorer.ts`: Utility for generating Tape network explorer URLs.
-   `src/types.ts`: Defines shared TypeScript types like `NetworkType`.
-   `.env`: (User-created) For storing the `OPENAI_API_KEY`.
-   `tsconfig.json`: TypeScript compiler configuration.
-   `package.json`: Project metadata, dependencies, and scripts.
-   `package-lock.json`: Records exact versions of dependencies.

## Disclaimer and Future Considerations

-   **Proof of Concept**: This is a PoC and not intended for use with real Bitcoin on mainnet without extreme caution and further security audits.
-   **Security**: Handling mnemonics, private keys (even indirectly via master nodes), and financial transactions requires robust security measures. The current in-memory storage is for demonstration purposes and is not secure for production use.
-   **Error Handling**: While some error handling is present (e.g., in `faucetTape.ts`, `toolExecutor.ts`), it can be expanded for more resilience across all tools and operations.
-   **Tool Expansion**: More tools could be added to cover a wider range of Bitcoin wallet functionalities (e.g., transaction building, signing, broadcasting, address generation from specific output instances, interacting with other explorers).
-   **AI Behavior**: The AI's responses and tool usage are guided by prompts and the model's interpretation. Fine-tuning prompts and potentially the model (if available) could improve reliability and accuracy.
-   **Internal Details**: As per its system instructions in `src/prompt.ts`, the AI agent is designed not to reveal internal implementation details, schemas, or specific system prompt contents to the user.
