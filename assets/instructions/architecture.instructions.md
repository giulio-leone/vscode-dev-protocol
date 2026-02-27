---
description: "Use when writing TypeScript, implementing adapters, ports, scanners, executors, Lit components, or any module in the mcp-inspector-openrouter extension. Covers: Hexagonal Architecture, Ports & Adapters, TypeScript strict, Lit 3.3 Web Components, WebMCP 3-tier tool discovery, security tiers, naming conventions."
---

# Architecture Guidelines — mcp-inspector-openrouter

## 1. Hexagonal Architecture (Ports & Adapters) — NON NEGOZIABILE

- **Ports** (`src/ports/`) definiscono interfacce pure (TypeScript interfaces) senza dipendenze esterne.
- **Adapters** (`src/adapters/`) implementano i port con tecnologia concreta (Chrome, IndexedDB, etc.).
- **Domain logic** non importa da `chrome.*`, DOM, o librerie esterne — usa i port.
- Ogni nuovo entry point (scanner, executor, service) deve avere il suo port prima dell'adapter.

```
port interface (src/ports/) → adapter implementation (src/adapters/) → consumer
```

## 2. TypeScript Strict Mode

- **`any` è vietato** — usa `unknown` + type guard, generics, o tipi precisi.
- Tutte le interfacce hanno `readonly` dove i dati non devono mutare.
- Usa discriminated unions invece di optional fields ambigui.
- `as T` casts sono ammessi solo in adapter boundary dopo validazione esplicita.
- Non aggiungere type annotations a codice non modificato.

## 3. WebMCP 3-Tier Tool Discovery

Rispetta rigorosamente la priorità di merge (higher tier wins):

| Tier | Sorgente | Priorità |
|---|---|---|
| Native | `navigator.modelContext.listTools()` | Massima |
| Declarative | `<form toolname="...">` | Media |
| Inferred | DOM scan (13 categorie) | Minima |

- Il modello è **always-augment**: tutti e 3 i tier vengono sempre eseguiti e sommati.
- Un tool nativo con lo stesso nome di uno inferred: vince il nativo.
- Mai saltare il tier nativo anche se la pagina non supporta WebMCP.

## 4. Security Tiers (ENFORCEMENT RIGOROSO)

| Tier | Livello | Esempi | Auto-Execute |
|---|---|---|---|
| 0 | Safe | page-state, media read, schema-org | ✅ Sì |
| 1 | Navigation | link click, search | ⚠️ Cautious |
| 2 | Mutation | form submit, login, buy, delete | ❌ MAI senza conferma utente |

- **Tier 2 non può mai essere `autoExecute: true`**.
- Il security tier viene assegnato durante il merge, non durante lo scan.
- Usa `SecurityTierLevel` dall'`src/utils/constants.ts` — non usare magic numbers.

## 5. Lit 3.3 Web Components

- Estendi `BaseElement` (`src/components/base-element.ts`) invece di `LitElement` direttamente.
- Usa `@property()` e `@state()` decorators — no proprietà raw.
- Shadow DOM sempre attivo — evita `createRenderRoot()` override senza motivo esplicito.
- Stili in `css` tagged template literal, mai stili inline su `render()`.
- Non usare `document.querySelector` dentro un componente — usa `this.renderRoot.querySelector`.

## 6. Naming Conventions

| Contesto | Convenzione | Esempio |
|---|---|---|
| File | kebab-case | `tool-registry.ts` |
| Classe/Interface | PascalCase | `ToolRegistry`, `IToolCachePort` |
| Funzione/metodo | camelCase | `listTools()` |
| Port interface | `I` prefix + PascalCase | `IToolExecutionPort` |
| Costanti | SCREAMING_SNAKE_CASE | `STORAGE_KEY_CONVERSATIONS` |
| CSS custom property | `--mcp-<name>` | `--mcp-surface-bg` |

## 7. Module Organization

```
src/
  ports/          ← interfacce pure (no imports from chrome/DOM)
  adapters/       ← implementazioni concrete dei port
  content/
    scanners/     ← 13 categorie, una per file
    executors/    ← 13 categorie, una per file (specchio dei scanner)
  components/     ← Lit Web Components
  sidebar/        ← logica sidebar + AI chat
  background/     ← service worker
  utils/          ← helper puri (no side effects)
  types/          ← shared TypeScript type definitions
```

- Un scanner = un file = una categoria (no god files).
- Ogni scanner ha il suo executor corrispondente con lo stesso nome.

## 8. Error Handling

- `try/catch` con fallback esplicito — non crashare mai l'extension.
- Log con prefisso `[WebMCP]` per stdout debug: `console.debug('[WebMCP] ...')`.
- Error boundary per operazioni Chrome Extension che possono fallire (tab non più presente, permission revocata).
- Non swallowre silenziosamente gli errori — logga almeno `console.warn`.

## 9. Immutabilità & Pure Functions

- Preferisci pure functions per trasformazioni dati (scanner output → merge → clean tool).
- Usa `readonly` sulle interfacce di transfer object.
- Non mutare array/oggetti ricevuti come argomenti — crea copie con spread.

## 10. Gestione Asincrona

- `async/await` su `Promise.then()` salvo casi di composizione funzionale.
- Non usare `void` fire-and-forget per operazioni critiche — `await` o cattura l'errore.
- `Promise.all` per operazioni parallele indipendenti.
