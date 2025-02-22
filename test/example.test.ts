import OpenAI from 'openai';
import { jest } from '@jest/globals';

// Mock OpenAI
jest.mock('openai', () => {
  return {
    default: jest.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: jest.fn()
        }
      }
    }))
  };
});

describe('OpenAI Chat Completion', () => {
  let mockOpenAI: jest.Mocked<OpenAI>;
  
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    mockOpenAI = new OpenAI({ apiKey: 'test-key' }) as jest.Mocked<OpenAI>;
  });

  it('should successfully get a chat completion', async () => {
    const mockResponse = {
      choices: [
        {
          message: {
            content: '4'
          }
        }
      ]
    };

    // Setup mock implementation
    mockOpenAI.chat.completions.create.mockResolvedValueOnce(mockResponse);

    const response = await mockOpenAI.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'How much is 2+2?' }
      ],
      response_format: { type: 'text' }
    });

    expect(response.choices[0].message.content).toBe('4');
    expect(mockOpenAI.chat.completions.create).toHaveBeenCalledTimes(1);
    expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: 'You are a helpful assistant.' },
          { role: 'user', content: 'How much is 2+2?' }
        ]
      })
    );
  });

  it('should handle errors appropriately', async () => {
    const errorMessage = 'API Error';
    mockOpenAI.chat.completions.create.mockRejectedValueOnce(new Error(errorMessage));

    await expect(mockOpenAI.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'How much is 2+2?' }
      ],
      response_format: { type: 'text' }
    })).rejects.toThrow(errorMessage);

    expect(mockOpenAI.chat.completions.create).toHaveBeenCalledTimes(1);
  });
});
