import dmdb from 'dmdb';
import dotenv from 'dotenv';

dotenv.config();

try {
  const user = process.env.DM_USER || 'SYSDBA';
  const password = process.env.DM_PASSWORD || 'SYSDBA';
  const host = process.env.DM_HOST || 'localhost';
  const port = process.env.DM_PORT || '5236';
  const connectString = `dm://${user}:${password}@${host}:${port}`;

  const conn = dmdb.createPool({
    connectString,
  });
  console.log('Pool created successfully');
} catch (e) {
  console.error('Error creating pool:', e);
}
