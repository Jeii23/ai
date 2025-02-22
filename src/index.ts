import OpenAI from 'openai';
import 'dotenv/config';

type ChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

const openai = new OpenAI({
  apiKey: process.env['OPENAI_API_KEY']
});

const messages: ChatMessage[] = [
  { role: 'system', content: 'You are a helpful assistant.' },
  { role: 'user', content: 'How much is 2+2?' }
];

const main = async (): Promise<void> => {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages,
      response_format: {
        type: 'text'
      },
      temperature: 1,
      max_tokens: 2048,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0
    });

    const content = response.choices[0]?.message.content;
    if (!content) {
      throw new Error('No response content received');
    }

    console.log(content);
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error('Error:', error.message);
    } else {
      console.error('Unknown error occurred');
    }
  }
};

main().catch((error: unknown) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
