import { Pool, PoolClient, QueryResult } from 'pg'
import { logger } from './logger'

export class DatabaseService {
  private pool: Pool
  private static instance: DatabaseService

  constructor() {
    const isProduction = process.env.NODE_ENV === 'production';
    const connectionString = process.env.DATABASE_URL;
    
    this.pool = new Pool({
      connectionString: connectionString,
      ssl: isProduction ? {
        rejectUnauthorized: false,
        // For DigitalOcean managed databases
        ca: process.env.DATABASE_CA_CERT
      } : false,
      max: 20,
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
    let client;
    
    try {
      client = await this.pool.connect()
      const result = await client.query(text, params)
      const duration = Date.now() - start
      logger.debug('Executed query', { text, duration, rows: result.rowCount })
      return result
    } catch (error) {
      logger.error('Database query error', { text, params, error })
      throw error
    } finally {
      if (client) {
        client.release()
      }
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

  async getClient(): Promise<PoolClient> {
    return this.pool.connect()
  }

  async close(): Promise<void> {
    await this.pool.end()
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
}

// Base repository class with common database operations
export abstract class BaseRepository {
  protected db: DatabaseService

  constructor() {
    this.db = DatabaseService.getInstance()
  }

  protected async findById<T>(table: string, id: string): Promise<T | null> {
    const result = await this.db.query(
      `SELECT * FROM ${table} WHERE id = $1`,
      [id]
    )
    return result.rows[0] || null
  }

  protected async findMany<T>(
    table: string,
    conditions: Record<string, any> = {},
    orderBy?: string,
    limit?: number,
    offset?: number
  ): Promise<T[]> {
    const whereClause = Object.keys(conditions).length > 0
      ? 'WHERE ' + Object.keys(conditions).map((key, index) => `${key} = $${index + 1}`).join(' AND ')
      : ''
    
    const orderClause = orderBy ? `ORDER BY ${orderBy}` : ''
    const limitClause = limit ? `LIMIT ${limit}` : ''
    const offsetClause = offset ? `OFFSET ${offset}` : ''

    const query = `SELECT * FROM ${table} ${whereClause} ${orderClause} ${limitClause} ${offsetClause}`.trim()
    const values = Object.values(conditions)

    const result = await this.db.query(query, values)
    return result.rows
  }

  protected async create<T>(table: string, data: Record<string, any>): Promise<T> {
    const keys = Object.keys(data)
    const values = Object.values(data)
    const placeholders = keys.map((_, index) => `$${index + 1}`).join(', ')
    const columns = keys.join(', ')

    const query = `INSERT INTO ${table} (${columns}) VALUES (${placeholders}) RETURNING *`
    const result = await this.db.query(query, values)
    return result.rows[0]
  }

  protected async update<T>(
    table: string,
    id: string,
    data: Record<string, any>
  ): Promise<T | null> {
    const keys = Object.keys(data)
    const values = Object.values(data)
    const setClause = keys.map((key, index) => `${key} = $${index + 2}`).join(', ')

    const query = `UPDATE ${table} SET ${setClause} WHERE id = $1 RETURNING *`
    const result = await this.db.query(query, [id, ...values])
    return result.rows[0] || null
  }

  protected async delete(table: string, id: string): Promise<boolean> {
    const result = await this.db.query(
      `DELETE FROM ${table} WHERE id = $1`,
      [id]
    )
    return (result.rowCount || 0) > 0
  }

  protected async count(table: string, conditions: Record<string, any> = {}): Promise<number> {
    const whereClause = Object.keys(conditions).length > 0
      ? 'WHERE ' + Object.keys(conditions).map((key, index) => `${key} = $${index + 1}`).join(' AND ')
      : ''

    const query = `SELECT COUNT(*) FROM ${table} ${whereClause}`.trim()
    const values = Object.values(conditions)

    const result = await this.db.query(query, values)
    return parseInt(result.rows[0].count)
  }
}

export const db = DatabaseService.getInstance()