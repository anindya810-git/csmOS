import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'csmos-secret-key-2024';

export function verifyToken(req) {
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  if (!token) throw new Error('No token');
  return jwt.verify(token, JWT_SECRET);
}

export function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
}
