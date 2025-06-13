import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

// Simple auth test server
const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Simple health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// Demo login endpoint (simplified)
app.post('/api/auth/demo-login', async (req, res) => {
  const { email, password } = req.body;

  console.log('Demo login attempt:', { email, password });

  // Demo passwords mapping
  const demoPasswords: Record<string, string> = {
    'admin@etownz.com': 'admin123',
    'john@techstart.ie': 'techstart123',
    'mary@dublincc.ie': 'community123'
  };

  if (demoPasswords[email] === password) {
    res.json({
      success: true,
      message: 'Demo login successful',
      user: {
        id: '123',
        email,
        first_name: 'Demo',
        last_name: 'User',
        role: 'admin'
      },
      token: 'demo-jwt-token'
    });
  } else {
    res.status(401).json({
      success: false,
      error: 'Invalid credentials'
    });
  }
});

// Simple registration endpoint
app.post('/api/auth/register', async (req, res) => {
  const { email, password, first_name, last_name, org_name } = req.body;

  console.log('Registration attempt:', { email, first_name, last_name, org_name });

  if (!email || !password || !first_name || !last_name || !org_name) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields'
    });
  }

  // Mock successful registration
  res.status(201).json({
    success: true,
    message: 'User and organization created successfully',
    user: {
      id: '456',
      email,
      first_name,
      last_name,
      role: 'admin'
    },
    token: 'demo-jwt-token'
  });
});

app.listen(PORT, () => {
  console.log(`✅ Test server running on port ${PORT}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  console.log(`🔗 Demo login: POST http://localhost:${PORT}/api/auth/demo-login`);
  console.log(`🔗 Register: POST http://localhost:${PORT}/api/auth/register`);
});