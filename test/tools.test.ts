import { OpenAI } from 'openai';
import 'dotenv/config';
import {
  getMasterNodeFromMnemonic,
  getMasterNodeFromMnemonicSchema
} from '../dist/index';

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

    const messages = [
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
      model: 'gpt-4o',
      messages,
      tools,
      store: true
    });

    const toolCall = completion.choices[0]?.message.tool_calls?.[0];
    expect(toolCall).toBeDefined();
    expect(toolCall?.function).toBeDefined();

    console.log('AI Tool Call:', JSON.stringify(toolCall, null, 2));

    if (toolCall?.function) {
      const params = JSON.parse(toolCall.function.arguments);
      expect(params.networkType).toBe('REGTEST');
      expect(typeof params.mnemonic).toBe('string');

      const result = getMasterNodeFromMnemonic(
        params.mnemonic,
        params.networkType
      );

      expect(result).toBeDefined();
      expect(result.network).toBeDefined();
      expect(result.network.bech32).toBe('bcrt'); // Verify it's really regtest
      // Send the result back to OpenAI
      messages.push({
        role: 'tool',
        tool_call_id: toolCall.id,
        content: JSON.stringify(result)
      });
      const finalResponse = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content:
              'You are a helpful assistant that understands Bitcoin wallet operations.'
          },
          {
            role: 'user',
            content:
              'I need to generate a master node on the regtest network for mnemonic abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about.'
          },
          {
            role: 'assistant',
            content: `I've generated the master node with the following parameters: ${JSON.stringify(params)}. The node was successfully created with network type ${result.network.bech32}.`
          }
        ],
        tools,
        store: true
      });

      console.log(
        'AI Final Response:',
        finalResponse.choices[0]?.message.content
      );
    }
  }, 15000);

  it('should directly test getMasterNodeFromMnemonic with regtest', () => {
    const result = getMasterNodeFromMnemonic(
      'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about',
      'REGTEST'
    );

    expect(result).toBeDefined();
    expect(result.network).toBeDefined();
    expect(result.network.bech32).toBe('bcrt');
  });
});
