import { Rule } from '@/types/rule';

// Import seed JSON files
import classificationTipo from './seed/classification_tipo.json';
import classTag315 from './seed/class_tag_315.json';
import dedupeScore from './seed/dedupe_score.json';
import mergePolicy from './seed/merge_policy.json';
import ivaMapDefaults from './seed/iva_map_defaults.json';
import exportPreflight from './seed/export_preflight.json';

const SEED_RULES: Rule[] = [
  classificationTipo as Rule,
  classTag315 as Rule,
  dedupeScore as Rule,
  mergePolicy as Rule,
  ivaMapDefaults as Rule,
  exportPreflight as Rule,
];

/**
 * Seeds the rules registry with default rules.
 * Idempotent: skips if rule with same id+version exists.
 * If same id with older version exists, inserts new and archives old.
 */
export async function seedRulesRegistry(db: IDBDatabase): Promise<void> {
  const transaction = db.transaction(['rules'], 'readwrite');
  const store = transaction.objectStore('rules');

  for (const seedRule of SEED_RULES) {
    try {
      // Check if rule already exists
      const existingRequest = store.get(seedRule.id);
      
      await new Promise<void>((resolve, reject) => {
        existingRequest.onsuccess = () => {
          const existing = existingRequest.result as Rule | undefined;
          
          if (existing) {
            // Rule exists - check version
            if (existing.version === seedRule.version) {
              console.log(`[Seed] Skipping ${seedRule.id}@${seedRule.version} - already exists`);
              resolve();
              return;
            }
            
            // Archive old version
            const archivedRule = { ...existing, state: 'archived' as const };
            store.put(archivedRule);
            console.log(`[Seed] Archived ${seedRule.id}@${existing.version}`);
          }
          
          // Insert new version
          const putRequest = store.put(seedRule);
          putRequest.onsuccess = () => {
            console.log(`[Seed] ✓ Seeded ${seedRule.id}@${seedRule.version}`);
            resolve();
          };
          putRequest.onerror = () => reject(new Error(`Failed to seed ${seedRule.id}`));
        };
        
        existingRequest.onerror = () => reject(new Error(`Failed to check ${seedRule.id}`));
      });
    } catch (error) {
      console.error(`[Seed] Error seeding ${seedRule.id}:`, error);
    }
  }
  
  console.log('[Seed] ✓ Rules registry seeding complete');
}
