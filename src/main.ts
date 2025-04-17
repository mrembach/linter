import { showUI, emit, on } from '@create-figma-plugin/utilities';
import { checkDetachedStyles, checkLibrarySources, radiusAuditLog, clearRadiusAuditLog } from './utils/lint';
import { LintIssue } from './types/lint';
import { generateLintReport } from './utils/report';

const WIDTH = 360;
const HEIGHT = 520;

// Debug logging
function log(message: string, data?: any) {
  console.log(`[Linter] ${message}`, data ? JSON.stringify(data, null, 2) : '');
}

// Global variables for library state
let selectedLibraryId: string | null = null;
let libraryMap = new Map<string, { name: string }>();
let styleExceptions: string[] = [];
let excludeLockedLayers: boolean = true;
let excludeHiddenLayers: boolean = true;

// Issue type check settings - default all to true
let checkFills: boolean = true;
let checkStrokes: boolean = true;
let checkTexts: boolean = true;
let checkRadius: boolean = true;
let checkGaps: boolean = true;
let checkPadding: boolean = true;

// Default exceptions
const DEFAULT_EXCEPTIONS = 'Retail UI/*';

// Current issues found by the linter (used for generating reports)
let currentIssues: LintIssue[] = [];

export default function () {
  log('Plugin initializing...');
  
  // Initialize UI
  showUI({
    width: WIDTH,
    height: HEIGHT,
    title: ''
  });

  // Try to load saved library from client storage
  loadSelectedLibrary().then(() => {
    log('Initial library loaded', { selectedLibraryId });
  });
  
  // Try to load exceptions from client storage
  loadExceptions().then(() => {
    log('Exceptions loaded', { count: styleExceptions.length });
  });
  
  // Try to load exclude locked layers setting from client storage
  loadExcludeLockedSetting().then(() => {
    log('Exclude locked layers setting loaded', { excludeLockedLayers });
  });
  
  // Try to load exclude hidden layers setting from client storage
  loadExcludeHiddenSetting().then(() => {
    log('Exclude hidden layers setting loaded', { excludeHiddenLayers });
  });

  // Try to load issue type check settings from client storage
  loadIssueTypeCheckSettings().then(() => {
    log('Issue type check settings loaded', { 
      checkFills, 
      checkStrokes, 
      checkTexts, 
      checkRadius, 
      checkGaps, 
      checkPadding 
    });
  });

  // Handle node selection from UI
  on('SELECT_NODE', (nodeId: string) => {
    log('Node selection requested', { nodeId });
    const node = figma.getNodeById(nodeId);
    if (node && isSelectableNode(node)) {
      log('Selecting node', { nodeId, nodeType: node.type });
      figma.currentPage.selection = [node];
      figma.viewport.scrollAndZoomIntoView([node]);
    } else {
      log('Invalid node selection', { nodeId, nodeType: node?.type });
    }
  });

  // Handle libraries request
  on('GET_LIBRARIES', async () => {
    log('Libraries requested');
    try {
      const libraries = await getAvailableLibraries();
      log('Libraries retrieved', { count: libraries.length });
      emit('UPDATE_LIBRARIES', libraries);
    } catch (error) {
      log('Error getting libraries', { error: error instanceof Error ? error.message : String(error) });
      emit('UPDATE_LIBRARIES', []);
    }
  });

  // Handle re-scan request
  on('SCAN_AGAIN', () => {
    log('Manual rescan requested');
    
    // Validate selection
    const selection = figma.currentPage.selection;
    const selectionCount = selection.length;
    
    if (selectionCount === 0) {
      emit('UPDATE_ISSUES', []);
      emit('SELECTION_ERROR', 'Please select 1-5 frames to lint');
      return;
    }
    
    if (selectionCount > 5) {
      emit('UPDATE_ISSUES', []);
      emit('SELECTION_ERROR', 'Please select no more than 5 frames');
      return;
    }

    // Count total frames including children
    let totalFrameCount = 0;
    function countFrames(node: BaseNode) {
      if (node.type === 'FRAME' || node.type === 'COMPONENT' || node.type === 'INSTANCE') {
        totalFrameCount++;
        if ('children' in node) {
          node.children.forEach(countFrames);
        }
      }
    }
    selection.forEach(countFrames);

    if (totalFrameCount > 5000) {
      emit('UPDATE_ISSUES', []);
      emit('SELECTION_ERROR', {
        title: 'Too many frames detected',
        message: 'More than 5000 nested frames detected. Select fewer frames and try again.'
      });
      return;
    }
    
    const issues = scanForIssues();
    log('Manual rescan complete', { issueCount: issues.length });
    emit('UPDATE_ISSUES', issues);
  });

  // Listen for selection changes in Figma canvas
  let selectionChangeTimeout: NodeJS.Timeout | undefined;
  figma.on('selectionchange', () => {
    if (selectionChangeTimeout) {
      clearTimeout(selectionChangeTimeout);
    }
    
    selectionChangeTimeout = setTimeout(() => {
      const selection = figma.currentPage.selection;
      const selectionCount = selection.length; // This is already top-level selections
      const isValidSelection = selectionCount > 0 && selectionCount <= 10;
      
      log('Selection changed', { 
        selectionCount,
        isValidSelection,
        selectionTypes: selection.map(node => node.type)
      });
      
      emit('SELECTION_CHANGE', {
        isValid: isValidSelection,
        count: selectionCount
      });
    }, 100);
  });

  // Handle GET_SELECTION_STATE request
  on('GET_SELECTION_STATE', () => {
    const selection = figma.currentPage.selection;
    const selectionCount = selection.length; // This is already top-level selections
    const isValidSelection = selectionCount > 0 && selectionCount <= 10;
    
    log('Selection state requested', { 
      selectionCount,
      isValidSelection
    });
    
    emit('SELECTION_CHANGE', {
      isValid: isValidSelection,
      count: selectionCount
    });
  });

  // Handle exceptions request
  on('GET_EXCEPTIONS', async () => {
    log('Exceptions requested');
    try {
      // Send current exceptions to UI
      emit('EXCEPTIONS_LOADED', styleExceptions.join(', '));
    } catch (error) {
      log('Error retrieving exceptions', { error: error instanceof Error ? error.message : String(error) });
    }
  });
  
  // Handle exceptions update
  on('UPDATE_EXCEPTIONS', (exceptionsString: string) => {
    log('Exceptions updated', { exceptionsString });
    // Parse the comma-separated string into array
    const newExceptions = exceptionsString
      .split(',')
      .map(item => item.trim())
      .filter(item => item.length > 0);
    
    // Update exceptions
    styleExceptions = newExceptions;
    log('Parsed and updated exceptions', { count: styleExceptions.length, exceptions: styleExceptions });
    
    // Save immediately to ensure it's persisted
    figma.clientStorage.setAsync('styleExceptions', exceptionsString).then(() => {
      log('Saved exceptions to client storage', { exceptionsString });
    }).catch(error => {
      log('Error saving exceptions', { error: error instanceof Error ? error.message : String(error) });
    });
  });

  // Handle saving selected library
  on('SAVE_SELECTED_LIBRARY', async (libraryId: string) => {
    log('Saving selected library', { libraryId });
    selectedLibraryId = libraryId;
    
    // Save to client storage for persistence
    try {
      await figma.clientStorage.setAsync('selectedLibraryId', libraryId);
      log('Saved library to client storage', { libraryId });
    } catch (storageError) {
      log('Error saving library to client storage', { error: storageError });
    }
  });

  // Handle GET_ISSUE_TYPE_CHECKS message
  on('GET_ISSUE_TYPE_CHECKS', async () => {
    try {
      // Emit all loaded issue type check settings
      emit('ISSUE_TYPE_CHECKS_LOADED', {
        fill: checkFills,
        stroke: checkStrokes,
        text: checkTexts,
        radius: checkRadius,
        gap: checkGaps,
        padding: checkPadding
      });
    } catch (error) {
      log('Error loading issue type check settings', { error });
      // Default to true on error
      emit('ISSUE_TYPE_CHECKS_LOADED', {
        fill: true,
        stroke: true,
        text: true,
        radius: true,
        gap: true,
        padding: true
      });
    }
  });
  
  // Handle UPDATE_ISSUE_TYPE_CHECKS message
  on('UPDATE_ISSUE_TYPE_CHECKS', 
    async (settings: {
      fill?: boolean,
      stroke?: boolean,
      text?: boolean,
      radius?: boolean,
      gap?: boolean,
      padding?: boolean
    }) => {
      log('Issue type check settings updated', { settings });
      try {
        // Update only the settings that were provided
        if (settings.fill !== undefined) checkFills = settings.fill;
        if (settings.stroke !== undefined) checkStrokes = settings.stroke;
        if (settings.text !== undefined) checkTexts = settings.text;
        if (settings.radius !== undefined) checkRadius = settings.radius;
        if (settings.gap !== undefined) checkGaps = settings.gap;
        if (settings.padding !== undefined) checkPadding = settings.padding;
        
        // Save to client storage
        await figma.clientStorage.setAsync('checkFills', checkFills);
        await figma.clientStorage.setAsync('checkStrokes', checkStrokes);
        await figma.clientStorage.setAsync('checkTexts', checkTexts);
        await figma.clientStorage.setAsync('checkRadius', checkRadius);
        await figma.clientStorage.setAsync('checkGaps', checkGaps);
        await figma.clientStorage.setAsync('checkPadding', checkPadding);
    
        log('Saved issue type check settings to client storage');
        
        // Notify UI that settings are being updated
        emit('SETTINGS_UPDATING');
        
        // Re-scan with new settings
        const issues = scanForIssues();
        currentIssues = issues; // Update stored issues for reports
        log('Rescan after issue type check settings update complete', { issueCount: issues.length });
        emit('UPDATE_ISSUES', issues);
      } catch (error) {
        log('Error saving issue type check settings', { error });
      }
    }
  );
  
  // Handle GET_EXCLUDE_LOCKED message
  on('GET_EXCLUDE_LOCKED', async () => {
    try {
      // Try to load setting from client storage
      const savedExcludeLocked = await figma.clientStorage.getAsync('excludeLockedLayers');
      // Use the saved value or default to true if not found
      excludeLockedLayers = savedExcludeLocked !== undefined ? savedExcludeLocked : true;
      log('Loaded exclude locked layers setting', { excludeLockedLayers });
      emit('EXCLUDE_LOCKED_LOADED', excludeLockedLayers);
    } catch (error) {
      log('Error loading exclude locked layers setting', { error });
      // Default to true on error
      emit('EXCLUDE_LOCKED_LOADED', true);
    }
  });
  
  // Handle UPDATE_EXCLUDE_LOCKED message
  on('UPDATE_EXCLUDE_LOCKED', async (newExcludeLocked: boolean) => {
    log('Exclude locked layers setting updated', { newExcludeLocked });
    try {
      excludeLockedLayers = newExcludeLocked;
     
      await figma.clientStorage.setAsync('excludeLockedLayers', newExcludeLocked);
      log('Saved exclude locked layers setting to client storage');
      
      // Notify UI that settings are being updated
      emit('SETTINGS_UPDATING');
      
      // Re-scan with new setting
      const issues = scanForIssues();
      currentIssues = issues; // Update stored issues for reports
      log('Rescan after exclude locked layers update complete', { issueCount: issues.length });
      emit('UPDATE_ISSUES', issues);
    } catch (error) {
      log('Error saving exclude locked layers setting', { error });
    }
  });
  
  // Handle GET_EXCLUDE_HIDDEN message
  on('GET_EXCLUDE_HIDDEN', async () => {
    try {
      // Try to load setting from client storage
      const savedExcludeHidden = await figma.clientStorage.getAsync('excludeHiddenLayers');
      // Use the saved value or default to true if not found
      excludeHiddenLayers = savedExcludeHidden !== undefined ? savedExcludeHidden : true;
      log('Loaded exclude hidden layers setting', { excludeHiddenLayers });
      emit('EXCLUDE_HIDDEN_LOADED', excludeHiddenLayers);
    } catch (error) {
      log('Error loading exclude hidden layers setting', { error });
      // Default to true on error
      emit('EXCLUDE_HIDDEN_LOADED', true);
    }
  });
  
  // Handle UPDATE_EXCLUDE_HIDDEN message
  on('UPDATE_EXCLUDE_HIDDEN', async (newExcludeHidden: boolean) => {
    log('Exclude hidden layers setting updated', { newExcludeHidden });
    try {
      excludeHiddenLayers = newExcludeHidden;
     
      await figma.clientStorage.setAsync('excludeHiddenLayers', newExcludeHidden);
      log('Saved exclude hidden layers setting to client storage');
      
      // Notify UI that settings are being updated
      emit('SETTINGS_UPDATING');
      
      // Re-scan with new setting
      const issues = scanForIssues();
      currentIssues = issues; // Update stored issues for reports
      log('Rescan after exclude hidden layers update complete', { issueCount: issues.length });
      emit('UPDATE_ISSUES', issues);
    } catch (error) {
      log('Error saving exclude hidden layers setting', { error });
    }
  });

  // Handle generate report request
  on('GENERATE_REPORT', () => {
    log('Report generation requested');
    
    try {
      // Create settings object for the report
      const reportSettings = {
        selectedLibraryId,
        selectedLibraryName: selectedLibraryId ? libraryMap.get(selectedLibraryId)?.name || null : null,
        exceptions: styleExceptions,
        excludeLockedLayers,
        excludeHiddenLayers,
        checkFills,
        checkStrokes,
        checkTexts,
        checkRadius, 
        checkGaps,
        checkPadding
      };
      
      const reportText = generateLintReport(currentIssues, reportSettings, radiusAuditLog);
      log('Report generated', { length: reportText.length });
      
      // Send the report content back to the UI for download
      emit('REPORT_GENERATED', {
        content: reportText,
        timestamp: new Date().toISOString().replace(/[:.]/g, '-')
      });
    } catch (error) {
      log('Error generating report', { error: error instanceof Error ? error.message : String(error) });
      emit('REPORT_ERROR', 'Error generating report');
    }
  });

  log('Plugin initialization complete');
}

