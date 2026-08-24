import { Router } from 'express';
import { categoryController } from '../controllers/categoryController.js';
import { masterDataController } from '../controllers/masterDataController.js';
import { userController } from '../controllers/userController.js';
import { statisticsController } from '../controllers/statisticsController.js';
import { settingsController } from '../controllers/settingsController.js';
import { auditController } from '../controllers/auditController.js';
import { reconciliationController } from '../controllers/reconciliationController.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

import authRoutes from './authRoutes.js';
import documentRoutes from './documentRoutes.js';
import answerKeyRoutes from './answerKeyRoutes.js';

const apiRouter = Router();

// Auth Routes
apiRouter.use('/auth', authRoutes);

// Document & Answer Key Routes
apiRouter.use('/documents', documentRoutes);
apiRouter.use('/answer-keys', answerKeyRoutes);

// Master Data: All-in-one endpoint
apiRouter.get('/master/all', requireAuth, (req, res, next) =>
  masterDataController.getAllMaster(req, res, next)
);

// Master Data: Jenjang (Education Levels)
const lvlRouter = Router();
lvlRouter.get('/', requireAuth, (req, res, next) => masterDataController.listLevels(req, res, next));
lvlRouter.post('/', requireAuth, requireRole('ADMIN'), (req, res, next) =>
  masterDataController.createLevel(req, res, next)
);
lvlRouter.put('/:id', requireAuth, requireRole('ADMIN'), (req, res, next) =>
  masterDataController.updateLevel(req, res, next)
);
lvlRouter.delete('/:id', requireAuth, requireRole('ADMIN'), (req, res, next) =>
  masterDataController.deleteLevel(req, res, next)
);
apiRouter.use('/levels', lvlRouter);

// Master Data: Kelas (Grade Levels)
const grdRouter = Router();
grdRouter.get('/', requireAuth, (req, res, next) => masterDataController.listGrades(req, res, next));
grdRouter.post('/', requireAuth, requireRole('ADMIN'), (req, res, next) =>
  masterDataController.createGrade(req, res, next)
);
grdRouter.put('/:id', requireAuth, requireRole('ADMIN'), (req, res, next) =>
  masterDataController.updateGrade(req, res, next)
);
grdRouter.delete('/:id', requireAuth, requireRole('ADMIN'), (req, res, next) =>
  masterDataController.deleteGrade(req, res, next)
);
apiRouter.use('/grades', grdRouter);

// Master Data: Mata Pelajaran (Subjects)
const sbjRouter = Router();
sbjRouter.get('/', requireAuth, (req, res, next) => masterDataController.listSubjects(req, res, next));
sbjRouter.post('/', requireAuth, requireRole('ADMIN'), (req, res, next) =>
  masterDataController.createSubject(req, res, next)
);
sbjRouter.put('/:id', requireAuth, requireRole('ADMIN'), (req, res, next) =>
  masterDataController.updateSubject(req, res, next)
);
sbjRouter.delete('/:id', requireAuth, requireRole('ADMIN'), (req, res, next) =>
  masterDataController.deleteSubject(req, res, next)
);
apiRouter.use('/subjects', sbjRouter);

// Master Data: Tags Pencarian (Search Tags)
const tagRouter = Router();
tagRouter.get('/', requireAuth, (req, res, next) => masterDataController.listTags(req, res, next));
tagRouter.post('/', requireAuth, requireRole('ADMIN'), (req, res, next) =>
  masterDataController.createTag(req, res, next)
);
tagRouter.put('/:id', requireAuth, requireRole('ADMIN'), (req, res, next) =>
  masterDataController.updateTag(req, res, next)
);
tagRouter.delete('/:id', requireAuth, requireRole('ADMIN'), (req, res, next) =>
  masterDataController.deleteTag(req, res, next)
);
apiRouter.use('/tags', tagRouter);

// Category Routes
const catRouter = Router();
catRouter.get('/', requireAuth, (req, res, next) => categoryController.list(req, res, next));
catRouter.post('/', requireAuth, requireRole('ADMIN'), (req, res, next) =>
  categoryController.create(req, res, next)
);
catRouter.put('/:id', requireAuth, requireRole('ADMIN'), (req, res, next) =>
  categoryController.update(req, res, next)
);
catRouter.delete('/:id', requireAuth, requireRole('ADMIN'), (req, res, next) =>
  categoryController.delete(req, res, next)
);
apiRouter.use('/categories', catRouter);

// User Routes (Admin only)
const usrRouter = Router();
usrRouter.get('/', requireAuth, requireRole('ADMIN'), (req, res, next) =>
  userController.list(req, res, next)
);
usrRouter.post('/', requireAuth, requireRole('ADMIN'), (req, res, next) =>
  userController.create(req, res, next)
);
usrRouter.put('/:id', requireAuth, requireRole('ADMIN'), (req, res, next) =>
  userController.update(req, res, next)
);
usrRouter.delete('/:id', requireAuth, requireRole('ADMIN'), (req, res, next) =>
  userController.delete(req, res, next)
);
apiRouter.use('/users', usrRouter);

// Statistics Routes
const statRouter = Router();
statRouter.get('/overview', requireAuth, (req, res, next) =>
  statisticsController.getOverview(req, res, next)
);
apiRouter.use('/statistics', statRouter);

// Settings Routes
const setRouter = Router();
setRouter.get('/institution', requireAuth, (req, res, next) =>
  settingsController.getSettings(req, res, next)
);
setRouter.put('/institution', requireAuth, requireRole('ADMIN'), (req, res, next) =>
  settingsController.updateSettings(req, res, next)
);
setRouter.get('/test-drive', requireAuth, requireRole('ADMIN'), (req, res, next) =>
  settingsController.testDrive(req, res, next)
);
setRouter.get('/test-database', requireAuth, requireRole('ADMIN'), (req, res, next) =>
  settingsController.testDatabase(req, res, next)
);
apiRouter.use('/settings', setRouter);
setRouter.post('/run-migration', requireAuth, requireRole('ADMIN'), (req, res, next) =>
  settingsController.runMigrationAndSeed(req, res, next)
);

// Audit Log Routes (Admin only)
const auditRouter = Router();
auditRouter.get('/', requireAuth, requireRole('ADMIN'), (req, res, next) =>
  auditController.list(req, res, next)
);
apiRouter.use('/audit-logs', auditRouter);

// Reconciliation Routes (Admin only)
const recRouter = Router();
recRouter.post('/run', requireAuth, requireRole('ADMIN'), (req, res, next) =>
  reconciliationController.run(req, res, next)
);
apiRouter.use('/reconciliation', recRouter);

export default apiRouter;
