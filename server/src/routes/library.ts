import { Router, type Request, type Response } from 'express';
import { authenticate } from '../middleware/auth';
import { getLibraryAsync, saveLibraryAsync, type StoredLibrary } from '../store/libraryStore';
import { enqueueLibraryVectorIndex } from '../jobs/vectorIndexQueue';
import { ensureLibraryVectorIndexIfNeeded } from '../lib/ensureLibraryVectorIndex';

export const libraryRouter = Router();

libraryRouter.get('/library', authenticate, async (req: Request, res: Response) => {
  try {
    const accountId = req.account!.id;
    const library = await getLibraryAsync(accountId);
    void ensureLibraryVectorIndexIfNeeded(accountId, library).catch((err) => {
      console.warn('[vector-index] ensure on GET /library failed', accountId, err);
    });
    res.json(library);
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Library fetch failed' });
  }
});

libraryRouter.put('/library', authenticate, async (req: Request, res: Response) => {
  try {
    const accountId = req.account!.id;
    const body = req.body as Partial<StoredLibrary>;
    const saved = await saveLibraryAsync(accountId, {
      uploadedFiles: body.uploadedFiles ?? [],
      glossaryEntries: body.glossaryEntries ?? [],
      generatedCourses: body.generatedCourses ?? [],
    });
    enqueueLibraryVectorIndex(accountId, saved);
    res.json(saved);
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Library save failed' });
  }
});
