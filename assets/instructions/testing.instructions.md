---
description: "Use when writing, reviewing, or fixing tests in the mcp-inspector-openrouter project. Covers: Vitest setup, happy-dom environment, fake-indexeddb, Chrome API stubs, vi.mock patterns, test file organization, naming conventions, and anti-patterns specific to this repo."
---

# Testing Guidelines — mcp-inspector-openrouter

## 1. Stack di Test

| Tool | Ruolo |
|---|---|
| **Vitest** | Test runner + assertion library |
| **happy-dom** | DOM environment (no jsdom) |
| **fake-indexeddb** | In-memory IndexedDB per adapter tests |
| **vi.mock / vi.stubGlobal** | Stubbing di Chrome API e moduli |

## 2. Imports Standard

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
// Aggiungi afterEach/afterAll solo se usati — import minimali
```

## 3. Chrome API Stub (obbligatorio per ogni file che usa chrome.*)

```typescript
vi.stubGlobal('chrome', {
  runtime: {
    id: 'test',
    onMessage: { addListener: vi.fn() },
    sendMessage: vi.fn(),
  },
  storage: {
    local: { get: vi.fn(), set: vi.fn() },
    sync: { get: vi.fn(), set: vi.fn() },
  },
  tabs: { query: vi.fn(), sendMessage: vi.fn() },
});
```

- Posiziona `vi.stubGlobal` **prima** degli import del modulo sotto test.
- Stub solo le property che il modulo usa effettivamente — no stub "full fake chrome".

## 4. vi.mock Pattern

```typescript
// ── Mocks ── (sezione dedicata, prima degli import del soggetto)
vi.mock('../chat-ui', () => ({
  clearChat: vi.fn(),
  appendBubble: vi.fn(),
}));

// Poi importa il modulo sotto test
import { SubjectUnderTest } from '../subject';
```

- Usa il commento `// ── Mocks ──` come intestazione della sezione mock.
- Usa `// ── Helpers ──` per factory functions e utilities di test.

## 5. Struttura Test File

```typescript
// 1. Import Vitest
import { describe, it, expect, beforeEach, vi } from 'vitest';

// 2. Mocks (vi.mock, vi.stubGlobal) — PRIMA degli import del SUT

// 3. Import del soggetto
import { MyAdapter } from '../my-adapter';

// ── Helpers ──
function createMock<T>(): T { ... }

// ── Test suite ──
describe('MyAdapter', () => {
  let sut: MyAdapter;

  beforeEach(() => {
    sut = new MyAdapter();
    document.body.innerHTML = '';
  });

  describe('metodo specifico', () => {
    it('fa X quando Y', () => {
      // Arrange
      // Act
      // Assert
    });
  });
});
```

## 6. Regole Fondamentali

- **No `it.only` / `describe.only`** — mai in commit: blocca suite intere.
- **No `it.skip` senza TODO** — `it.skip('TODO: #issue-number ...')`.
- **Un file di test per adapter/scanner/executor** — no file omnibus.
- **No `console.log` nei test** — usa `vi.spyOn(console, 'warn')` se devi verificare log.
- **`beforeEach` resetta stato** — mai dipendenza tra test nello stesso file.
- **`document.body.innerHTML = ''`** in `beforeEach` per test che manipolano il DOM.

## 7. Test per Adapter (Hexagonal)

- Testa il **comportamento del port contract**, non l'implementazione interna.
- Usa factory helper `createMock<IPortName>()` con `vi.fn()` per moccare dipendenze.
- Per `IndexedDBToolCacheAdapter`: usa `fake-indexeddb` importato nel `beforeEach`.
- Testa le pure functions separatamente dalle classi.

```typescript
// ── Helpers ──
function createMockInner(): IToolExecutionPort {
  return {
    execute: vi.fn<IToolExecutionPort['execute']>().mockResolvedValue({ success: true, data: 'ok' }),
    getAvailableTools: vi.fn<IToolExecutionPort['getAvailableTools']>().mockResolvedValue([]),
    onToolsChanged: vi.fn<IToolExecutionPort['onToolsChanged']>().mockReturnValue(() => {}),
  };
}
```

## 8. Test per Scanner/Executor

- Setup DOM con `document.body.innerHTML = '<html fixture>'` in `beforeEach`.
- Testa ogni categoria di scanner nel suo file `<category>-scanner.test.ts`.
- Verifica i campi obbligatori del `CleanTool`: `name`, `description`, `inputSchema`, `securityTier`.
- Per scanner inferred: verifica che non produca falsi positivi su DOM vuoto.

## 9. Naming dei Test

- **`describe`**: nome della classe o del modulo (`'ApprovalGateAdapter'`)
- **`it`**: frase descrittiva in inglese in forma `'verbo + condizione + risultato atteso'`
  - ✅ `'returns empty array when no tools are registered'`
  - ❌ `'test1'`, `'works correctly'`

## 10. Anti-pattern da evitare

| Anti-pattern | Soluzione |
|---|---|
| `it.only` in commit | Rimuovi sempre prima del commit |
| Mock dell'intera chrome API "per sicurezza" | Stub solo le property usate |
| Test che dipendono dall'ordine di esecuzione | `beforeEach` resetta sempre lo stato |
| `setTimeout` nei test | Usa `vi.useFakeTimers()` + `vi.runAllTimers()` |
| Assertion su implementazione interna | Testa solo l'output pubblico (port contract) |
