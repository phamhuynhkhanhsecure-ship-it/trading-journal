import { Request, Response, NextFunction } from 'express';
import { OAuth2Client } from 'google-auth-library';
import dotenv from 'dotenv';
import path from 'path';

// ensure dotenv is loaded if env is used
dotenv.config({ path: path.join(process.cwd(), '.env') });

const clientId = process.env.GOOGLE_LOGIN_CLIENT_ID || process.env.GOOGLE_CLIENT_ID || '260475032580-ppq0pjhg18hibcjop37bere1ljboal1q.apps.googleusercontent.com';
const client = new OAuth2Client();

export interface AuthRequest extends Request {
  user?: {
    email: string;
    name?: string;
  };
}

export const requireAuth = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ success: false, error: 'Unauthorized: No token provided' });
      return;
    }

    const token = authHeader.split(' ')[1];
    
    // Validate Google Token
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: clientId,
    });
    
    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      res.status(401).json({ success: false, error: 'Unauthorized: Invalid token payload' });
      return;
    }

    req.user = {
      email: payload.email,
      name: payload.name,
    };

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(401).json({ success: false, error: 'Unauthorized: Invalid or expired token' });
  }
};
