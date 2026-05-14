/**
 * COMPOSITION ROOT — The ONLY place where concrete classes are instantiated
 * and wired together. All other modules depend only on interfaces (DIP).
 *
 * To swap an implementation (e.g. use S3 instead of Google Drive),
 * change only THIS file — zero changes elsewhere.
 */

// Repositories
import { TradeRepository } from '../repositories/trade.repository.js';
import { RuleRepository } from '../repositories/rule.repository.js';
import { TagRepository } from '../repositories/tag.repository.js';
import { JournalRepository } from '../repositories/journal.repository.js';
import { PlaybookRepository } from '../repositories/playbook.repository.js';

// Mappers
import { TradeMapper } from '../mappers/trade.mapper.js';
import { RuleMapper } from '../mappers/rule.mapper.js';
import { TagMapper } from '../mappers/tag.mapper.js';
import { JournalMapper } from '../mappers/journal.mapper.js';
import { PlaybookMapper } from '../mappers/playbook.mapper.js';

// Services
import { TradeService } from '../services/trade.service.js';
import { TradeImageService } from '../services/trade-image.service.js';
import { RuleService } from '../services/rule.service.js';
import { TagService } from '../services/tag.service.js';
import { JournalService } from '../services/journal.service.js';
import { PlaybookService } from '../services/playbook.service.js';
import { AnalyticsService } from '../services/analytics.service.js';
import { AIService } from '../services/ai.service.js';
import { ExportService } from '../services/export.service.js';
import { createStorageProvider } from '../services/storage/storage.factory.js';
import { createExportFormatter } from '../services/export/export.factory.js';

// Controllers
import { TradeController } from '../controllers/trade.controller.js';
import { RuleController } from '../controllers/rule.controller.js';
import { TagController } from '../controllers/tag.controller.js';
import { JournalController } from '../controllers/journal.controller.js';
import { PlaybookController } from '../controllers/playbook.controller.js';
import { AnalyticsController } from '../controllers/analytics.controller.js';
import { AIController } from '../controllers/ai.controller.js';
import { ExportController } from '../controllers/export.controller.js';

// ───── Infrastructure ─────
const storageProvider = createStorageProvider();
const exportFormatter = createExportFormatter('xlsx');

// ───── Repositories ─────
const tradeRepo = new TradeRepository();
const ruleRepo = new RuleRepository();
const tagRepo = new TagRepository();
const journalRepo = new JournalRepository();
const playbookRepo = new PlaybookRepository();

// ───── Mappers ─────
const tradeMapper = new TradeMapper();
const ruleMapper = new RuleMapper();
const tagMapper = new TagMapper();
const journalMapper = new JournalMapper();
const playbookMapper = new PlaybookMapper();

// ───── Services ─────
const tradeService = new TradeService(tradeRepo, ruleRepo, tradeMapper);
const tradeImageService = new TradeImageService(tradeRepo, tradeMapper, storageProvider);
const ruleService = new RuleService(ruleRepo, ruleMapper);
const tagService = new TagService(tagRepo, tradeRepo, tagMapper);
const journalService = new JournalService(journalRepo, journalMapper);
const playbookService = new PlaybookService(playbookRepo, tradeRepo, playbookMapper);
const analyticsService = new AnalyticsService(tradeRepo, journalRepo, playbookRepo);
const aiService = new AIService(tradeRepo);
const exportService = new ExportService(analyticsService, tradeRepo, exportFormatter);

// ───── Controllers (exported for routes) ─────
export const tradeController = new TradeController(tradeService, tradeImageService);
export const ruleController = new RuleController(ruleService);
export const tagController = new TagController(tagService);
export const journalController = new JournalController(journalService);
export const playbookController = new PlaybookController(playbookService);
export const analyticsController = new AnalyticsController(analyticsService);
export const aiController = new AIController(aiService);
export const exportController = new ExportController(exportService);

// Re-export storage provider for the image proxy in index.ts
export { storageProvider };
