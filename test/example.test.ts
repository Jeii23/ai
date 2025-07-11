import OpenAI from 'openai';
import 'dotenv/config';

import { getMasterNodeFromMnemonic } from '../dist/index';

describe('OpenAI Chat Completion', () => {
  let openai: OpenAI;

  beforeEach(() => {
    openai = new OpenAI({
      apiKey: process.env['OPENAI_API_KEY']
    });
  });

  it('should successfully get a chat completion', async () => {
    const response = await openai.chat.completions.create({
      model: 'gpt-4.1',
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'How much is 2+2?' }
      ],
      response_format: { type: 'text' }
    });

    const content = response.choices[0]?.message.content;
    expect(content).toBeDefined();
    expect(typeof content).toBe('string');
    // We can't expect exact content since AI responses may vary
    console.log('AI Response:', content);
  }, 10000); // Increased timeout since API calls take time

  it('should handle errors appropriately', async () => {
    await expect(
      openai.chat.completions.create({
        model: 'non-existent-model', // This will cause an error
        messages: [
          { role: 'system', content: 'You are a helpful assistant.' },
          { role: 'user', content: 'How much is 2+2?' }
        ],
        response_format: { type: 'text' }
      })
    ).rejects.toThrow();
  });

  it('test bitcoinjs', () => {
    getMasterNodeFromMnemonic({
      mnemonic:
        'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about',
      networkType: 'BITCOIN'
    });
  });
});
