import { OpenAI } from 'openai';
import type { ChatCompletionMessageParam } from 'openai/resources';
import type { ChatCompletion } from 'openai/resources/chat/completions';
import { tools, executeToolCall } from './tools/toolExecutor';

interface CostMetrics {
  totalTokens: number;
  promptTokens: number;
  completionTokens: number;
  estimatedCost: number;
}

export class PromptHandler {
  private openai: OpenAI;
  private messages: ChatCompletionMessageParam[];
  private costMetrics: CostMetrics = {
    totalTokens: 0,
    promptTokens: 0,
    completionTokens: 0,
    estimatedCost: 0
  };

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

  async sendCommand(
    command: string
  ): Promise<{ content: string; metrics: CostMetrics }> {
    this.messages.push({
      role: 'user',
      content: command
    });

    const completion = await this.trackCost(
      this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: this.messages,
        tools,
        store: true
      })
    );

    let response = completion.choices[0]?.message;
    if (!response) throw new Error('No response from AI');

    this.messages.push(response);

    // Keep processing tool calls until AI provides a final response
    while (response.tool_calls) {
      // Handle all tool calls in the current response
      for (const toolCall of response.tool_calls) {
        console.log(`Function Call: ${toolCall.function.name}`, JSON.parse(toolCall.function.arguments));
        const toolResult = await this.executeToolCall(toolCall);
        this.messages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: JSON.stringify(toolResult)
        });
      }

      // Get next response from AI
      const nextResponse = await this.trackCost(
        this.openai.chat.completions.create({
          model: 'gpt-4o',
          messages: this.messages,
          tools,
          store: true
        })
      );

      response = nextResponse.choices[0]?.message;
      if (!response) {
        throw new Error('No response received from AI');
      }

      this.messages.push(response);
    }

    // At this point, we have a final response without tool calls
    return {
      content: response.content ?? 'No response content',
      metrics: this.costMetrics
    };
  }

  private executeToolCall = executeToolCall;

  private async trackCost(
    promise: Promise<ChatCompletion>
  ): Promise<ChatCompletion> {
    const response = await promise;
    if (response.usage) {
      this.costMetrics.promptTokens += response.usage.prompt_tokens;
      this.costMetrics.completionTokens += response.usage.completion_tokens;
      this.costMetrics.totalTokens += response.usage.total_tokens;

      // GPT-4o costs: $0.0025/1K prompt tokens, $0.01/1K completion tokens
      this.costMetrics.estimatedCost +=
        (response.usage.prompt_tokens * 0.0025) / 1000 +
        (response.usage.completion_tokens * 0.01) / 1000;
    }
    return response;
  }
}
