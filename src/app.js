import express from 'express';
import morgan from 'morgan';
import config from './config/index.js';
import routes from './routes/index.js';
import pageRoutes from './routes/page.routes.js';
import { errorHandler, notFound } from './middlewares/error.middleware.js';
import { avatar, icon, logo } from '../public/js/shared.js';

const app = express();

app.disable('x-powered-by');

app.set('view engine', 'ejs');
app.set('views', config.paths.views);
Object.assign(app.locals, { icon, avatar, logo });

// Request logging: short coloured lines in development,
app.use(morgan(config.isProduction ? 'combined' : 'dev'));

// Body parsers
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: false, limit: '100kb' }));

// Static files: frontend scripts and (development only) locally saved photos.
app.use(express.static(config.paths.public, { index: false }));
app.use('/uploads', express.static(config.paths.uploads));

// Pages: "/" home (SSR) and "/app" (the client-rendered app)
app.use(pageRoutes);

// API
app.use('/api', routes);

// A typed or bookmarked page URL such as /contacts -> the app's hash route /app#/contacts
app.use((req, res, next) => {
  const isBrowserPageRequest =
    req.method === 'GET' &&
    !req.path.startsWith('/api/') &&
    !req.path.startsWith('/uploads/') &&
    req.accepts(['json', 'html']) === 'html';

  if (!isBrowserPageRequest) return next();
  res.redirect(`/app#${req.originalUrl}`);
});

// Errors - must be registered last
app.use(notFound);
app.use(errorHandler);

export default app;
