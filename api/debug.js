import supabase from './_utils/supabase.js';
import { setCors } from './_utils/cors.js';

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const supabaseUrl = process.env.SUPABASE_URL ? 'set' : 'MISSING';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY ? 'set' : 'MISSING';
  const jwtSecret   = process.env.JWT_SECRET ? 'set' : 'using default';

  let dbTest = null;
  let dbError = null;
  try {
    const { data, error } = await supabase.from('accounts').select('id, account_name').limit(3);
    if (error) dbError = error.message;
    else dbTest = `OK — ${data.length} sample rows: ${data.map(r => r.account_name).join(', ')}`;
  } catch (e) {
    dbError = e.message;
  }

  return res.json({
    env: { SUPABASE_URL: supabaseUrl, SUPABASE_SERVICE_ROLE_KEY: supabaseKey, JWT_SECRET: jwtSecret },
    db: dbTest || `ERROR: ${dbError}`,
  });
}
