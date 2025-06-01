import { DatabaseService } from '../services/database';
import { GrantsRepository } from '../repositories/grantsRepository';
import { UsersRepository } from '../repositories/usersRepository';

describe('Database Integration (Simple)', () => {
  let db: DatabaseService;
  let grantsRepo: GrantsRepository;
  let usersRepo: UsersRepository;

  beforeAll(async () => {
    db = new DatabaseService();
    grantsRepo = new GrantsRepository();
    usersRepo = new UsersRepository();
  });

  afterAll(async () => {
    await db.close();
  });

  describe('Database Connection', () => {
    it('should connect to the test database successfully', async () => {
      const isConnected = await db.testConnection();
      expect(isConnected).toBe(true);
    });

    it('should execute a simple query', async () => {
      const result = await db.query('SELECT 1 as test');
      expect(result.rows[0].test).toBe(1);
    });
  });

  describe('Grants Repository', () => {
    it('should find grants with empty filters', async () => {
      const grants = await grantsRepo.findGrants({});
      expect(Array.isArray(grants)).toBe(true);
    });

    it('should get grant statistics', async () => {
      const stats = await grantsRepo.getGrantStats();
      expect(stats).toHaveProperty('total');
      expect(stats).toHaveProperty('active');
      expect(stats).toHaveProperty('expired');
      expect(stats).toHaveProperty('recent');
    });
  });

  describe('Users Repository', () => {
    it('should find users', async () => {
      const users = await usersRepo.findUsers();
      expect(Array.isArray(users)).toBe(true);
    });

    it('should find organizations', async () => {
      const organizations = await usersRepo.findOrganizations();
      expect(Array.isArray(organizations)).toBe(true);
      expect(organizations.length).toBeGreaterThanOrEqual(2); // We inserted 2 sample orgs
    });
  });

  describe('User Registration Flow', () => {
    const testEmail = `test${Date.now()}@example.com`;
    
    it('should check if user does not exist initially', async () => {
      const user = await usersRepo.findUserByEmail(testEmail);
      expect(user).toBeNull();
    });

    it('should register a new user and organization', async () => {
      const user = await usersRepo.registerUser(
        {
          email: testEmail,
          first_name: 'Test',
          last_name: 'User',
          role: 'admin',
          auth_provider: 'email',
          is_active: true,
          org_id: '' // Will be set by registerUser
        },
        {
          name: 'Test Organization',
          description: 'A test organization',
          contact_email: testEmail,
          profile_data: {
            password_hash: 'test_hash'
          }
        }
      );

      expect(user).toBeDefined();
      expect(user.email).toBe(testEmail);
      expect(user.first_name).toBe('Test');
      expect(user.last_name).toBe('User');
      expect(user.role).toBe('admin');
      expect(user.org_id).toBeDefined();
    });

    it('should find the registered user', async () => {
      const user = await usersRepo.findUserByEmail(testEmail);
      expect(user).toBeDefined();
      expect(user?.email).toBe(testEmail);
    });

    it('should find user with organization', async () => {
      const user = await usersRepo.findUserByEmail(testEmail);
      if (user) {
        const userWithOrg = await usersRepo.findUserWithOrganization(user.id);
        expect(userWithOrg).toBeDefined();
        expect(userWithOrg?.organization).toBeDefined();
        expect(userWithOrg?.organization?.name).toBe('Test Organization');
      }
    });
  });
});