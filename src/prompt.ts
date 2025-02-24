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
        content: 'You are a helpful assistant that understands Bitcoin wallet operations.'
      }
    ];
  }

  async sendCommand(command: string): Promise<string> {
    this.messages.push({
      role: 'user',
      content: command
    });

    const completion = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: this.messages,
      tools,
      tool_choice: 'auto'
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
        model: 'gpt-4',
        messages: this.messages
      });

      const content = finalResponse.choices[0]?.message.content;
      if (content) this.messages.push(finalResponse.choices[0].message);
      return content || 'No response content';
    }

    return response.content || 'No response content';
  }

  private async executeToolCall(
    toolCall: OpenAI.Chat.Completions.ChatCompletionMessageToolCall
  ) {
    // Here we would implement the actual tool execution
    // For now, just handle getMasterNodeFromMnemonic
    if (toolCall.function.name === 'getMasterNodeFromMnemonic') {
      const { mnemonic, networkType } = JSON.parse(toolCall.function.arguments);
      return getMasterNodeFromMnemonic({ mnemonic, networkType });
    }
    throw new Error(`Unknown tool: ${toolCall.function.name}`);
  }
}
