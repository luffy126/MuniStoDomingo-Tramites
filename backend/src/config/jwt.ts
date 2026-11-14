import 'dotenv/config';
import jwt, { SignOptions } from 'jsonwebtoken';

const secret = process.env.JWT_SECRET;
if (!secret || secret.trim().length < 32 || /cambiar/i.test(secret)) {
  throw new Error('Configura JWT_SECRET con un secreto propio de al menos 32 caracteres');
}

const duration = process.env.JWT_EXPIRES_IN || '24h';
export const jwtSecret: string = secret;
export const jwtOptions: SignOptions = {
  algorithm: 'HS256',
  expiresIn: /^\d+$/.test(duration) ? Number(duration) : duration as SignOptions['expiresIn'],
};

// Fallar al arrancar si la duración no genera una sesión con vigencia positiva.
const probe = jwt.decode(jwt.sign({}, jwtSecret, jwtOptions));
if (!probe || typeof probe === 'string' || !probe.exp || !probe.iat || probe.exp <= probe.iat) {
  throw new Error('JWT_EXPIRES_IN debe indicar una duración positiva');
}
