# StoresAce - Testing & Acceptance Criteria

## ✅ Acceptance Criteria

### 1. Import Module
- [ ] Upload .xlsx files successfully
- [ ] Preview shows first 200 rows
- [ ] All descriptions converted to UPPERCASE
- [ ] Accents removed from all text
- [ ] GTIN validation (checksum)
- [ ] Import report generated with totals

### 2. Normalization
- [ ] Trim whitespace
- [ ] Collapse multiple spaces to single space
- [ ] Remove prohibited characters (;|^~)
- [ ] 100% of descriptions normalized after import

### 3. Classification Rules
- [ ] Rule: No família/subfamília → only COMIDA or BEBIDA (INGREDIENTE)
- [ ] Rule: Has família/subfamília → NOT COMIDA (INGREDIENTE)
- [ ] Rule 315: Default COMPRA/VENDA, or COMPRA if specified
- [ ] Idempotent: Running classification twice doesn't break data

### 4. Duplicate Detection
- [ ] Fuzzy match ≥85% similarity detected
- [ ] Side-by-side diff view
- [ ] Merge action updates "duplicado?" field correctly:
  - Original: gets all duplicate codes separated by " - "
  - Duplicate: gets original's code
- [ ] Merge history in audit trail

### 5. Export
- [ ] Excel export with 11 columns
- [ ] CSV export (UTF-8)
- [ ] JSONL export
- [ ] "duplicado?" field populated correctly
- [ ] Preview before download

### 6. Offline Functionality
- [ ] PWA installs on Safari/Chrome macOS
- [ ] Works offline after first load
- [ ] IndexedDB stores data locally
- [ ] Sync queue for pending operations
- [ ] Online/offline indicator

### 7. Keyboard Shortcuts
- [ ] ⌘I opens Import
- [ ] ⌘S saves (shows toast)
- [ ] ⌘E opens Export
- [ ] ⌘F focuses search
- [ ] ⌘K opens command palette
- [ ] ⌘Z undo (if implemented)

### 8. Audit Trail
- [ ] All critical operations logged
- [ ] Shows user, timestamp, action
- [ ] Viewable in Metrics module

## 🧪 Test Scenarios

### Scenario 1: Import & Normalize
1. Upload test file with mixed case, accents
2. Verify preview shows normalized data
3. Select loja_origem
4. Import and check report
5. Verify all descriptions are UPPERCASE without accents

### Scenario 2: Classification
1. Import items with and without família/subfamília
2. Apply classification rules
3. Verify items without família can only be COMIDA/BEBIDA
4. Verify items with família cannot be COMIDA (INGREDIENTE)
5. Run classification again - verify idempotent

### Scenario 3: Duplicate Detection
1. Import file with similar items
2. Navigate to Duplicates module
3. Verify pairs with ≥85% similarity shown
4. Merge a pair
5. Check "duplicado?" field in both items
6. Verify audit log entry

### Scenario 4: Export
1. Classify and merge some items
2. Navigate to Export
3. Select CSV format
4. Download and verify columns
5. Check "duplicado?" field contains correct codes

### Scenario 5: Offline Mode
1. Load app and import data
2. Disconnect internet
3. Verify "Offline" indicator
4. Make changes (classify, merge)
5. Reconnect - verify sync

## 📊 Performance Targets
- Import 1000 rows: <5 seconds
- Duplicate detection on 1000 items: <10 seconds
- Table rendering 10,000 rows: smooth scrolling
- Export 5000 items: <3 seconds

## 🐛 Known Limitations (MVP)
- Excel export requires external library (shows alert)
- Real XLSX parsing not implemented (uses mock preview)
- Fuzzy matching simplified (Levenshtein only)
- No real backend integration (local only)
