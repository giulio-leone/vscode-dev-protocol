---
description: "Use when planning new features, starting a session, creating branches, managing milestones, orchestrating AI agents, asking user for input, or working across the full dev lifecycle. Covers: #askQuestions iterative loop, Zod JSON plan format, milestone branching, session file, runSubagent strategy, document-first approach, no-workaround policy, feedback loop."
---

# Workflow Guidelines — mcp-inspector-openrouter

## 1. Agente-Utente Interaction (NON NEGOZIABILE)

- **Interagisci SEMPRE tramite `#askQuestions`** — mai rispondere direttamente senza chiedere, tranne per azioni di lettura/ricerca pure.
- Ogni round di domande fornisce **4 opzioni**:
  - 3 opzioni concrete (dalla migliore alla meno raccomandata)
  - 1 opzione freeform sempre presente (`allowFreeformInput: true`)
  - La **migliore opzione future-proof** è marcata `recommended: true`
- Il loop continua **senza limite** finché l'utente non dichiara esplicitamente `"sono soddisfatto"`.
- Mai saltare domande o collassare più round in uno solo senza motivo.

## 2. Piano Zod JSON (obbligatorio per ogni task non-banale)

Prima di iniziare a creare/modificare file, genera un piano in formato JSON strutturato. Salvalo in `.github/plan.json` (o `plan-<feature>.json` per feature parallele):

```json
{
  "plan": {
    "PRD": "<descrizione del prodotto/feature>",
    "contesto": "<branch corrente, stack, dipendenze rilevanti>",
    "milestones": {
      "m1": {
        "id": "m1",
        "title": "<titolo milestone>",
        "priority": "critical | high | medium | low",
        "issues": {
          "m1-i1": {
            "id": "m1-i1",
            "task": "<descrizione atomica del task>",
            "priority": "critical | high | medium | low",
            "status": "not-started | in-progress | done",
            "deps": []
          }
        }
      }
    }
  }
}
```

- Gli **issue con `deps: []`** possono essere eseguiti in parallelo.
- Aggiorna `status` mano a mano che l'issue avanza.
- Ogni milestone ha un ID progressivo `m1`, `m2`, …; ogni issue `m{n}-i{k}`.

## 3. Branch per Milestone

- Per ogni milestone (o task significativo), crea un branch dedicato:
  ```bash
  git checkout -b feat/<nome-feature>
  # oppure git worktree add ../worktrees/<nome> feat/<nome-feature>
  ```
- Nomina i branch con `feat/`, `fix/`, `chore/`, `docs/` prefix.
- Se trovi cambiamenti non previsti nel working tree, **chiedi all'utente** prima di procedere.

## 4. Session File

Per ogni sessione di lavoro, crea o aggiorna `sessions-<YYYY-MM-DD>.md` nella root con:
- ID milestone e issue lavorati
- Status (✅ done / 🔄 in-progress / ⏳ not-started)
- Breve riassunto del lavoro svolto
- Data

## 5. Document-First

Prima di scrivere una riga di codice, recupera documentazione ufficiale aggiornata:

### 5.1 Context7 MCP (preferito per librerie npm)

```
# Step 1: risolvi l'ID della libreria
mcp_upstash_conte_resolve-library-id { libraryName: "lit" }
# → restituisce l'ID da usare nel passo successivo

# Step 2: recupera la documentazione
mcp_upstash_conte_query-docs { context7CompatibleLibraryId: "/lit/lit", topic: "reactive properties" }
```

Usa Context7 per: `lit`, `@modelcontextprotocol/sdk`, `zod`, `vitest`, `ai` (Vercel AI SDK), `ws`, e qualsiasi altra dipendenza in `package.json`.

### 5.2 Ricerca Web

Per API **browser native** (WebMCP `navigator.modelContext`, Chrome Extension Manifest V3, Service Workers, IndexedDB, SidePanel API):
- Cerca la specifica ufficiale o MDN prima di assumere il comportamento
- Verifica la compatibilità con Chrome 146+ (il target di questo progetto)

### 5.3 Lettura del file esistente

Prima di modificare un file:
1. Leggi l'intero file (o la sezione rilevante)
2. Identifica i pattern già usati (naming, struttura, imports)
3. Non introdurre nuovi pattern se quelli esistenti coprono il caso

### 5.4 Priorità di ricerca

```
Context7 docs > file esistente nel repo > ricerca web > assunzione
```

Mai assumere il comportamento di una libreria senza aver verificato almeno una fonte.


## 6. `runSubagent` per massima efficienza

- Usa `#runSubagent` per esplorazioni del codebase, ricerche parallele, e task autonomi isolati.
- Non eseguire ricerche sequenziali quando `runSubagent` può parallelizzarle.
- Specifica nel prompt dell'agent: thoroughness richiesta (quick/medium/thorough) e output atteso.

## 7. No Workarounds — Solo Soluzioni Definitive

- **Mai** usare workaround, patch temporanee, `// TODO: fix later`, o soluzioni "band-aid".
- Quando si incontra un problema: analizza la root cause → individua la soluzione architetturalmente ottimale → implementa in modo definitivo.
- Se la soluzione richiede un refactoring, fallo correttamente invece di aggirare il problema.

## 8. Feedback Loop per Problem Solving

Quando un problema non si risolve:
1. Analizza il problema in profondità (leggi file, esegui comandi diagnostici)
2. Individua la soluzione ottimale
3. Implementa e valida (build, lint, test)
4. Se non vi sono progressi dopo 2 tentativi → **cambia strategia**, non ripetere la stessa azione

## 9. Parallelizzazione

- Esegui operazioni indipendenti in parallelo (file creation, ricerche, letture).
- Non catena sequenzialmente tool calls che non hanno dipendenze.
- Raggruppa le edit in `multi_replace_string_in_file` quando possibile.

## 10. Principi architetturali (vedi anche `architecture.instructions.md`)

KISS · DRY · SOLID · Hexagonal Architecture (Ports & Adapters)