// Load selected library from client storage
async function loadSelectedLibrary() {
  try {
    const savedLibraryId = await figma.clientStorage.getAsync('selectedLibraryId');
    log('Loaded library from client storage', { savedLibraryId });
    if (savedLibraryId) {
      selectedLibraryId = savedLibraryId;
    }
  } catch (error) {
    log('Error loading library from client storage', { error });
  }
}

// Load exceptions from client storage
async function loadExceptions() {
  try {
    const savedExceptions = await figma.clientStorage.getAsync('styleExceptions') as string;
    
    if (savedExceptions) {
      log('Loaded exceptions from client storage', { savedExceptions });
      styleExceptions = savedExceptions.split(',')
        .map(item => item.trim())
        .filter(item => item.length > 0);
      log('Parsed exceptions', { count: styleExceptions.length, exceptions: styleExceptions });
    } else {
      // Use default exceptions if none saved
      log('Using default exceptions', { defaultExceptions: DEFAULT_EXCEPTIONS });
      styleExceptions = DEFAULT_EXCEPTIONS.split(',')
        .map(item => item.trim())
        .filter(item => item.length > 0);
      log('Using default exceptions', { count: styleExceptions.length, exceptions: styleExceptions });
    }
  } catch (error) {
    log('Error loading exceptions from client storage', { error });
    // Use default exceptions on error
    styleExceptions = DEFAULT_EXCEPTIONS.split(',')
      .map(item => item.trim())
      .filter(item => item.length > 0);
    log('Using default exceptions after error', { count: styleExceptions.length, exceptions: styleExceptions });
  }
}

