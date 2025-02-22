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
        type: "function" as const,
        function: getMasterNodeFromMnemonicSchema
      }
    ];

    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content:
            'You are a helpful assistant that understands Bitcoin wallet operations.'
        },
        {
          role: 'user',
          content:
            'I need to generate a master node for testing purposes on the regtest network. Can you help me with the parameters?'
        }
      ],
      tools,
      tool_choice: 'auto'
    });

    const toolCall = response.choices[0]?.message.tool_calls?.[0];
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
