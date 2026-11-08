import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import categoriesRoutes from './categories.routes.js';
import brandsRoutes from './brands.routes.js';
import productsRoutes from './products.routes.js';
import inventoryRoutes from './inventory.routes.js';
import reviewsRoutes from './reviews.routes.js';
import bannersRoutes from './banners.routes.js';
import uploadsRoutes from './uploads.routes.js';
import orderRoutes from './order.routes.js';
import statsRoutes from './stats.routes.js';
import settingsRoutes from './settings.routes.js';
import pagesRoutes from './pages.routes.js';
import auditRoutes from './audit.routes.js';
import searchRoutes from './search.routes.js';

const router = Router();

router.use(requireAuth, requireRole('ADMIN'));

router.use('/categories', categoriesRoutes);
router.use('/brands', brandsRoutes);
router.use('/products', productsRoutes);
router.use('/inventory', inventoryRoutes);
router.use('/reviews', reviewsRoutes);
router.use('/banners', bannersRoutes);
router.use('/uploads', uploadsRoutes);
router.use('/orders', orderRoutes);
router.use('/stats', statsRoutes);
router.use('/settings', settingsRoutes);
router.use('/pages', pagesRoutes);
router.use('/audit', auditRoutes);
router.use('/search', searchRoutes);

export default router;
