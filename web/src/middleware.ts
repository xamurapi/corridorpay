import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

export default createMiddleware(routing);

export const config = {
  // Skip /admin (RU only, no locale prefix), /api, /_next, /static, files with extensions
  matcher: ['/((?!admin|api|_next|_vercel|.*\\..*).*)'],
};
