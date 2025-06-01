import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

describe('Authentication Logic', () => {
  describe('Password Hashing', () => {
    it('should hash passwords correctly', () => {
      const password = 'testpassword123';
      const hash = bcrypt.hashSync(password, 10);
      
      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(bcrypt.compareSync(password, hash)).toBe(true);
      expect(bcrypt.compareSync('wrongpassword', hash)).toBe(false);
    });
  });

  describe('JWT Token Generation', () => {
    const secretKey = 'test_secret_key';
    
    it('should generate valid JWT tokens', () => {
      const payload = {
        userId: 'test-user-id',
        email: 'test@example.com',
        role: 'admin'
      };

      const token = jwt.sign(payload, secretKey, { expiresIn: '1h' });
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');

      const decoded = jwt.verify(token, secretKey) as any;
      expect(decoded.userId).toBe(payload.userId);
      expect(decoded.email).toBe(payload.email);
      expect(decoded.role).toBe(payload.role);
    });

    it('should reject invalid tokens', () => {
      expect(() => {
        jwt.verify('invalid-token', secretKey);
      }).toThrow();
    });

    it('should reject tokens with wrong secret', () => {
      const token = jwt.sign({ userId: 'test' }, 'wrong-secret');
      
      expect(() => {
        jwt.verify(token, secretKey);
      }).toThrow();
    });
  });

  describe('Email Validation', () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    it('should validate correct email formats', () => {
      const validEmails = [
        'test@example.com',
        'user.name@domain.co.uk',
        'admin+tag@company.org'
      ];

      validEmails.forEach(email => {
        expect(emailRegex.test(email)).toBe(true);
      });
    });

    it('should reject invalid email formats', () => {
      const invalidEmails = [
        'invalid-email',
        '@domain.com',
        'user@',
        'user@domain',
        'user name@domain.com'
      ];

      invalidEmails.forEach(email => {
        expect(emailRegex.test(email)).toBe(false);
      });
    });
  });
});