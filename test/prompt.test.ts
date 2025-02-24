import { PromptHandler } from '../dist/prompt';
import 'dotenv/config';

describe('PromptHandler', () => {
  let promptHandler: PromptHandler;

  beforeEach(() => {
    promptHandler = new PromptHandler(process.env['OPENAI_API_KEY'] || '');
  });

  it('should handle a simple wallet creation command', async () => {
    const response = await promptHandler.sendCommand(
      'Create a new wallet on the regtest network using the standard test mnemonic'
    );
    
    expect(response).toBeDefined();
    expect(typeof response).toBe('string');
    console.log('AI Response:', response);
  }, 15000);
});
