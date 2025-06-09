export default async function globalSetup() {
  // Set unique test ports to avoid conflicts
  const testPort = Math.floor(Math.random() * (9999 - 9000) + 9000);
  process.env.TEST_PORT = testPort.toString();
  process.env.NODE_ENV = 'test';
  
  console.log(`Setting up test environment with port: ${testPort}`);
}