// Load exclude locked layers setting from client storage
async function loadExcludeLockedSetting() {
  try {
    const savedExcludeLocked = await figma.clientStorage.getAsync('excludeLockedLayers');
    
    if (savedExcludeLocked !== undefined) {
      log('Loaded exclude locked layers setting from client storage', { excludeLockedLayers: savedExcludeLocked });
      excludeLockedLayers = savedExcludeLocked as boolean;
    } else {
      // Use default value if none saved
      log('Using default exclude locked layers setting', { excludeLockedLayers });
    }
  } catch (error) {
    log('Error loading exclude locked layers setting from client storage', { error });
    // Use default value on error
    log('Using default exclude locked layers setting after error', { excludeLockedLayers });
  }
}

// Load exclude hidden layers setting from client storage
async function loadExcludeHiddenSetting() {
  try {
    const savedExcludeHidden = await figma.clientStorage.getAsync('excludeHiddenLayers');
    
    if (savedExcludeHidden !== undefined) {
      log('Loaded exclude hidden layers setting from client storage', { excludeHiddenLayers: savedExcludeHidden });
      excludeHiddenLayers = savedExcludeHidden as boolean;
    } else {
      // Use default value if none saved
      log('Using default exclude hidden layers setting', { excludeHiddenLayers });
    }
  } catch (error) {
    log('Error loading exclude hidden layers setting from client storage', { error });
    // Use default value on error
    log('Using default exclude hidden layers setting after error', { excludeHiddenLayers });
  }
}

