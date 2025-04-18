/// <reference types="@figma/plugin-typings" />

export type LintIssueType = 'fill' | 'stroke' | 'text' | 'radius' | 'gap' | 'padding';

export interface LintIssue {
  nodeId: string;
  nodeName: string;
  type: LintIssueType;
  message: string;
  details?: string;
  sourceLibraryId?: string; // ID of the library where the style/variable comes from
  sourceLibraryName?: string; // Name of the library where the style/variable comes from
  debug?: string; // Temporary field for debugging purposes
  nodeType?: string; // The Figma node type (FRAME, COMPONENT, etc.)
  isAutoLayout?: boolean; // Whether the frame uses auto-layout
  layoutMode?: 'NONE' | 'HORIZONTAL' | 'VERTICAL'; // Auto-layout direction
  layoutAlign?: 'MIN' | 'MAX' | 'CENTER' | 'SPACE_BETWEEN' | 'NONE'; // Auto-layout alignment
  layoutWrap?: 'NO_WRAP' | 'WRAP'; // Whether auto-layout wraps
}

export interface GroupedIssues {
  [key: string]: LintIssue[];
}

// Radius audit log data structures
export interface RadiusAuditEntry {
  nodeId: string;
  nodeName: string;
  nodeType: string;
  cornerRadius: number | string | typeof figma.mixed;
  topLeftRadius?: number | string | typeof figma.mixed;
  topRightRadius?: number | string | typeof figma.mixed;
  bottomLeftRadius?: number | string | typeof figma.mixed;
  bottomRightRadius?: number | string | typeof figma.mixed;
  isIssue: boolean;
  decisionPath: string;
  bindingDetails: string;
  inspectionDetails: string;
}

export interface RadiusAuditLog {
  entries: RadiusAuditEntry[];
}