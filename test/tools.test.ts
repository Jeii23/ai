import { OpenAI } from 'openai';
import 'dotenv/config';
import {
  getMasterNodeFromMnemonic,
  getMasterNodeFromMnemonicSchema
} from '../dist/index';
import type { ChatCompletionMessageParam } from 'openai/resources';

function serializeMasterNode(
  result: ReturnType<typeof getMasterNodeFromMnemonic>
) {
  return JSON.stringify(result, (_key, value) =>
    value instanceof Buffer ? value.toString('hex') : value
  );
}

describe('Tools with OpenAI validation', () => {
  let openai: OpenAI;

  beforeEach(() => {
    openai = new OpenAI({
      apiKey: process.env['OPENAI_API_KEY']
    });
  });

  it('should validate and execute getMasterNodeFromMnemonic via OpenAI', async () => {
    const tools = [
      {
        type: 'function' as const,
        function: getMasterNodeFromMnemonicSchema
      }
    ];

    const messages: ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content:
          'You are a helpful assistant that understands Bitcoin wallet operations.'
      },
      {
        role: 'user',
        content:
          'I need to generate a master node on the regtest network for mnemonic abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about.'
      }
    ];

    const completion = await openai.chat.completions.create({
      model: 'gpt-4.1',
      messages,
      tools,
      store: true
    });

    const toolCall = completion.choices[0]?.message.tool_calls?.[0];
    expect(toolCall).toBeDefined();
    expect(toolCall?.function).toBeDefined();

    console.log('AI Tool Call:', toolCall);

    if (toolCall?.function) {
      const functionCallMessage = completion.choices[0]?.message;
      if (!functionCallMessage)
        throw new Error('AI did not reply valid message');
      messages.push(functionCallMessage); // append model's function call message
      const params = JSON.parse(toolCall.function.arguments);
      expect(params.networkType).toBe('REGTEST');
      expect(typeof params.mnemonic).toBe('string');

      const result = getMasterNodeFromMnemonic({
        mnemonic: params.mnemonic,
        networkType: params.networkType
      });

      expect(result).toBeDefined();

      messages.push({
        // append result message
        role: 'tool',
        tool_call_id: toolCall.id,
        content: serializeMasterNode(result)
      });

      console.log('Provide Result to AI:', messages);
      // Send the result back to OpenAI
      const finalResponse = await openai.chat.completions.create({
        model: 'gpt-4.1',
        messages,
        tools,
        store: true
      });

      const content = finalResponse.choices[0]?.message.content;
      console.log('AI Final Response:', content);
    }
  }, 15000);

  it('should directly test getMasterNodeFromMnemonic with regtest', () => {
    const result = getMasterNodeFromMnemonic({
      mnemonic:
        'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about',
      networkType: 'REGTEST'
    });

    expect(result).toBeDefined();
  });
});
