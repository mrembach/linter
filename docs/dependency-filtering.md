# Filtering Dependency Libraries in Figma Linter

## Overview
This modification filters out libraries that are likely being used only as dependencies (like primitive token libraries) from appearing in the library dropdown. It also simplifies the dropdown display by removing collection names.

## Implementation Details

1. **Detection Logic**: 
   - Libraries are identified as dependencies based on their collection names
   - Any collection containing "primitive" or containing "token" but not "semantic" is flagged
   - These libraries are filtered out before being displayed in the dropdown

2. **Simplified Dropdown Display**:
   - Collection names are no longer shown in the dropdown
   - Only library names are displayed
   - Libraries with duplicate names have a short ID suffix for identification (e.g., "POS Design System - b9f...")
   - This simplification was possible because we're filtering out dependency libraries

3. **Code Location**: 
   - Dependency filtering: Modified in `src/main.ts` in the `getAvailableLibraries()` function
   - Dropdown simplification: Modified in `src/components/LibraryView.tsx`

4. **Key Code Snippets**:
```typescript
// Dependency filtering in main.ts
// Add to LibraryInfo interface
isDependency?: boolean;  // Flags libraries that are likely just dependencies

// Logic to identify dependencies
if (library.firstCollectionName.toLowerCase().includes('primitive') ||
    (library.firstCollectionName.toLowerCase().includes('token') && 
     !library.firstCollectionName.toLowerCase().includes('semantic'))) {
  library.isDependency = true;
}

// Filter out dependencies when creating the libraries list
libraryMap.forEach(library => {
  if (!library.isDependency) {
    teamLibraries.push(library);
  }
});

// Simplified dropdown display in LibraryView.tsx
const libraryOptions: Array<DropdownOption> = libraries.map(lib => {
  const hasDuplicateName = nameCount[lib.name] > 1;
  let displayText = lib.name;
  
  if (hasDuplicateName && lib.id) {
    // Only add the ID suffix for duplicate names
    const shortId = lib.id.substring(0, 6);
    displayText = `${displayText} - ${shortId}`;
  }
  
  return {
    value: lib.id,
    text: displayText
  };
});
```

## Customization

To modify how libraries are filtered:

1. **Change Detection Logic**: Adjust the conditions in the `if` statement that sets `isDependency` to true
2. **Disable Filtering**: Comment out the filtering logic and use `libraryMap.forEach(library => teamLibraries.push(library));` instead
3. **Add UI Toggle**: Consider adding a checkbox in the UI to let users show/hide dependency libraries
4. **Restore Collection Names**: If you need to see collection names in the dropdown again, modify the `libraryOptions` formatting in `LibraryView.tsx`

## Debugging

The plugin logs when libraries are flagged as dependencies with:
```typescript
log('Flagged library as dependency', { 
  name: library.name, 
  collection: library.firstCollectionName 
});
```

Check console logs to verify which libraries are being filtered out. 