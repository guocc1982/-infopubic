import dmdb from 'dmdb';
import dotenv from 'dotenv';

dotenv.config();

class DamengDB {
  private pool: any;

  constructor() {
    const user = process.env.DM_USER || 'SYSDBA';
    const password = process.env.DM_PASSWORD || 'SYSDBA';
    const host = process.env.DM_HOST || 'localhost';
    const port = process.env.DM_PORT || '5236';
    const connectString = `dm://${user}:${password}@${host}:${port}`;

    this.pool = dmdb.createPool({
      connectString,
      poolMax: 10,
      poolMin: 1,
    });
  }

  async execute(sql: string, params: any[] = []): Promise<any> {
    let conn;
    try {
      conn = await this.pool.getConnection();
      const result = await conn.execute(sql, params);
      // For inserts, we might want to get the last identity value
      // Dameng supports SELECT @@IDENTITY
      return result;
    } catch (err) {
      console.error('Dameng execute error:', err);
      throw err;
    } finally {
      if (conn) {
        await conn.close();
      }
    }
  }

  async close(): Promise<void> {
    if (this.pool) {
      await this.pool.close();
    }
  }

  async withConnection<T>(callback: (conn: any) => Promise<T>): Promise<T> {
    let conn;
    try {
      conn = await this.pool.getConnection();
      return await callback(conn);
    } catch (err) {
      console.error('Dameng withConnection error:', err);
      throw err;
    } finally {
      if (conn) {
        await conn.close();
      }
    }
  }

  async query(sql: string, params: any[] = []): Promise<any[]> {
    let conn;
    try {
      conn = await this.pool.getConnection();
      const result = await conn.execute(sql, params);
      // dmdb returns results in rows and metaData
      const rows = result.rows || [];
      const metaData = result.metaData || [];
      return rows.map((row: any) => {
        const obj: any = {};
        metaData.forEach((meta: any, index: number) => {
          obj[meta.name.toLowerCase()] = row[index];
        });
        return obj;
      });
    } catch (err) {
      console.error('Dameng query error:', err);
      throw err;
    } finally {
      if (conn) {
        await conn.close();
      }
    }
  }

  async queryOne(sql: string, params: any[] = []): Promise<any> {
    const rows = await this.query(sql, params);
    return rows.length > 0 ? rows[0] : null;
  }
}

export const db = new DamengDB();
