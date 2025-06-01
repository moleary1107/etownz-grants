import { db } from '../services/database';
import { GrantsRepository } from '../repositories/grantsRepository';
import { UsersRepository } from '../repositories/usersRepository';

describe('Database Integration', () => {
  let grantsRepo: GrantsRepository;
  let usersRepo: UsersRepository;

  beforeAll(async () => {
    grantsRepo = new GrantsRepository();
    usersRepo = new UsersRepository();
  });

  afterAll(async () => {
    await db.close();
  });

  describe('Database Connection', () => {
    it('should connect to the database successfully', async () => {
      const isConnected = await db.testConnection();
      expect(isConnected).toBe(true);
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
      expect(typeof stats.total).toBe('string'); // PostgreSQL returns string for count
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
    });
  });
});