import { existsSync } from 'node:fs';
import path from 'node:path';
import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import morgan from 'morgan';
import config from './config/index.js';
import routes from './routes/index.js';
import pageRoutes from './routes/page.routes.js';
import { errorHandler, notFound } from './middlewares/error.middleware.js';
import { morganStream } from './utils/logger.js';
// The same helpers the browser uses, so the server-rendered home page draws icons and avatars identically
import { avatar, icon, logo } from '../public/js/shared.js';

const app = express();

// Render, Railway etc. sit behind a proxy: trust it so req.ip (used by the rate limiter) is the real client
app.set('trust proxy', 1);

// Security headers. The CSP is off because the home page loads Tailwind and fonts from CDNs.
app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));

// Template engine: EJS files in views/ (the server-rendered home page)
app.set('view engine', 'ejs');
app.set('views', config.paths.views);
Object.assign(app.locals, { icon, avatar, logo, appUrl: config.appUrl });

// Request logging through Winston: short lines in development, Apache-style in production
if (!config.isTest) {
  app.use(morgan(config.isProduction ? 'combined' : 'dev', { stream: morganStream }));
}

// CORS: only the React app's origin(s) from CLIENT_URL may call the API from a browser
app.use(
  '/api',
  cors({
    origin: config.cors.origins,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['Content-Disposition', 'X-Cache'],
  }),
);

// Rate limiting: protects login/register from password guessing and the API from floods
const limiter = (options) =>
  rateLimit({
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    skip: () => config.isTest,
    message: { success: false, message: 'Too many requests, please try again later' },
    ...options,
  });
app.use('/api/auth', limiter({ windowMs: 15 * 60 * 1000, limit: 30 }));
app.use('/api', limiter({ windowMs: 60 * 1000, limit: 300 }));

// Body parsers
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: false, limit: '100kb' }));

// Static files: home page scripts and (development only) locally saved photos.
// index: false - "/" is the server-rendered home page, not public/index.html
app.use(express.static(config.paths.public, { index: false }));
app.use('/uploads', express.static(config.paths.uploads));
// Browsers ask for /favicon.ico by themselves; the icon is an SVG
app.get('/favicon.ico', (_req, res) => res.redirect(301, '/favicon.svg'));

// Pages: "/" home (SSR)
app.use(pageRoutes);

// API
app.use('/api', routes);

// The React app (client/dist, built with "npm run build") is served at /app.
// Every /app/... path returns index.html so React Router can show the right page.
const clientIndex = path.join(config.paths.client, 'index.html');
if (existsSync(clientIndex)) {
  app.use('/app', express.static(config.paths.client, { index: false }));
  app.get(['/app', '/app/{*path}'], (_req, res) => res.sendFile(clientIndex));
}

// A typed or bookmarked page URL such as /contacts -> the React app's /app/contacts
app.use((req, res, next) => {
  const isBrowserPageRequest =
    req.method === 'GET' &&
    !req.path.startsWith('/api/') &&
    !req.path.startsWith('/app') &&
    !req.path.startsWith('/uploads/') &&
    req.accepts(['json', 'html']) === 'html';

  if (!isBrowserPageRequest) return next();
  res.redirect(`${config.appUrl}${req.originalUrl}`);
});

// Errors - must be registered last
app.use(notFound);
app.use(errorHandler);

export default app;
