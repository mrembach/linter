/** @jsx h */
import { h, Fragment } from 'preact';
import { useEffect, useState, useCallback, useRef } from 'preact/hooks';
import { 
  Text, 
  Stack, 
  VerticalSpace, 
  DropdownOption,
  Dropdown,
  Bold,
  TextboxMultiline,
  LoadingIndicator,
  MiddleAlign,
  Muted,
  IconInfo16,
  Toggle,
  Button,
  Divider,
  IconLibrary24,
  Link,
  IconLockLocked16
} from '@create-figma-plugin/ui';
import { emit, on } from '@create-figma-plugin/utilities';
import { useLibrary } from '../contexts/LibraryContext';

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

// Default exception values
const DEFAULT_EXCEPTIONS = 'Retail UI/border-banner, Retail UI/border-select-dark, Retail UI/border-select-light, Retail UI/border-selected, Retail UI/border-selected-pressed, Retail UI/border-search-dark, Retail UI/border-search-light, Retail UI/button-navutility-dark, Retail UI/button-navutility-light';

const Loader = () => {
  return <LoadingIndicator />;
};

// Custom styled Toggle component wrapper to scale it down
const ScaledToggle = ({onChange, value, children}: {onChange: (event: h.JSX.TargetedEvent<HTMLInputElement>) => void, value: boolean, children: any}) => {
  return (
    <div style={{ transform: 'scale(0.8)' }}>
      <Toggle onChange={onChange} value={value}>
        {children}
      </Toggle>
    </div>
  );
};