// Load issue type check settings from client storage
async function loadIssueTypeCheckSettings() {
  try {
    // Load all issue type check settings
    const savedCheckFills = await figma.clientStorage.getAsync('checkFills');
    const savedCheckStrokes = await figma.clientStorage.getAsync('checkStrokes');
    const savedCheckTexts = await figma.clientStorage.getAsync('checkTexts');
    const savedCheckRadius = await figma.clientStorage.getAsync('checkRadius');
    const savedCheckGaps = await figma.clientStorage.getAsync('checkGaps');
    const savedCheckPadding = await figma.clientStorage.getAsync('checkPadding');
    
    // Update only if values were found
    checkFills = savedCheckFills !== undefined ? savedCheckFills : true;
    checkStrokes = savedCheckStrokes !== undefined ? savedCheckStrokes : true;
    checkTexts = savedCheckTexts !== undefined ? savedCheckTexts : true;
    checkRadius = savedCheckRadius !== undefined ? savedCheckRadius : true;
    checkGaps = savedCheckGaps !== undefined ? savedCheckGaps : true;
    checkPadding = savedCheckPadding !== undefined ? savedCheckPadding : true;
    
    log('Loaded issue type check settings from client storage', {
      checkFills,
      checkStrokes,
      checkTexts,
      checkRadius,
      checkGaps,
      checkPadding
    });
  } catch (error) {
    log('Error loading issue type check settings from client storage', { error });
    // Use default values (true) on error
  }
}

