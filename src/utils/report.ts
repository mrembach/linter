import { LintIssue, RadiusAuditLog, RadiusAuditEntry } from '../types/lint';

/**
 * Settings for the lint report
 */
export interface ReportSettings {
  selectedLibraryId: string | null;
  selectedLibraryName: string | null;
  exceptions: string[];
  excludeLockedLayers: boolean;
  excludeHiddenLayers: boolean;
  checkFills: boolean;
  checkStrokes: boolean;
  checkTexts: boolean;
  checkRadius: boolean;
  checkGaps: boolean;
  checkPadding: boolean;
}

/**
 * Generates a text report of lint issues found in the design
 * 
 * @param issues Array of lint issues to include in the report
 * @param settings Settings used for this lint run
 * @param radiusAuditLog Optional audit log data for radius checks
 * @returns String containing formatted text report
 */
export function generateLintReport(issues: LintIssue[], settings: ReportSettings, radiusAuditLog?: RadiusAuditLog): string {
  // Early return if no issues
  if (!issues || issues.length === 0) {
    return 'No lint issues found in current selection/document.';
  }

  // Group issues by type for better organization
  const issuesByType: Record<string, LintIssue[]> = {};
  
  // Populate the groups
  issues.forEach(issue => {
    const issueType = issue.type;
    if (!issuesByType[issueType]) {
      issuesByType[issueType] = [];
    }
    issuesByType[issueType].push(issue);
  });

  // Build the report text
  let reportText = 'FIGMA LINT REPORT\n';
  reportText += '=================\n\n';
  reportText += `Total issues found: ${issues.length}\n`;
  reportText += `Generated on: ${new Date().toLocaleString()}\n\n`;

  // Add lint criteria section
  reportText += 'LINT CRITERIA\n';
  reportText += '============\n\n';
  
  // Add library info
  reportText += `Selected Library: ${settings.selectedLibraryName || 'None'}\n`;
  reportText += `Library ID (full string used for comparison): ${settings.selectedLibraryId || 'None'}\n\n`;
  
  // Add filter settings
  reportText += 'Layer Filtering:\n';
  reportText += `- Exclude Locked Layers: ${settings.excludeLockedLayers ? 'Yes' : 'No'}\n`;
  reportText += `- Exclude Hidden Layers: ${settings.excludeHiddenLayers ? 'Yes' : 'No'}\n\n`;
  
  // Add issue type settings
  reportText += 'Issue Types Checked:\n';
  reportText += `- Color Fill Issues: ${settings.checkFills ? 'Yes' : 'No'}\n`;
  reportText += `- Color Stroke Issues: ${settings.checkStrokes ? 'Yes' : 'No'}\n`;
  reportText += `- Text Style Issues: ${settings.checkTexts ? 'Yes' : 'No'}\n`;
  reportText += `- Corner Radius Issues: ${settings.checkRadius ? 'Yes' : 'No'}\n`;
  reportText += `- Gap/Spacing Issues: ${settings.checkGaps ? 'Yes' : 'No'}\n`;
  reportText += `- Padding Issues: ${settings.checkPadding ? 'Yes' : 'No'}\n`;
  reportText += '\n';
  
  // Add exceptions
  reportText += 'Exceptions (excluded from lint):\n';
  if (settings.exceptions.length > 0) {
    settings.exceptions.forEach((exception, index) => {
      reportText += `${index + 1}. "${exception}"\n`;
    });
  } else {
    reportText += 'None\n';
  }
  reportText += '\n';
  
  // Add section divider before issues
  reportText += '=================\n\n';
  reportText += 'LINT ISSUES\n';
  reportText += '=================\n\n';

  // Add a section for each issue type
  Object.keys(issuesByType).forEach(type => {
    const typeIssues = issuesByType[type];
    reportText += `## ${getIssueTypeTitle(type)} Issues: ${typeIssues.length}\n`;
    
    // List each issue
    typeIssues.forEach((issue, index) => {
      reportText += `${index + 1}. Layer "${issue.nodeName}"\n`;
      reportText += `   - Message: ${issue.message}\n`;
      
      // Add details if available
      if (issue.details) {
        reportText += `   - Details: ${issue.details}\n`;
      }
      
      // Add source library info for wrong library issues
      if (issue.sourceLibraryName) {
        reportText += `   - Source Library: ${issue.sourceLibraryName}\n`;
      }
      
      // Add debug info for corner radius issues (temporary for debugging)
      if (issue.type === 'radius' && issue.debug) {
        reportText += `   - DEBUG INFO:\n${issue.debug.split('\n').map(line => `     ${line}`).join('\n')}\n`;
      }
      
      // Add node ID for reference
      reportText += `   - Node ID: ${issue.nodeId}\n`;
      
      // Add space between issues
      if (index < typeIssues.length - 1) {
        reportText += '\n';
      }
    });
    
    reportText += '\n\n';
  });

  // Add Radius Audit Log section if available
  if (radiusAuditLog && radiusAuditLog.entries && radiusAuditLog.entries.length > 0) {
    reportText += 'RADIUS AUDIT LOG\n';
    reportText += '=================\n\n';
    reportText += `Total radius checks: ${radiusAuditLog.entries.length}\n\n`;
    
    // Count issues vs non-issues
    const issueCount = radiusAuditLog.entries.filter(entry => entry.isIssue).length;
    const nonIssueCount = radiusAuditLog.entries.length - issueCount;
    
    reportText += `Issues: ${issueCount}\n`;
    reportText += `Non-issues: ${nonIssueCount}\n\n`;
    
    // Group by decision paths to see patterns
    const entriesByDecision: Record<string, RadiusAuditEntry[]> = {};
    radiusAuditLog.entries.forEach(entry => {
      const path = entry.decisionPath || 'Unknown';
      if (!entriesByDecision[path]) {
        entriesByDecision[path] = [];
      }
      entriesByDecision[path].push(entry);
    });
    
    // Show counts by decision path
    reportText += 'Decision Paths:\n';
    Object.keys(entriesByDecision).forEach(path => {
      const count = entriesByDecision[path].length;
      reportText += `- ${path}: ${count} occurrences\n`;
    });
    
    reportText += '\n';
    
    // Add detailed entries (focus on issues first)
    reportText += 'DETAILED RADIUS ENTRIES\n';
    reportText += '======================\n\n';
    
    // First report issues
    const issueEntries = radiusAuditLog.entries.filter(entry => entry.isIssue);
    if (issueEntries.length > 0) {
      reportText += `## Issues (${issueEntries.length})\n\n`;
      
      issueEntries.forEach((entry, index) => {
        reportText += `${index + 1}. Layer "${entry.nodeName}" (${entry.nodeType})\n`;
        reportText += `   - Decision: ${entry.decisionPath}\n`;
        reportText += `   - Radius Values:\n`;
        reportText += `     - cornerRadius: ${String(entry.cornerRadius)}\n`;
        
        if (entry.topLeftRadius !== undefined) {
          reportText += `     - topLeftRadius: ${String(entry.topLeftRadius)}\n`;
        }
        if (entry.topRightRadius !== undefined) {
          reportText += `     - topRightRadius: ${String(entry.topRightRadius)}\n`;
        }
        if (entry.bottomLeftRadius !== undefined) {
          reportText += `     - bottomLeftRadius: ${String(entry.bottomLeftRadius)}\n`;
        }
        if (entry.bottomRightRadius !== undefined) {
          reportText += `     - bottomRightRadius: ${String(entry.bottomRightRadius)}\n`;
        }
        
        reportText += `   - Binding Details: ${entry.bindingDetails}\n`;
        reportText += `   - Inspection Details: ${entry.inspectionDetails}\n`;
        reportText += `   - Node ID: ${entry.nodeId}\n`;
        
        if (index < issueEntries.length - 1) {
          reportText += '\n';
        }
      });
      
      reportText += '\n\n';
    }
    
    // Then sample of non-issues (first 20 for brevity)
    const nonIssueEntries = radiusAuditLog.entries.filter(entry => !entry.isIssue).slice(0, 20);
    if (nonIssueEntries.length > 0) {
      reportText += `## Non-Issues (showing first ${nonIssueEntries.length} of ${nonIssueCount})\n\n`;
      
      nonIssueEntries.forEach((entry, index) => {
        reportText += `${index + 1}. Layer "${entry.nodeName}" (${entry.nodeType})\n`;
        reportText += `   - Decision: ${entry.decisionPath}\n`;
        reportText += `   - Radius Values:\n`;
        reportText += `     - cornerRadius: ${String(entry.cornerRadius)}\n`;
        
        if (entry.topLeftRadius !== undefined) {
          reportText += `     - topLeftRadius: ${String(entry.topLeftRadius)}\n`;
        }
        if (entry.topRightRadius !== undefined) {
          reportText += `     - topRightRadius: ${String(entry.topRightRadius)}\n`;
        }
        if (entry.bottomLeftRadius !== undefined) {
          reportText += `     - bottomLeftRadius: ${String(entry.bottomLeftRadius)}\n`;
        }
        if (entry.bottomRightRadius !== undefined) {
          reportText += `     - bottomRightRadius: ${String(entry.bottomRightRadius)}\n`;
        }
        
        reportText += `   - Binding Details: ${entry.bindingDetails}\n`;
        reportText += `   - Node ID: ${entry.nodeId}\n`;
        
        if (index < nonIssueEntries.length - 1) {
          reportText += '\n';
        }
      });
    }
  }

  return reportText;
}

/**
 * Returns a human-readable title for each issue type
 */
function getIssueTypeTitle(type: string): string {
  switch(type) {
    case 'fill':
      return 'Color Fill';
    case 'stroke':
      return 'Color Stroke';
    case 'text':
      return 'Text Style';
    case 'radius':
      return 'Corner Radius';
    case 'gap':
      return 'Gap/Spacing';
    case 'padding':
      return 'Padding';
    default:
      return type.charAt(0).toUpperCase() + type.slice(1);
  }
} 