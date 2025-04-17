import { showUI, emit, on } from '@create-figma-plugin/utilities';
import { checkDetachedStyles } from './utils/lint';
import { LintIssue } from './types/lint';

const WIDTH = 320;
const HEIGHT = 480;

// Debug logging
function log(message: string, data?: any) {
  console.log(`[Linter] ${message}`, data ? JSON.stringify(data, null, 2) : '');
}

export default function () {
  log('Plugin initializing...');
  
  // Initialize UI
  showUI({
    width: WIDTH,
    height: HEIGHT,
    title: ''
  });

  // Run initial lint on the current selection
  log('Running initial scan...');
  const initialIssues = scanForIssues();
  log('Initial scan complete', { issueCount: initialIssues.length });
  emit('UPDATE_ISSUES', initialIssues);

  // Handle node selection from UI
  on('SELECT_NODE', (nodeId: string) => {
    log('Node selection requested', { nodeId });
    const node = figma.getNodeById(nodeId);
    if (node && isSelectableNode(node)) {
      log('Selecting node', { nodeId, nodeType: node.type });
      figma.currentPage.selection = [node];
      figma.viewport.scrollAndZoomIntoView([node]);
      // Remove re-scan after selection change - we only want to select and view the node
    } else {
      log('Invalid node selection', { nodeId, nodeType: node?.type });
    }
  });

  // Handle libraries request
  on('GET_LIBRARIES', async () => {
    log('Libraries requested');
    try {
      // Get available libraries
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
    const issues = scanForIssues();
    log('Manual rescan complete', { issueCount: issues.length });
    emit('UPDATE_ISSUES', issues);
  });

  // Listen for selection changes in Figma canvas
  let selectionChangeTimeout: NodeJS.Timeout | undefined;
  figma.on('selectionchange', () => {
    // Clear any pending timeout
    if (selectionChangeTimeout) {
      clearTimeout(selectionChangeTimeout);
    }
    
    // Add a small delay to ensure Figma has updated its internal state
    selectionChangeTimeout = setTimeout(() => {
      // Log the selection change but don't trigger a re-scan
      log('Canvas selection changed', { 
        selectionCount: figma.currentPage.selection.length,
        selectionTypes: figma.currentPage.selection.map(node => node.type)
      });
      // Removed automatic re-scan on selection change - only scan on explicit Run Linter action
    }, 100); // Small delay to ensure Figma state is updated
  });

  log('Plugin initialization complete');
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
  
  // Traverse nodes
  function traverse(node: BaseNode) {
    nodeCount++;
    log('Traversing node:', {
      id: node.id,
      type: node.type,
      name: node.name
    });
    
    if (isLintableNode(node)) {
      log('Node is lintable');
      const nodeIssues = checkDetachedStyles(node);
      log('Found issues for node', { 
        nodeType: node.type,
        nodeName: node.name,
        issueCount: nodeIssues.length
      });
      issues.push(...nodeIssues);
    }
    
    if ('children' in node) {
      log('Node has children:', node.children.length);
      node.children.forEach(traverse);
    }
  }
  
  nodes.forEach(traverse);
  log('Scan complete', { 
    totalNodes: nodeCount,
    totalIssues: issues.length
  });
  
  return issues;
}

// Function to get available libraries
async function getAvailableLibraries() {
  try {
    // Get available libraries
    const libraries = [];
    
    // Define library interface
    interface LibraryInfo {
      id: string;
      name: string;
      type: 'document' | 'team';
      enabled?: boolean;
    }
    
    // Get document libraries
    libraries.push({
      id: 'current',
      name: 'Current Document',
      type: 'document',
      enabled: true
    });
    
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
    
    // Add some common team libraries as examples
    // In a real implementation, we would need to use different API methods
    // that might not be available in the plugin API
    const mockTeamLibraries: LibraryInfo[] = [
      { 
        id: 'team-colors',
        name: 'Team Colors',
        type: 'team',
        enabled: true
      },
      {
        id: 'team-components',
        name: 'UI Components',
        type: 'team',
        enabled: false
      },
      {
        id: 'team-typography',
        name: 'Typography',
        type: 'team',
        enabled: true
      }
    ];
    
    libraries.push(...mockTeamLibraries);
    
    return libraries as LibraryInfo[];
  } catch (error) {
    log('Error in getAvailableLibraries', { error: error instanceof Error ? error.message : String(error) });
    return [];
  }
} 