#!/usr/bin/env node

import { spawn } from 'child_process';

// Test the MCP server by starting it and sending some basic commands
async function testMCPServer() {
  console.log('Testing Grant Processing MCP Server...');
  
  const server = spawn('node', ['dist/index.js'], {
    stdio: ['pipe', 'pipe', 'inherit']
  });

  // Test initialize request
  const initRequest = {
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: {
        name: 'test-client',
        version: '1.0.0'
      }
    }
  };

  server.stdin.write(JSON.stringify(initRequest) + '\n');

  // Test list tools request
  const listToolsRequest = {
    jsonrpc: '2.0',
    id: 2,
    method: 'tools/list',
    params: {}
  };

  setTimeout(() => {
    server.stdin.write(JSON.stringify(listToolsRequest) + '\n');
  }, 100);

  // Test grant analysis tool
  const analyzeGrantRequest = {
    jsonrpc: '2.0',
    id: 3,
    method: 'tools/call',
    params: {
      name: 'analyze_grant_requirements',
      arguments: {
        grantText: 'This grant requires organizations to be registered nonprofits with experience in community development. Must submit annual financial reports and demonstrate impact measurement capabilities.',
        grantId: 'test-grant-001',
        analysisDepth: 'basic'
      }
    }
  };

  setTimeout(() => {
    server.stdin.write(JSON.stringify(analyzeGrantRequest) + '\n');
  }, 200);

  let responseBuffer = '';
  server.stdout.on('data', (data) => {
    responseBuffer += data.toString();
    console.log('Server response:', data.toString());
  });

  setTimeout(() => {
    server.kill();
    console.log('Test completed');
  }, 2000);
}

testMCPServer().catch(console.error);