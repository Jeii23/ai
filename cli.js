#!/usr/bin/env node

const { PromptHandler } = require('./dist/prompt');
const readline = require('readline');
require('dotenv').config();

if (!process.env.OPENAI_API_KEY) {
  console.error('Error: OPENAI_API_KEY environment variable is not set');
  process.exit(1);
}

const promptHandler = new PromptHandler(process.env.OPENAI_API_KEY);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('Bitcoin Wallet Assistant CLI (type "exit" to quit)');
console.log('------------------------------------------------');

async function processCommand(command) {
  try {
    const response = await promptHandler.sendCommand(command);
    console.log('\nResponse:', response.content);
    
    if (response.toolCalls.length > 0) {
      console.log('\nTool Calls:');
      response.toolCalls.forEach(({ name, args, result }) => {
        console.log(`- ${name}:`);
        console.log('  Arguments:', args);
        console.log('  Result:', result);
      });
    }
    
    console.log('\nMetrics:', {
      totalTokens: response.metrics.totalTokens,
      estimatedCost: `$${response.metrics.estimatedCost.toFixed(4)}`
    });
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : error);
  }
}

function prompt() {
  rl.question('\n> ', async command => {
    if (command.toLowerCase() === 'exit') {
      rl.close();
      return;
    }

    await processCommand(command);
    prompt();
  });
}

prompt();

rl.on('close', () => {
  console.log('\nGoodbye!');
  process.exit(0);
});
