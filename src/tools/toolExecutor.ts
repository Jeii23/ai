import type { ChatCompletionMessageToolCall } from 'openai/resources/chat/completions';
import * as allTools from './index';

// Find all exported schemas (they end with 'Schema')
const schemas = Object.entries(allTools)
  .filter(([key]) => key.endsWith('Schema'))
  .map(([_, schema]) => ({
    type: 'function' as const,
    function: schema
  }));

// Find all tool implementations (they match schema names without 'Schema' suffix)
const implementations = Object.fromEntries(
  Object.entries(allTools).filter(([key]) => {
    const schemaName = `${key}Schema`;
    return typeof allTools[schemaName] === 'object';
  })
);

export async function executeToolCall(toolCall: ChatCompletionMessageToolCall) {
  try {
    const implementation = implementations[toolCall.function.name];

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

export const tools = schemas;
