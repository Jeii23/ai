import { OpenAI } from 'openai';
import { tools } from './tools';
import type { ChatCompletionMessageParam } from 'openai/resources';
import { getMasterNodeFromMnemonic } from './tools';

export class PromptHandler {
  private openai: OpenAI;
  private messages: ChatCompletionMessageParam[];

  constructor(apiKey: string) {
    this.openai = new OpenAI({ apiKey });
    this.messages = [
      {
        role: 'system',
        content:
          'You are a helpful assistant that understands Bitcoin wallet operations.'
      }
    ];
  }

  async sendCommand(command: string): Promise<string> {
    this.messages.push({
      role: 'user',
      content: command
    });

    console.log({ messages: this.messages, tools });

    const completion = await this.openai.chat.completions.create({
      model: 'gpt-4o',
      messages: this.messages,
      tools,
      store: true
    });

    let response = completion.choices[0]?.message;
    if (!response) throw new Error('No response from AI');

    this.messages.push(response);

    // Keep processing tool calls until AI provides a final response
    while (response.tool_calls) {
      // Handle all tool calls in the current response
      for (const toolCall of response.tool_calls) {
        const toolResult = await this.executeToolCall(toolCall);
        this.messages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: JSON.stringify(toolResult)
        });
      }

      // Get next response from AI
      const nextResponse = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: this.messages,
        tools,
        store: true
      });

      response = nextResponse.choices[0]?.message;
      if (!response) {
        throw new Error('No response received from AI');
      }

      this.messages.push(response);
    }

    // At this point, we have a final response without tool calls
    return response.content ?? 'No response content';
  }

  private async executeToolCall(
    toolCall: OpenAI.Chat.Completions.ChatCompletionMessageToolCall
  ) {
    try {
      if (toolCall.function.name === 'getMasterNodeFromMnemonic') {
        const args = JSON.parse(toolCall.function.arguments);
        if (!args.mnemonic || !args.networkType) {
          throw new Error(
            'Missing required parameters: mnemonic or networkType'
          );
        }
        if (!['REGTEST', 'TESTNET', 'BITCOIN'].includes(args.networkType)) {
          throw new Error(`Invalid network type: ${args.networkType}`);
        }
        return getMasterNodeFromMnemonic({
          mnemonic: args.mnemonic,
          networkType: args.networkType as 'REGTEST' | 'TESTNET' | 'BITCOIN'
        });
      }
      throw new Error(`Unknown tool: ${toolCall.function.name}`);
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Tool execution failed: ${error.message}`);
      }
      throw new Error('Tool execution failed with unknown error');
    }
  }
}
