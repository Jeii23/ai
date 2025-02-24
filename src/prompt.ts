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

    const completion = await this.openai.chat.completions.create({
      model: 'gpt-4o',
      messages: this.messages,
      tools,
      store: true
    });

    const response = completion.choices[0]?.message;
    if (!response) throw new Error('No response from AI');

    this.messages.push(response);

    if (response.tool_calls) {
      for (const toolCall of response.tool_calls) {
        const toolResult = await this.executeToolCall(toolCall);
        this.messages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: JSON.stringify(toolResult)
        });
      }

      // Get AI's interpretation of the tool results
      const finalResponse = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: this.messages,
        tools,
        store: true
      });

      const finalMessage = finalResponse.choices[0]?.message;
      if (!finalMessage) {
        throw new Error('No final response received from AI');
      }

      this.messages.push(finalMessage);
      return finalMessage.content ?? 'No response content';
    }

    return response.content || 'No response content';
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
