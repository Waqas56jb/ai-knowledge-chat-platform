/** Express application (no listening here, so tests can import it). */
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import pinoHttp from 'pino-http';
import { env } from './config/env.js';
import { corsOptions } from './config/cors.js';
import { logger } from './utils/logger.js';
import { requestId } from './middleware/requestId.js';
import { globalLimiter } from './middleware/rateLimit.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import healthRoutes from './routes/health.routes.js';
import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import { chatRouter, messageRouter } from './routes/chat.routes.js';
import conversationRoutes from './routes/conversation.routes.js';
import sourceRoutes from './routes/source.routes.js';
import notificationRoutes from './routes/notification.routes.js';
import invitationRoutes from './routes/invitation.routes.js';
import adminUserRoutes from './routes/admin-user.routes.js';
import adminKnowledgeRoutes from './routes/admin-knowledge.routes.js';
import adminProcessingRoutes from './routes/admin-processing.routes.js';
import adminAnalyticsRoutes from './routes/admin-analytics.routes.js';
import adminAuditRoutes from './routes/admin-audit.routes.js';
import adminSettingsRoutes from './routes/admin-settings.routes.js';
import { adminConversationRouter, adminSearchRouter, adminContentGapRouter } from './routes/admin-misc.routes.js';

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  if (env.TRUST_PROXY) app.set('trust proxy', 1);

  app.use(requestId);
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'same-site' } }));
  app.use(cors(corsOptions));
  app.use(pinoHttp({
    logger, genReqId: req => req.id,
    customProps: req => ({ requestId: req.id, userId: req.user?.id }),
    serializers: { req: r => ({ method: r.method, url: r.url }), res: r => ({ statusCode: r.statusCode }) },
    autoLogging: { ignore: req => req.url.startsWith(`${env.API_PREFIX}/health`) }
  }));
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: false, limit: '100kb' }));
  app.use(globalLimiter);

  const api = express.Router();
  api.use('/health', healthRoutes);
  api.use('/auth', authRoutes);
  api.use('/users', userRoutes);
  api.use('/chat', chatRouter);
  api.use('/messages', messageRouter);
  api.use('/conversations', conversationRoutes);
  api.use('/sources', sourceRoutes);
  api.use('/notifications', notificationRoutes);
  api.use('/admin/users', adminUserRoutes);
  api.use('/admin/invitations', invitationRoutes);
  api.use('/admin/knowledge', adminKnowledgeRoutes);
  api.use('/admin/processing', adminProcessingRoutes);
  api.use('/admin/conversations', adminConversationRouter);
  api.use('/admin/analytics', adminAnalyticsRoutes);
  api.use('/admin/audit-logs', adminAuditRoutes);
  api.use('/admin/settings', adminSettingsRoutes);
  api.use('/admin/search', adminSearchRouter);
  api.use('/admin/content-gaps', adminContentGapRouter);
  app.use(env.API_PREFIX, api);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
