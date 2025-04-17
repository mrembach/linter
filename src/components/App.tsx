/** @jsx h */
import { h } from 'preact';
import { useState, useEffect, useCallback } from 'preact/hooks';
import { 
  Container, 
  VerticalSpace, 
  Text,
  Button,
  Link,
  MiddleAlign,
  IconRotate32,
  IconAdjust32,
  LoadingIndicator
} from '@create-figma-plugin/ui';
import { ErrorDisplay } from './ErrorDisplay';
import { TabBar, TabValue } from './TabBar';
import { SettingsView } from './SettingsView';
import { LintIssue } from '../types/lint';
import { on, emit } from '@create-figma-plugin/utilities';
import { LibraryProvider } from '../contexts/LibraryContext';

interface SelectionState {
  isValid: boolean;
  count: number;
}

export function App() {
  const [issues, setIssues] = useState<LintIssue[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<TabValue>('linter');
  const [selectionState, setSelectionState] = useState<SelectionState>({ isValid: false, count: 0 });
  const [selectionError, setSelectionError] = useState<{ title: string; message: string } | null>(null);
  const [isSettingsUpdating, setIsSettingsUpdating] = useState(false);
  
  // Debug render
  console.log('[UI] App rendering:', { 
    issueCount: issues.length, 
    isLoading,
    selectionState,
    isSettingsUpdating
  });

  useEffect(() => {
    let isMounted = true;

    function handleIssues(newIssues: LintIssue[]) {
      console.log('[UI] Handling issues update:', { 
        count: newIssues.length,
        issues: newIssues
      });
      
      if (isMounted) {
        setIssues(newIssues);
        setIsLoading(false);
        setIsSettingsUpdating(false);
      }
    }

    function handleSelectionChange(state: SelectionState) {
      if (isMounted) {
        console.log('[UI] Selection changed:', state);
        setSelectionState(state);
        setSelectionError(null);
      }
    }

    function handleSelectionError(error: string | { title: string; message: string }) {
      if (isMounted) {
        console.log('[UI] Selection error:', error);
        setSelectionError(typeof error === 'string' ? { title: 'Error', message: error } : error);
        setSelectionState({ isValid: false, count: 0 });
      }
    }

    // Listen for issue updates
    console.log('[UI] Setting up issue listener');
    const removeIssueListener = on('UPDATE_ISSUES', handleIssues);
    
    // Listen for selection changes
    console.log('[UI] Setting up selection listener');
    const removeSelectionListener = on('SELECTION_CHANGE', handleSelectionChange);
    
    // Listen for selection errors
    console.log('[UI] Setting up selection error listener');
    const removeSelectionErrorListener = on('SELECTION_ERROR', handleSelectionError);

    // Listen for settings updates
    const removeSettingsUpdateListener = on('SETTINGS_UPDATING', () => {
      if (isMounted) {
        setIsSettingsUpdating(true);
      }
    });

    // Request initial selection state
    emit('GET_SELECTION_STATE');

    // Cleanup
    return () => {
      console.log('[UI] Cleaning up');
      isMounted = false;
      removeIssueListener();
      removeSelectionListener();
      removeSelectionErrorListener();
      removeSettingsUpdateListener();
    };
  }, []);

  const handleRunLint = useCallback(() => {
    console.log('[UI] Manual lint requested');
    setIsLoading(true);
    setSelectionError(null);
    emit('SCAN_AGAIN');
  }, []);

  const handleSettings = useCallback(() => {
    console.log('[UI] Settings requested');
    emit('OPEN_SETTINGS');
  }, []);

  // Get button text based on selection state
  const getButtonText = () => {
    if (selectionState.count === 0) {
      return 'Select up to 5 frames';
    }
    return `${selectionState.count} ${selectionState.count === 1 ? 'frame' : 'frames'} selected`;
  };

  return (
    <LibraryProvider>
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
        {/* Fixed header */}
        <Container 
          space="extraSmall"
          style={{ 
            backgroundColor: 'var(--figma-color-bg)',
            height: '40px',
            borderBottom: '1px solid var(--figma-color-border)',
            overflow: 'hidden',
            padding: 0
          }}
        >
          <div style={{
            display: 'flex',
            alignItems: 'center',
            paddingLeft: 0,
            paddingRight: 'var(--space-small)',
            width: '100%',
            position: 'relative'
          }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <TabBar value={activeTab} onChange={setActiveTab} />
            </div>
          </div>
        </Container>

        {/* Scrollable content area */}
        <div style={{ 
          flex: 1,
          overflowY: 'auto',
          position: 'relative',
          paddingBottom: activeTab === 'linter' ? '64px' : 0 // Account for footer height in linter view
        }}>
          {isSettingsUpdating ? (
            <MiddleAlign>
              <LoadingIndicator />
              <VerticalSpace space="small" />
              <Text>Updating settings and scanning for issues...</Text>
            </MiddleAlign>
          ) : activeTab === 'linter' ? (
            isLoading ? (
              <MiddleAlign>
                <Text>Scanning for issues...</Text>
              </MiddleAlign>
            ) : selectionError ? (
              <MiddleAlign>
                <div style={{ 
                  textAlign: 'center',
                  padding: 'var(--space-large)',
                  maxWidth: '280px',
                  margin: '0 auto'
                }}>
                  <Text align="center" style={{ 
                    color: 'var(--figma-color-text-danger)',
                    fontWeight: 'bold',
                    marginBottom: 'var(--space-small)'
                  }}>
                    {selectionError.title}
                  </Text>
                  <Text align="center" style={{ color: 'var(--figma-color-text-danger)' }}>
                    {selectionError.message}
                  </Text>
                </div>
              </MiddleAlign>
            ) : issues.length > 0 ? (
              <ErrorDisplay issues={issues} />
            ) : (
              <MiddleAlign>
                <div style={{ 
                  textAlign: 'center',
                  padding: 'var(--space-large)',
                  maxWidth: '280px'
                }}>
                  <VerticalSpace space="small" />
                  <Text align="center" style={{ 
                    color: 'var(--figma-color-text)',
                    fontSize: 'var(--font-size-large)',
                    marginBottom: 'var(--space-small)'
                  }}>
                    Choose up to 5 frames
                  </Text>
                  <Text align="center" style={{ 
                    color: 'var(--figma-color-text-secondary)',
                    fontSize: 'var(--font-size-small)'
                  }}>
                    Select frames, groups, or components to check for design consistency issues
                  </Text>
                  <VerticalSpace space="small" />
                </div>
              </MiddleAlign>
            )
          ) : (
            <SettingsView />
          )}
        </div>

        {/* Fixed footer - only in linter view */}
        {activeTab === 'linter' && (
          <Container
            space="small"
            style={{
              position: 'fixed',
              bottom: 0,
              left: 0,
              right: 0,
              backgroundColor: 'var(--figma-color-bg)',
              borderTop: '1px solid var(--figma-color-border)',
              padding: 'var(--space-small)',
              zIndex: 2
            }}
          >
            <Button 
              fullWidth
              onClick={handleRunLint}
              disabled={selectionState.count === 0 || selectionState.count > 5 || isLoading}
            >
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between',
                width: '100%',
                alignItems: 'center'
              }}>
                <Text style={{ color: 'var(--figma-color-icon-onbrand)' }}>Run linter</Text>
                <Text style={{ 
                  color: 'var(--figma-color-icon-onbrand)',
                  opacity: 0.7
                }}>
                  {getButtonText()}
                </Text>
              </div>
            </Button>
          </Container>
        )}
      </div>
    </LibraryProvider>
  );
} 