// Check if a node name matches any exception
function isExceptionStyle(nodeName: string): boolean {
  if (!styleExceptions.length) return false;
  if (!nodeName || nodeName.trim() === '') return false; // Skip empty node names
  
  log('Checking if node matches exceptions', { nodeName, exceptionCount: styleExceptions.length });
  
  // Loop through each exception and do a proper check
  const matches = styleExceptions.some(exception => {
    const trimmedException = exception.trim();
    if (trimmedException === '') return false;
    
    // Check for wildcard pattern (ends with *)
    if (trimmedException.endsWith('*')) {
      const prefix = trimmedException.slice(0, -1); // Remove the * character
      return nodeName.toLowerCase().startsWith(prefix.toLowerCase());
    }
    
    // Standard matching (contains)
    return nodeName.toLowerCase().includes(trimmedException.toLowerCase());
  });
  
  // Log result 
  if (matches) {
    log('Node matches exception - will be excluded', { nodeName });
  }
  
  return matches;
}

function isSelectableNode(node: BaseNode): node is SceneNode {
  const result = node.type !== 'PAGE' && node.type !== 'DOCUMENT';
  log('Checking if node is selectable', { nodeType: node.type, result });
  return result;
}

function isLintableNode(node: BaseNode): node is SceneNode {
  // Check for nodes that should not be linted
  if (node.type === 'PAGE' || node.type === 'DOCUMENT') {
    return false;
  }
  
  const sceneNode = node as SceneNode;
  
  // Check if we should exclude locked layers based on settings
  if (excludeLockedLayers && sceneNode.locked) {
    log('Skipping locked layer due to settings', { 
      nodeId: node.id, 
      nodeName: node.name 
    });
    return false;
  }
  
  // Check if we should exclude hidden layers based on settings
  if (excludeHiddenLayers && !sceneNode.visible) {
    log('Skipping hidden layer due to settings', { 
      nodeId: node.id, 
      nodeName: node.name 
    });
    return false;
  }
  
  // Check if node has any of the properties we want to lint
  const hasTextProperties = node.type === 'TEXT';
  const hasFillProperties = 'fills' in node;
  const hasStrokeProperties = 'strokes' in node;
  const hasCornerRadius = 'cornerRadius' in node;
  const hasAutoLayout = 'layoutMode' in node && 
    (node as FrameNode | ComponentNode | InstanceNode).layoutMode !== 'NONE';
  
  const result = hasTextProperties || hasFillProperties || hasStrokeProperties || 
                hasCornerRadius || hasAutoLayout;
  
  log('Checking if node is lintable', { 
    nodeType: node.type, 
    isText: hasTextProperties,
    hasFills: hasFillProperties,
    hasStrokes: hasStrokeProperties,
    hasCornerRadius: hasCornerRadius,
    hasAutoLayout: hasAutoLayout,
    isLocked: sceneNode.locked,
    isVisible: sceneNode.visible,
    result 
  });
  
  return result;
}

