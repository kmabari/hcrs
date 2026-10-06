import type { RequestHandler } from 'express';
import { isMainAdminAccount } from './adminAccess';

type GuardDependencies = {
  available: () => boolean;
  verifyToken: (token: string) => Promise<{ uid: string; email?: string }>;
  loadProfile: (uid: string) => Promise<{ role?: string; isAdmin?: boolean; district?: string } | null>;
};

export function createMainAdminGuard(dependencies: GuardDependencies): RequestHandler {
  return async (req, res, next) => {
    const route = req.path.replace(/^\/api(?=\/)/, '');
    if ((!route.startsWith('/admin/') && route !== '/save-settings') || route === '/admin/update-member') return next();
    if (!dependencies.available()) { res.status(503).json({ error: 'Admin database is unavailable' }); return; }
    const authorization = String(req.headers.authorization || '');
    if (!authorization.startsWith('Bearer ')) { res.status(401).json({ error: 'Main admin authentication is required' }); return; }
    try {
      const decoded = await dependencies.verifyToken(authorization.slice(7));
      const profile = await dependencies.loadProfile(decoded.uid);
      if (!isMainAdminAccount(decoded.email, profile)) {
        res.status(403).json({ error: 'Main admin access is required' }); return;
      }
      next();
    } catch {
      res.status(401).json({ error: 'Invalid admin session' });
    }
  };
}
