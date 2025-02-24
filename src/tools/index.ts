import { schema as masterNodeSchema } from './masterNode';

export const tools = [
  {
    type: 'function' as const,
    function: masterNodeSchema
  }
];

export * from './masterNode';