function scanForIssues(): LintIssue[] {
  log('Starting issue scan');
  const issues: LintIssue[] = [];
  let nodeCount = 0;
  
  // Get nodes to scan
  const nodes = figma.currentPage.selection.length > 0
    ? figma.currentPage.selection
    : figma.currentPage.children;
  
  log('Nodes to scan:', nodes.length);
  
  // Log the current state of issue type checks
  log('Current issue type check settings:', {
    checkFills,
    checkStrokes,
    checkTexts,
    checkRadius,
    checkGaps,
    checkPadding
  });
  
  // Traverse nodes
  function traverse(node: BaseNode) {
    nodeCount++;
    
    if (isLintableNode(node)) {
      log('Node is lintable');
      
      // Check for detached styles (missing styles/variables)
      const detachedIssues = checkDetachedStyles(node);
      
      // Log all issues before filtering
      const radiusIssuesBeforeFilter = detachedIssues.filter(issue => issue.type === 'radius');
      log('RADIUS DEBUG - Issues returned from checkDetachedStyles:', {
        nodeName: node.name,
        nodeType: node.type,
        allIssueTypes: detachedIssues.map(i => i.type),
        radiusIssueCount: radiusIssuesBeforeFilter.length,
        radiusIssues: radiusIssuesBeforeFilter
      });
      
      // Filter issues based on issue type check settings
      const filteredDetachedIssues = detachedIssues.filter(issue => {
        const shouldInclude = (() => {
          switch(issue.type) {
            case 'fill':
              return checkFills;
            case 'stroke':
              return checkStrokes;
            case 'text':
              return checkTexts;
            case 'radius':
              return checkRadius;
            case 'gap':
              return checkGaps;
            case 'padding':
              return checkPadding;
            default:
              return true;
          }
        })();
        
        if (issue.type === 'radius') {
          log('RADIUS DEBUG - Filtering radius issue:', {
            nodeName: node.name,
            nodeId: node.id,
            shouldInclude,
            checkRadiusSetting: checkRadius,
            issue
          });
        }
        
        return shouldInclude;
      });
      
      // Log radius issues after filtering
      const radiusIssuesAfterFilter = filteredDetachedIssues.filter(issue => issue.type === 'radius');
      log('RADIUS DEBUG - After filtering:', {
        nodeName: node.name,
        nodeType: node.type,
        radiusIssueCount: radiusIssuesAfterFilter.length,
        radiusIssues: radiusIssuesAfterFilter,
        allFilteredIssueTypes: filteredDetachedIssues.map(i => i.type)
      });
      
      issues.push(...filteredDetachedIssues);
      
      // Log current state of issues array after pushing
      log('RADIUS DEBUG - Current issues array state:', {
        totalIssues: issues.length,
        radiusIssues: issues.filter(i => i.type === 'radius'),
        allIssueTypes: issues.map(i => i.type)
      });
      
      // Check if we should validate library sources
      if (selectedLibraryId) {
        log('Checking library sources', { selectedLibraryId });
        // Check for styles/variables from wrong library
        const libraryIssues = checkLibrarySources(node, selectedLibraryId, libraryMap, styleExceptions);
        
        issues.push(...libraryIssues);
      } else {
        log('Skipping library source check - no library selected');
      }
    }
    
    // Traverse children (if any), regardless of whether the parent is lintable
    if ('children' in node) {
      const parentNode = node as FrameNode | GroupNode | ComponentNode | InstanceNode | PageNode | DocumentNode;
      log('Node has children:', parentNode.children.length);
      
      // When traversing children, we should filter out locked/hidden layers
      // based on our settings before recursing
      const children = parentNode.children.filter(child => {
        // Skip locked layers if exclude locked layers is enabled
        if (excludeLockedLayers && 'locked' in child && child.locked) {
          return false;
        }
        // Skip hidden layers if exclude hidden layers is enabled
        if (excludeHiddenLayers && 'visible' in child && !child.visible) {
          return false;
        }
        return true;
      });
      
      children.forEach(traverse);
    }
  }
  
  nodes.forEach(traverse);
  
  // Log final state of issues array
  const finalRadiusIssues = issues.filter(i => i.type === 'radius');
  log('RADIUS DEBUG - Final issues array:', {
    totalIssues: issues.length,
    radiusIssueCount: finalRadiusIssues.length,
    radiusIssues: finalRadiusIssues,
    allIssueTypes: issues.map(i => i.type)
  });
  
  return issues;
}

