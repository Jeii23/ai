import { PromptHandler } from '../dist/prompt';
import 'dotenv/config';

describe('PromptHandler', () => {
  let promptHandler: PromptHandler;

  beforeEach(() => {
    promptHandler = new PromptHandler(process.env['OPENAI_API_KEY'] || '');
  });

  it('should handle a simple wallet creation command', async () => {
    const response = await promptHandler.sendCommand(
      'I need to generate a master node on the regtest network for mnemonic abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about.'
    );

    expect(response).toBeDefined();
    expect(typeof response).toBe('string');
    console.log('AI Response:', response);
  }, 15000);
});
