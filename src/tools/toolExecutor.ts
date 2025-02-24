import type { ChatCompletionMessageToolCall } from 'openai/resources/chat/completions';
import {
  getMasterNodeFromMnemonicSchema,
  getMasterNodeFromMnemonic
} from './masterNode';

// Map of tool names to their implementation functions
const toolImplementations = {
  getMasterNodeFromMnemonic
} as const;

export async function executeToolCall(toolCall: ChatCompletionMessageToolCall) {
  try {
    const implementation =
      toolImplementations[
        toolCall.function.name as keyof typeof toolImplementations
      ];

    if (!implementation) {
      throw new Error(`Unknown tool: ${toolCall.function.name}`);
    }

    const args = JSON.parse(toolCall.function.arguments);
    return await implementation(args);
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Tool execution failed: ${error.message}`);
    }
    throw new Error('Tool execution failed with unknown error');
  }
}

export const tools = [
  {
    type: 'function' as const,
    function: getMasterNodeFromMnemonicSchema
  }
];
