# FI Funds Reactivity Chain Analysis

## Purpose
This document provides a detailed, step-by-step analysis of the reactivity chain from the UI (ComponentFunds.vue) through the Pinia store (fi-store.js), focusing on how recursive updates can occur. It includes illustrative diagrams for each key `ref` and watcher, and highlights the feedback loops that may cause the "Maximum recursive updates exceeded" error.

---

## 1. High-Level Data Flow

```
[User Interaction]
     ↓
[ComponentFunds.vue]
     ↓
[Pinia Store: fi-store.js]
     ↓
[Persistence (localStorage, IndexedDB)]
```

---

## 2. Key Reactive Refs in ComponentFunds.vue

- `selectedQuarters` (from store)
- `funds` (from store)
- `holdings` (from store)
- `quarterStates` (from store)

---

## 3. Reactivity Chain for `selectedQuarters`

### UI → Store

```
[User selects/deselects quarter in <q-select>]
     ↓ (v-model="selectedQuarters")
[selectedQuarters.value] (Pinia store)
     ↓
[Watcher on selectedQuarters in store]
     ↓
[persistSelectedQuarters()]
     ↓
[localStorage]
     ↓
[loadDataForQuarters(newQuarters)]
     ↓
[funds.value, holdings.value updated]
```

### Store → UI

```
[funds.value, holdings.value updated]
     ↓
[ComponentFunds.vue re-renders table]
```

---

## 4. Recursivity/Feedback Loop Diagram

### Potential Recursive Path

```
[User changes selection in UI]
     ↓
[selectedQuarters.value changes]
     ↓
[Watcher fires: calls loadDataForQuarters]
     ↓
[loadDataForQuarters may (directly or indirectly) update selectedQuarters.value]
     ↓
[Watcher fires again]
     ↓
[...repeats until Vue recursion limit]
```

#### Example: Problematic Code Path

- If `loadDataForQuarters` (or any function it calls) sets `selectedQuarters.value` (e.g., to a default if empty), this triggers the watcher again.
- This is the classic feedback loop causing the recursion error.

---

## 5. Reactivity Chain for `quarterStates` and `funds`/`holdings`

### `quarterStates`

```
[Import/operation updates quarterStates.value]
     ↓
[Watcher on quarterStates persists to localStorage]
     ↓
[No feedback to selectedQuarters]
```

### `funds`/`holdings`

```
[loadDataForQuarters updates funds.value, holdings.value]
     ↓
[ComponentFunds.vue re-renders]
     ↓
[No feedback to selectedQuarters]
```

---

## 6. Summary Table: Reactivity and Recursion Risk

| Ref                | UI Source         | Store Watcher? | Can Trigger Recursion? |
|--------------------|------------------|----------------|------------------------|
| selectedQuarters   | q-select v-model | Yes            | YES (if mutated in data load)
| quarterStates      | Store only       | Yes            | No
| funds/holdings     | Store only       | No             | No

---

## 7. Visual Diagram: Full Feedback Loop

```
+-------------------+
| ComponentFunds UI |
+-------------------+
          |
          v
+--------------------------+
| selectedQuarters (store) |
+--------------------------+
          |
          v
+-------------------------------+
| Watcher: on selectedQuarters  |
+-------------------------------+
          |
          v
+--------------------------+
| loadDataForQuarters()    |
+--------------------------+
          |
          v
+--------------------------+
| [MAY] selectedQuarters   |
|   (if set in data load)  |
+--------------------------+
          |
         ... (loop)
```

---

## 8. Key Takeaways

- **Only `selectedQuarters` has a feedback loop risk** because its watcher can trigger a function that may update itself.
- **All other refs are safe** from recursion as they do not trigger changes to `selectedQuarters`.
- **Solution must break the feedback loop** by ensuring `loadDataForQuarters` (and any function it calls) never mutates `selectedQuarters` in a way that triggers the watcher recursively.

---

## 9. Actionable Recommendations

- Audit all code paths in `loadDataForQuarters` and related functions to ensure `selectedQuarters` is never mutated during data load.
- If a default selection is needed, set it only in explicit user actions, not in data loaders.
- Consider moving data loading to the component layer, triggered by user events, not by a watcher.

---

*This file is for debugging and architectural review. Remove after resolving the recursion issue.*
