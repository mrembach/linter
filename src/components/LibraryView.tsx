/** @jsx h */
import { h, Fragment } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import { 
  Text, 
  Stack, 
  VerticalSpace, 
  DropdownOption,
  Dropdown,
  Bold,
  Button,
  LoadingIndicator,
  MiddleAlign,
  IconWarning16,
  Muted
} from '@create-figma-plugin/ui';
import { emit, on } from '@create-figma-plugin/utilities';

// Define interface for library data
interface Library {
  id: string;
  name: string;
  type: 'document' | 'team';
  enabled: boolean;
  firstCollectionKey?: string; // Added to help identify libraries
  collectionCount?: number; // Added to show how many variable collections
  firstCollectionName?: string; // Added to show the name of the first collection
  collectionNames?: string[]; // Added to store all collection names
  displayName?: string; // Added for customizing display in dropdown
}

export function LibraryView() {
  const [libraries, setLibraries] = useState<Library[]>([]);
  const [selectedLibraryId, setSelectedLibraryId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Find libraries with duplicate names for special handling
  const nameCount = libraries.reduce((acc, lib) => {
    acc[lib.name] = (acc[lib.name] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  // Format libraries for dropdown with extra identifiers for duplicates
  const libraryOptions: Array<DropdownOption> = libraries.map(lib => {
    // For libraries with duplicate names, add part of ID as suffix for identification
    const hasDuplicateName = nameCount[lib.name] > 1;
    let displayText = lib.name;
    
    if (hasDuplicateName && lib.id) {
      // Only add the ID suffix for duplicate names
      const shortId = lib.id.substring(0, 6);
      displayText = `${displayText} - ${shortId}`;
    }
    
    if (!lib.enabled) {
      displayText += ' (disabled)';
    }
    
    return {
      value: lib.id,
      text: displayText
    };
  });
  
  // Request libraries on component mount
  useEffect(() => {
    const handleLibrariesUpdate = (newLibraries: Library[]) => {
      setLibraries(newLibraries);
      
      // Set initial selection to POS Design System if available
      if (newLibraries.length > 0) {
        // Look for POS Design System
        const posDesignSystem = newLibraries.find(lib => 
          lib.name.includes('POS Design System') && lib.enabled
        );
        
        if (posDesignSystem) {
          // Default to POS Design System if found
          setSelectedLibraryId(posDesignSystem.id);
        } else {
          // Don't default to any selection if POS Design System not found
          setSelectedLibraryId(null);
        }
      }
      
      setIsLoading(false);
    };
    
    // Listen for libraries update
    const removeListener = on('UPDATE_LIBRARIES', handleLibrariesUpdate);
    
    // Request libraries
    setIsLoading(true);
    emit('GET_LIBRARIES');
    
    // Cleanup listener on unmount
    return () => {
      removeListener();
    };
  }, []);
  
  // Handle library selection change
  const handleLibraryChange = (event: h.JSX.TargetedEvent<HTMLInputElement>) => {
    const newValue = event.currentTarget.value;
    setSelectedLibraryId(newValue);
  };
  
  // Count team libraries
  const teamLibraries = libraries.filter(lib => lib.type === 'team');
  
  return (
    <Stack space="medium" style={{ 
      width: '100%', 
      paddingTop: 'var(--space-small)',
      paddingLeft: 'var(--space-medium)',
      paddingRight: 'var(--space-medium)'
    }}>
      {isLoading ? (
        <MiddleAlign>
          <LoadingIndicator />
          <VerticalSpace space="small" />
          <Text>Loading libraries...</Text>
        </MiddleAlign>
      ) : libraries.length > 0 ? (
        <Fragment>
          <div>
            <Text>
              <Bold>Select a Library</Bold>
            </Text>
            <VerticalSpace space="extraSmall" />
            <div>
              <Dropdown
                onChange={handleLibraryChange}
                options={libraryOptions}
                value={selectedLibraryId || null}
                placeholder="Select a library"
              />
            </div>
            
            {teamLibraries.length === 0 && (
              <div style={{ 
                marginTop: 'var(--space-small)', 
                padding: 'var(--space-extra-small) var(--space-small)',
                backgroundColor: 'var(--figma-color-bg-warning)',
                borderRadius: 'var(--border-radius-2)'
              }}>
                <Text>
                  <Muted>Note: Due to Figma API limitations, only libraries that contain variables will appear in this dropdown. Enable libraries via Figma's Assets panel.</Muted>
                </Text>
              </div>
            )}
          </div>
          
          {/* Library Components section removed as requested */}
        </Fragment>
      ) : (
        <MiddleAlign>
          <Stack space="small">
            <Text>No libraries available</Text>
            <VerticalSpace space="medium" />
            <Text align="center">
              <Muted>Due to Figma API limitations, only libraries containing variables will be automatically detected. Enable libraries via Figma's Assets panel.</Muted>
            </Text>
          </Stack>
        </MiddleAlign>
      )}
    </Stack>
  );
} 