export function SettingsView() {
  const [libraries, setLibraries] = useState<Library[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { selectedLibraryId, setSelectedLibraryId } = useLibrary();
  const [exceptions, setExceptions] = useState<string>(DEFAULT_EXCEPTIONS);
  const [showLibraryTooltip, setShowLibraryTooltip] = useState(false);
  const [showExceptionsTooltip, setShowExceptionsTooltip] = useState(false);
  const [excludeLockedLayers, setExcludeLockedLayers] = useState<boolean>(true);
  const [excludeHiddenLayers, setExcludeHiddenLayers] = useState<boolean>(true);
  // Add state for issue type check toggles
  const [checkFills, setCheckFills] = useState<boolean>(true);
  const [checkStrokes, setCheckStrokes] = useState<boolean>(true);
  const [checkTexts, setCheckTexts] = useState<boolean>(true);
  const [checkRadius, setCheckRadius] = useState<boolean>(true);
  const [checkGaps, setCheckGaps] = useState<boolean>(true);
  const [checkPadding, setCheckPadding] = useState<boolean>(true);
  const [checkWrongLibrary, setCheckWrongLibrary] = useState<boolean>(true);
  const [showIssueTypeTooltip, setShowIssueTypeTooltip] = useState(false);
  const [showReportTooltip, setShowReportTooltip] = useState(false);
  
  // Add state for report management
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [reportDownloadUrl, setReportDownloadUrl] = useState<string | null>(null);
  const [reportFileName, setReportFileName] = useState<string>('');
  const downloadLinkRef = useRef<HTMLAnchorElement>(null);
  
  const [isSettingsUpdating, setIsSettingsUpdating] = useState(false);
  
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
      if (newLibraries.length > 0 && selectedLibraryId === null) {
        // Look for POS Design System
        const posDesignSystem = newLibraries.find(lib => 
          lib.name.includes('POS Design System') && lib.enabled
        );
        
        if (posDesignSystem) {
          // Default to POS Design System if found
          setSelectedLibraryId(posDesignSystem.id);
          // Save to plugin state
          emit('SAVE_SELECTED_LIBRARY', posDesignSystem.id);
        }
      }
      
      setIsLoading(false);
    };
    
    // Handle exceptions load from storage
    const handleExceptionsLoaded = (savedExceptions: string) => {
      if (savedExceptions) {
        setExceptions(savedExceptions);
      }
    };
    
    // Handle exclude locked layers setting loaded from storage
    const handleExcludeLockedLoaded = (excludeLocked: boolean) => {
      setExcludeLockedLayers(excludeLocked);
    };
    
    // Handle exclude hidden layers setting loaded from storage
    const handleExcludeHiddenLoaded = (excludeHidden: boolean) => {
      setExcludeHiddenLayers(excludeHidden);
    };
    
    // Handle issue type check settings loaded from storage
    const handleIssueTypeChecksLoaded = (settings: {
      fill: boolean,
      stroke: boolean,
      text: boolean,
      radius: boolean,
      gap: boolean,
      padding: boolean
    }) => {
      setCheckFills(settings.fill);
      setCheckStrokes(settings.stroke);
      setCheckTexts(settings.text);
      setCheckRadius(settings.radius);
      setCheckGaps(settings.gap);
      setCheckPadding(settings.padding);
    };
    
    // Handle report generated
    const handleReportGenerated = (reportData: { content: string, timestamp: string }) => {
      setIsGeneratingReport(false);
      
      // Create downloadable report
      const blob = new Blob([reportData.content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      setReportDownloadUrl(url);
      
      // Set filename with timestamp for uniqueness
      const fileName = `figma-lint-report-${reportData.timestamp}.txt`;
      setReportFileName(fileName);
      
      // Trigger download automatically
      setTimeout(() => {
        if (downloadLinkRef.current) {
          downloadLinkRef.current.click();
        }
      }, 100);
    };

    // Handle report error
    const handleReportError = (error: string) => {
      setIsGeneratingReport(false);
      console.error('[UI] Report generation error:', error);
      // You might want to show an error message to the user here
    };
    
    // Listen for libraries update
    const removeLibraryListener = on('UPDATE_LIBRARIES', handleLibrariesUpdate);
    
    // Listen for exceptions loaded
    const removeExceptionsListener = on('EXCEPTIONS_LOADED', handleExceptionsLoaded);
    
    // Listen for exclude locked layers setting loaded
    const removeExcludeLockedListener = on('EXCLUDE_LOCKED_LOADED', handleExcludeLockedLoaded);
    
    // Listen for exclude hidden layers setting loaded
    const removeExcludeHiddenListener = on('EXCLUDE_HIDDEN_LOADED', handleExcludeHiddenLoaded);
    
    // Listen for issue type check settings loaded
    const removeIssueTypeChecksListener = on('ISSUE_TYPE_CHECKS_LOADED', handleIssueTypeChecksLoaded);
    
    // Listen for report responses
    const removeReportGeneratedListener = on('REPORT_GENERATED', handleReportGenerated);
    const removeReportErrorListener = on('REPORT_ERROR', handleReportError);
    
    // Listen for settings updates
    const removeSettingsUpdateListener = on('SETTINGS_UPDATING', () => {
      setIsSettingsUpdating(true);
    });

    // Listen for issues updates (which means settings update is complete)
    const removeIssuesUpdateListener = on('UPDATE_ISSUES', () => {
      setIsSettingsUpdating(false);
    });
    
    // Request libraries
    setIsLoading(true);
    emit('GET_LIBRARIES');
    
    // Request exceptions
    emit('GET_EXCEPTIONS');
    
    // Request exclude locked layers setting
    emit('GET_EXCLUDE_LOCKED');
    
    // Request exclude hidden layers setting
    emit('GET_EXCLUDE_HIDDEN');
    
    // Request issue type check settings
    emit('GET_ISSUE_TYPE_CHECKS');
    
    // Cleanup listener on unmount
    return () => {
      removeLibraryListener();
      removeExceptionsListener();
      removeExcludeLockedListener();
      removeExcludeHiddenListener();
      removeIssueTypeChecksListener();
      removeReportGeneratedListener();
      removeReportErrorListener();
      removeSettingsUpdateListener();
      removeIssuesUpdateListener();
      
      // Cleanup any blob URLs
      if (reportDownloadUrl) {
        URL.revokeObjectURL(reportDownloadUrl);
      }
    };
  }, [selectedLibraryId, setSelectedLibraryId, reportDownloadUrl]);
  
  // Handle library selection change
  const handleLibraryChange = (event: h.JSX.TargetedEvent<HTMLInputElement>) => {
    const newValue = event.currentTarget.value;
    setSelectedLibraryId(newValue);
    // Save to plugin state
    emit('SAVE_SELECTED_LIBRARY', newValue);
  };
  
  // Handle exceptions change
  const handleExceptionsChange = (event: h.JSX.TargetedEvent<HTMLTextAreaElement>) => {
    const newValue = event.currentTarget.value;
    setExceptions(newValue);
    
    // Process the exceptions before sending to ensure consistency
    const processedExceptions = newValue
      .split(',')
      .map(item => item.trim())
      .filter(item => item.length > 0)
      .join(', ');
    
    // Send the processed value to ensure consistency
    emit('UPDATE_EXCEPTIONS', processedExceptions);
    
    console.log('[UI] Updated exceptions', { 
      rawValue: newValue, 
      processedValue: processedExceptions 
    });
  };
  
  // Handle exclude locked layers toggle change
  const handleExcludeLockedChange = (event: h.JSX.TargetedEvent<HTMLInputElement>) => {
    const newValue = event.currentTarget.checked;
    setExcludeLockedLayers(newValue);
    setIsSettingsUpdating(true); // Set loading state immediately
    // Save to plugin state
    emit('UPDATE_EXCLUDE_LOCKED', newValue);
    console.log('[UI] Updated exclude locked layers setting', { value: newValue });
  };
  
  // Handle exclude hidden layers toggle change
  const handleExcludeHiddenChange = (event: h.JSX.TargetedEvent<HTMLInputElement>) => {
    const newValue = event.currentTarget.checked;
    setExcludeHiddenLayers(newValue);
    setIsSettingsUpdating(true); // Set loading state immediately
    // Save to plugin state
    emit('UPDATE_EXCLUDE_HIDDEN', newValue);
    console.log('[UI] Updated exclude hidden layers setting', { value: newValue });
  };
  
  // Handle issue type check toggle changes
  const handleIssueTypeCheckChange = (type: string, event: h.JSX.TargetedEvent<HTMLInputElement>) => {
    const newValue = event.currentTarget.checked;
    
    // Update local state based on type
    switch(type) {
      case 'fill':
        setCheckFills(newValue);
        break;
      case 'stroke':
        setCheckStrokes(newValue);
        break;
      case 'text':
        setCheckTexts(newValue);
        break;
      case 'radius':
        setCheckRadius(newValue);
        break;
      case 'gap':
        setCheckGaps(newValue);
        break;
      case 'padding':
        setCheckPadding(newValue);
        break;
      case 'wrongLibrary':
        setCheckWrongLibrary(newValue);
        break;
    }
    
    setIsSettingsUpdating(true); // Set loading state immediately
    // Save to plugin state with only the changed setting
    const updateObj: Record<string, boolean> = {};
    updateObj[type] = newValue;
    emit('UPDATE_ISSUE_TYPE_CHECKS', updateObj);
    console.log('[UI] Updated issue type check setting', { type, value: newValue });
  };
  
  // Count team libraries
  const teamLibraries = libraries.filter(lib => lib.type === 'team');
  
  // Handle report generation
  const handleGenerateReport = useCallback(() => {
    setIsGeneratingReport(true);
    
    // If we have an existing blob URL, revoke it to prevent memory leaks
    if (reportDownloadUrl) {
      URL.revokeObjectURL(reportDownloadUrl);
      setReportDownloadUrl(null);
    }
    
    // Request report generation from the plugin
    emit('GENERATE_REPORT');
  }, [reportDownloadUrl]);
  
  return (
    <Stack space="medium" style={{ 
      width: '100%',
      paddingTop: 'var(--space-small)',
      paddingLeft: 'var(--space-medium)',
      paddingRight: 'var(--space-medium)',
      paddingBottom: 'var(--space-medium)',
      position: 'relative'
    }}>
      {isSettingsUpdating && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'var(--figma-color-bg)',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          height: '100%',
          opacity: 0,
          visibility: 'hidden',
          transform: 'translateZ(0)',
          backdropFilter: 'blur(2px)',
          transition: 'opacity 0.3s ease-in-out, visibility 0.3s ease-in-out',
          ...(!isSettingsUpdating ? {} : {
            opacity: 0.95,
            visibility: 'visible'
          })
        }}>
          <Text>Updating settings and scanning for issues...</Text>
        </div>
      )}
      {isLoading ? (
        <MiddleAlign>
          <LoadingIndicator />
          <VerticalSpace space="small" />
          <Text>Loading libraries...</Text>
        </MiddleAlign>
      ) : libraries.length > 0 ? (
        <Fragment>
          <VerticalSpace space="small" />
          
          {/* Layer Filtering Section */}
          <div>
            <Text>
              <Bold>Layer Filtering</Bold>
            </Text>
            <VerticalSpace space="small" />
            
            {/* Exclude Locked Layers Toggle */}
            <div style={{ 
              display: 'flex', 
              flexDirection: 'row', 
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '4px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <Text>Exclude locked layers</Text>
              </div>
              <ScaledToggle onChange={handleExcludeLockedChange} value={excludeLockedLayers}>
                {''}
              </ScaledToggle>
            </div>
            
            {/* Exclude Hidden Layers Toggle */}
            <div style={{ 
              display: 'flex', 
              flexDirection: 'row', 
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <Text>Exclude hidden layers</Text>
              </div>
              <ScaledToggle onChange={handleExcludeHiddenChange} value={excludeHiddenLayers}>
                {''}
              </ScaledToggle>
            </div>
          </div>
          
          {/* Add more vertical space between sections */}
          <VerticalSpace space="extraLarge" />
          
          {/* Issue Type Checks Section */}
          <div>
            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <Text>
                  <Bold>Issue Types</Bold>
                </Text>
                <div 
                  style={{ 
                    marginLeft: '4px', 
                    position: 'relative',
                    display: 'inline-flex',
                  }}
                  onMouseEnter={() => setShowIssueTypeTooltip(true)}
                  onMouseLeave={() => setShowIssueTypeTooltip(false)}
                >
                  <div style={{ 
                    width: '11px',
                    height: '11px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--figma-color-bg-tertiary)',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    fontSize: '8px',
                    fontWeight: 'bold',
                    color: 'var(--figma-color-text-tertiary)',
                  }}>
                    i
                  </div>
                  {showIssueTypeTooltip && (
                    <div 
                      style={{
                        position: 'absolute',
                        bottom: '100%',
                        left: '64px',
                        transform: 'translateX(-50%)',
                        marginBottom: '8px',
                        width: '240px',
                        padding: '6px 8px',
                        backgroundColor: 'var(--figma-color-bg)',
                        border: '1px solid var(--figma-color-border)',
                        borderRadius: '2px',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.15)',
                        zIndex: 9999,
                        fontSize: '11px',
                        color: 'var(--figma-color-text)',
                      }}
                    >
                      Control which types of issues are checked during linting.
                    </div>
                  )}
                </div>
              </div>
            </div>
            <VerticalSpace space="small" />
            
            {/* Color Fill Toggle */}
            <div style={{ 
              display: 'flex', 
              flexDirection: 'row', 
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '4px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <Text>Color Fill</Text>
              </div>
              <ScaledToggle onChange={(e) => handleIssueTypeCheckChange('fill', e)} value={checkFills}>
                {''}
              </ScaledToggle>
            </div>
            
            {/* Color Stroke Toggle */}
            <div style={{ 
              display: 'flex', 
              flexDirection: 'row', 
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '4px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <Text>Color Stroke</Text>
              </div>
              <ScaledToggle onChange={(e) => handleIssueTypeCheckChange('stroke', e)} value={checkStrokes}>
                {''}
              </ScaledToggle>
            </div>
            
            {/* Text Style Toggle */}
            <div style={{ 
              display: 'flex', 
              flexDirection: 'row', 
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '4px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <Text>Text Style</Text>
              </div>
              <ScaledToggle onChange={(e) => handleIssueTypeCheckChange('text', e)} value={checkTexts}>
                {''}
              </ScaledToggle>
            </div>
            
            {/* Radius Toggle */}
            <div style={{ 
              display: 'flex', 
              flexDirection: 'row', 
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '4px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <Text>Radius</Text>
              </div>
              <ScaledToggle onChange={(e) => handleIssueTypeCheckChange('radius', e)} value={checkRadius}>
                {''}
              </ScaledToggle>
            </div>
            
            {/* Gap Toggle */}
            <div style={{ 
              display: 'flex', 
              flexDirection: 'row', 
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '4px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <Text>Gap</Text>
              </div>
              <ScaledToggle onChange={(e) => handleIssueTypeCheckChange('gap', e)} value={checkGaps}>
                {''}
              </ScaledToggle>
            </div>
            
            {/* Padding Toggle */}
            <div style={{ 
              display: 'flex', 
              flexDirection: 'row', 
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '4px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <Text>Padding</Text>
              </div>
              <ScaledToggle onChange={(e) => handleIssueTypeCheckChange('padding', e)} value={checkPadding}>
                {''}
              </ScaledToggle>
            </div>
          </div>
          
          {/* Add more vertical space between sections */}
          <VerticalSpace space="extraLarge" />
          
          {/* Library Linter Section */}
          <div>
            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <Text>
                  <Bold>Library exception</Bold>
                </Text>
                <div 
                  style={{ 
                    marginLeft: '4px', 
                    position: 'relative',
                    display: 'inline-flex',
                  }}
                  onMouseEnter={() => setShowLibraryTooltip(true)}
                  onMouseLeave={() => setShowLibraryTooltip(false)}
                >
                  <div style={{ 
                    width: '11px',
                    height: '11px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--figma-color-bg-tertiary)',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    fontSize: '8px',
                    fontWeight: 'bold',
                    color: 'var(--figma-color-text-tertiary)',
                  }}>
                    i
                  </div>
                  {showLibraryTooltip && (
                    <div 
                      style={{
                        position: 'absolute',
                        bottom: '100%',
                        left: '64px',
                        transform: 'translateX(-50%)',
                        marginBottom: '8px',
                        width: '240px',
                        padding: '6px 8px',
                        backgroundColor: 'var(--figma-color-bg)',
                        border: '1px solid var(--figma-color-border)',
                        borderRadius: '2px',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.15)',
                        zIndex: 9999,
                        fontSize: '11px',
                        color: 'var(--figma-color-text)',
                      }}
                    >
                      Variables from this library will be considered valid. Any variables found from other libraries will be flagged as issues. Library selection feature coming soon.
                    </div>
                  )}
                </div>
              </div>
            </div>
            <VerticalSpace space="small" />
            <div>
              <div style={{ 
                position: 'relative',
                width: '100%'
              }}>
                <Dropdown
                  disabled={true}
                  onChange={handleLibraryChange}
                  options={libraryOptions}
                  value={selectedLibraryId || ''}
                  placeholder="POS Design System"
                  style={{
                    borderColor: 'var(--figma-color-border)',
                    boxShadow: '0 0 0 1px var(--figma-color-border)',
                    borderRadius: 'var(--border-radius-2)',
                    color: 'var(--figma-color-text)',
                    backgroundColor: 'transparent',
                    cursor: 'not-allowed',
                    paddingRight: '32px'
                  }}
                />
                <div style={{
                  position: 'absolute',
                  right: '8px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  pointerEvents: 'none',
                  opacity: 0.8
                }}>
                  <IconLockLocked16 />
                </div>
              </div>
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
          
          {/* Add more vertical space between sections */}
          <VerticalSpace space="extraLarge" />
          
          {/* Exceptions Section */}
          <div>
            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <Text>
                  <Bold>Style exceptions</Bold>
                </Text>
                <div 
                  style={{ 
                    marginLeft: '4px', 
                    position: 'relative',
                    display: 'inline-flex',
                  }}
                  onMouseEnter={() => setShowExceptionsTooltip(true)}
                  onMouseLeave={() => setShowExceptionsTooltip(false)}
                >
                  <div style={{ 
                    width: '11px',
                    height: '11px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--figma-color-bg-tertiary)',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    fontSize: '8px',
                    fontWeight: 'bold',
                    color: 'var(--figma-color-text-tertiary)',
                  }}>
                    i
                  </div>
                  {showExceptionsTooltip && (
                    <div 
                      style={{
                        position: 'absolute',
                        bottom: '100%',
                        left: '64px',
                        transform: 'translateX(-50%)',
                        marginBottom: '8px',
                        width: '240px',
                        padding: '6px 8px',
                        backgroundColor: 'var(--figma-color-bg)',
                        border: '1px solid var(--figma-color-border)',
                        borderRadius: '2px',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.15)',
                        zIndex: 9999,
                        fontSize: '11px',
                        color: 'var(--figma-color-text)',
                      }}
                    >
                      Enter style names separated by commas. Styles with these names will not be flagged. Use a pattern ending with * to match all styles with the same prefix.
                    </div>
                  )}
                </div>
              </div>
            </div>
            <VerticalSpace space="small" />
            <TextboxMultiline
              placeholder="Enter style names to exclude, separated by commas"
              value={exceptions}
              onInput={handleExceptionsChange}
              rows={4}
              style={{ 
                width: '100%', 
                resize: 'vertical',
                minHeight: '100px',
                borderColor: 'var(--figma-color-border)',
                boxShadow: '0 0 0 1px var(--figma-color-border)',
                borderRadius: 'var(--border-radius-2)'
              }}
            />
          </div>
          
          {/* Report Section */}
          <Divider />
          <VerticalSpace space="extraLarge" />
          
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center' 
          }}>
            <Text>
              <Link href="#" onClick={handleGenerateReport}>
                Debug Report
              </Link>
            </Text>
          </div>
          
          {/* Hidden download link that gets triggered programmatically */}
          {reportDownloadUrl && (
            <a 
              ref={downloadLinkRef}
              href={reportDownloadUrl} 
              download={reportFileName} 
              style={{ display: 'none' }}
            >
              Download Report
            </a>
          )}
          
          <VerticalSpace space="large" />
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