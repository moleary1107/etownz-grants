import { Pool, PoolClient, QueryResult } from 'pg'
import { logger } from '../utils/logger'

export class DatabaseService {
  private pool: Pool
  private static instance: DatabaseService

  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    })

    this.pool.on('error', (err) => {
      logger.error('Unexpected error on idle client', err)
    })
  }

  static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService()
    }
    return DatabaseService.instance
  }

  async query(text: string, params?: any[]): Promise<QueryResult> {
    const start = Date.now()
    const client = await this.pool.connect()
    
    try {
      const result = await client.query(text, params)
      const duration = Date.now() - start
      logger.debug('Executed query', { text: text.substring(0, 100), duration, rows: result.rowCount })
      return result
    } catch (error) {
      logger.error('Database query error', { text: text.substring(0, 100), params, error })
      throw error
    } finally {
      client.release()
    }
  }

  async transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect()
    
    try {
      await client.query('BEGIN')
      const result = await callback(client)
      await client.query('COMMIT')
      return result
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      const result = await this.query('SELECT NOW()')
      logger.info('Database connection test successful', { timestamp: result.rows[0].now })
      return true
    } catch (error) {
      logger.error('Database connection test failed', { error })
      return false
    }
  }

  async close(): Promise<void> {
    await this.pool.end()
  }
}

export const db = DatabaseService.getInstance()