// Function to get available libraries
async function getAvailableLibraries() {
  try {
    // Define library interface
    interface LibraryInfo {
      id: string;
      name: string;
      type: 'document' | 'team';
      enabled?: boolean;
      firstCollectionKey?: string;  // Added to store collection key for identification
      collectionCount?: number;
      firstCollectionName?: string; // Added to store the name of the first collection
      collectionNames?: string[];   // Added to store all collection names
      displayName?: string;         // Added for customizing display in dropdown
      isDependency?: boolean;       // Added to flag libraries that are likely just dependencies
    }
    
    log('Getting available libraries');
    const libraries: LibraryInfo[] = [];
    
    // Get document libraries
    // No longer adding "Current Document" option as requested
    
    // Get published styles from this document
    const localStyles = [
      ...figma.getLocalTextStyles(),
      ...figma.getLocalEffectStyles(),
      ...figma.getLocalPaintStyles(),
      ...figma.getLocalGridStyles()
    ];
    
    if (localStyles.length > 0) {
      libraries.push({
        id: 'local-styles',
        name: 'Document Styles',
        type: 'document',
        enabled: true
      });
    }
    
    // Get team libraries using the teamLibrary API
    if (figma.teamLibrary) {
      try {
        log('Attempting to access team libraries - Note: Only libraries with variables will be detected');
        
        // Get variable collections from enabled libraries
        const libraryCollections = await figma.teamLibrary.getAvailableLibraryVariableCollectionsAsync();
        log('Library collections retrieved', { count: libraryCollections.length });
        
        // Log the full detail of one collection to see all available properties
        if (libraryCollections.length > 0) {
          log('Sample collection details', libraryCollections[0]);
        }
        
        if (libraryCollections.length === 0) {
          log('No variable collections found in enabled libraries. Note that only libraries containing variables will appear here.');
        }
        
        // Create a map to avoid duplicates (since multiple collections can come from the same library)
        const libraryMap = new Map<string, LibraryInfo>();
        
        // Count collections per library ID for additional identification
        const collectionsPerLibrary: Record<string, number> = {};
        // Store collection names per library ID
        const collectionNamesPerLibrary: Record<string, string[]> = {};
        
        // Process each collection to identify its source library
        for (const collection of libraryCollections) {
          // Extract library info from collection key
          // Format is usually: libraryId/collectionId
          const parts = collection.key.split('/');
          if (parts.length > 0) {
            const libraryId = parts[0];
            const libraryName = collection.libraryName || 'Unknown Library';
            
            // Count collections for this library
            collectionsPerLibrary[libraryId] = (collectionsPerLibrary[libraryId] || 0) + 1;
            
            // Store collection name
            if (!collectionNamesPerLibrary[libraryId]) {
              collectionNamesPerLibrary[libraryId] = [];
            }
            if (collection.name) {
              collectionNamesPerLibrary[libraryId].push(collection.name);
            }
            
            // Log details about this collection for debugging
            log('Processing library collection', { 
              key: collection.key, 
              libraryName: collection.libraryName,
              libraryId: libraryId,
              collectionName: collection.name
            });
            
            // Only add library if we haven't seen it before
            if (!libraryMap.has(libraryId)) {
              libraryMap.set(libraryId, {
                id: libraryId,
                name: libraryName,
                type: 'team',
                enabled: true,
                // Store the first variable collection key and name from this library
                firstCollectionKey: collection.key,
                firstCollectionName: collection.name
              });
            }
          }
        }
        
        // Add variable collection count and names to each library
        libraryMap.forEach((library, id) => {
          library.collectionCount = collectionsPerLibrary[id] || 0;
          library.collectionNames = collectionNamesPerLibrary[id] || [];
          
          // Create a more descriptive display name that includes collection details
          // This helps distinguish between libraries with same name but different content
          if (library.firstCollectionName && 
              (library.firstCollectionName.toLowerCase().includes('semantic') || 
               library.firstCollectionName.toLowerCase().includes('primitive') ||
               library.firstCollectionName.toLowerCase().includes('token'))) {
            // For collections with special names like "semantic" or "primitive", highlight that
            library.displayName = `${library.name} (${library.firstCollectionName})`;
            
            // Flag libraries that are likely just dependencies (primitive tokens)
            // These are often just referenced by semantic tokens and not directly used
            if (library.firstCollectionName.toLowerCase().includes('primitive') ||
                (library.firstCollectionName.toLowerCase().includes('token') && 
                 !library.firstCollectionName.toLowerCase().includes('semantic'))) {
              library.isDependency = true;
              log('Flagged library as dependency', { 
                name: library.name, 
                collection: library.firstCollectionName 
              });
            }
          }
        });
        
        // Add team libraries to our list - convert Map to Array in a compatible way
        const teamLibraries: LibraryInfo[] = [];
        
        // Only add libraries that aren't dependencies
        libraryMap.forEach(library => {
          if (!library.isDependency) {
            teamLibraries.push(library);
          } else {
            log('Skipping dependency library', { 
              name: library.name, 
              collection: library.firstCollectionName 
            });
          }
        });
        
        // Add filtered libraries to our list
        libraries.push(...teamLibraries);
        log('Team libraries added', { count: teamLibraries.length });
        
        // Add note about API limitation
        if (teamLibraries.length === 0) {
          // This is an API limitation - only libraries with variables can be detected
          log('Note: Due to Figma API limitations, only libraries containing variables will appear in the dropdown');
        }
      } catch (teamLibraryError) {
        log('Error accessing team libraries', { 
          error: teamLibraryError instanceof Error ? teamLibraryError.message : String(teamLibraryError) 
        });
      }
    } else {
      log('Team Library API not available - ensure "teamlibrary" permission is set in manifest.json');
    }
    
    // Update the global library map for quick lookups
    libraryMap.clear();
    libraries.forEach(lib => {
      libraryMap.set(lib.id, { name: lib.name });
    });
    log('Library map updated', { libraryCount: libraryMap.size });
    
    return libraries as LibraryInfo[];
  } catch (error) {
    log('Error in getAvailableLibraries', { error: error instanceof Error ? error.message : String(error) });
    return [];
  }
} 