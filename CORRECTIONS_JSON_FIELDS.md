# Corrections pour les champs JSON stockés comme String dans SQLite

## Problème
Dans SQLite, les types JSON de Prisma ne sont pas supportés nativement, donc les champs comme `Json` et `String[]` doivent être stockés comme `String`. Cela signifie que :
- En **écriture** : il faut convertir les objets/tableaux en JSON strings avec `JSON.stringify()`
- En **lecture** : il faut parser les JSON strings en objets/tableaux avec `JSON.parse()`

## Champs concernés

### Table Quiz
- `tags` : `String[]` → stocké comme `String` (JSON stringifié)
- `jsonContent` : `Json` → stocké comme `String` (JSON stringifié)

### Table AnswerEvent
- `selectedOptions` : `String[]` → stocké comme `String` (JSON stringifié)
- `tags` : `String[]` → stocké comme `String` (JSON stringifié)

### Table Backup
- `data` : `Json` → stocké comme `String` (JSON stringifié)

## Corrections apportées

### 1. quiz.controller.ts
- **getQuizzes** : Filtre par tag en mémoire après parsing des tags (car impossible de filtrer directement dans la base)
- **getQuizById** : Parsing de `tags` et `jsonContent` avant de retourner
- **createQuiz** : Stringification de `tags` et `jsonContent` en écriture, parsing en lecture
- **updateQuiz** : Stringification de `tags` et `jsonContent` en écriture, parsing en lecture
- **duplicateQuiz** : Parsing de `tags` et `jsonContent` du quiz original, stringification en écriture, parsing en lecture
- **importQuiz** : Stringification de `tags` et `jsonContent` en écriture, parsing en lecture

### 2. answer.controller.ts
- **recordAnswer** : Stringification de `selectedOptions` et `tags` en écriture, parsing en lecture
- **recordSessionAnswers** : Stringification de `selectedOptions` et `tags` en écriture, parsing en lecture

### 3. stats.controller.ts
- **toExtendedAnswerEvent** : Parsing de `tags` lors de la conversion

### 4. today.controller.ts
- **getTodayRecommendation** : Parsing de `tags` et `jsonContent` pour les quiz, parsing de `tags` pour les answerEvents
- **getReviewQueue** : Parsing de `tags` et `jsonContent` pour les quiz, parsing de `tags` pour les answerEvents

### 5. backup.controller.ts
- **createBackup** : Parsing de `tags` et `jsonContent` pour les quiz, parsing de `selectedOptions` et `tags` pour les answerEvents avant sauvegarde
- **restoreBackup** : Stringification de `tags` et `jsonContent` pour les quiz, stringification de `selectedOptions` et `tags` pour les answerEvents avant création
- **downloadBackup** : Parsing de `data` si c'est une string

## Pattern de parsing utilisé

```typescript
// Pour un champ qui peut être string ou déjà parsé
const parsedValue = typeof field === 'string' ? JSON.parse(field) : field;

// Pour un champ qui doit être un tableau
const parsedArray = typeof field === 'string' ? JSON.parse(field) : (field || []);

// Pour stringifier en écriture
const stringValue = JSON.stringify(value || []);
```

## Notes
- Les fonctions utilitaires `parseJsonField` et `stringifyJsonField` ont été définies mais peu utilisées, préférant un parsing inline pour plus de clarté
- Le filtre par tag dans `getQuizzes` doit se faire en mémoire car SQLite ne peut pas filtrer dans des JSON strings
- Toutes les réponses API retournent maintenant les champs dans leur format original (tableaux/objets) et non comme strings JSON
