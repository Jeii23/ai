#!/usr/bin/env node

const { PromptHandler } = require('./dist/prompt');
const readline = require('readline');
require('dotenv').config();

const args = process.argv.slice(2);
const showDetails = args.includes('--verbose');

if (!process.env.OPENAI_API_KEY) {
  console.error('Error: OPENAI_API_KEY environment variable is not set');
  process.exit(1);
}

const promptHandler = new PromptHandler(process.env.OPENAI_API_KEY);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

if (showDetails) {
  console.log('Bitcoin Wallet Assistant CLI (type "exit" to quit)');
  console.log('------------------------------------------------');
  console.log('Run without --verbose for minimal output');
}

async function processCommand(command) {
  try {
    // Echo the command in green
    console.log(`\x1b[32m${command}\x1b[0m`);
    
    const response = await promptHandler.sendCommand(command);
    if (showDetails) {
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
    } else {
      console.log(response.content);
    }
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : error);
  }
}

function prompt() {
  rl.question('\n\x1b[32m> ', async command => {
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
