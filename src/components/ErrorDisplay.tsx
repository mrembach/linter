/** @jsx h */
import { h } from 'preact';
import './ErrorDisplay.css'; // Import CSS for scrollbar hiding
import { 
  Text, 
  Stack, 
  VerticalSpace, 
  Bold, 
  IconMissingFont24, 
  IconCorners24, 
  IconSpacingVerticalSmall24, 
  IconSpacingHorizontalSmall24,
  Layer,
  IconStrokeWeight24,
  IconEyedropper24,
  IconFrame16,
  IconComponent16,
  IconInstance16,
  IconText16,
  IconGroup16,
  IconPen16,
  IconAutoLayoutVerticalLeft16,
  IconAutoLayoutVerticalRight16,
  IconAutoLayoutHorizontalTop16,
  IconAutoLayoutHorizontalCenter16,
  IconAutoLayoutHorizontalBottom16,
  IconAutoLayoutVerticalCenter16
} from '@create-figma-plugin/ui';
import { emit } from '@create-figma-plugin/utilities';
import { LintIssue, LintIssueType, GroupedIssues } from '../types/lint';
import { useState, useEffect } from 'preact/hooks';

// Numbered circle component for issue count
function NumberedCircle({ count }: { count: number }) {
  const circleStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '14px',
    height: '14px',
    borderRadius: '3px',
    border: '1px solid var(--figma-color-border)',
    color: 'var(--figma-color-text-danger)',
    fontSize: '8px',
    fontWeight: '500',
    lineHeight: '1'
  };

  return (
    <div style={circleStyle}>
      {count}
    </div>
  );
}

// Helper function to get appropriate icon for issue type
function getIssueIcon(type: LintIssueType, issue?: LintIssue, issueCount?: number) {
  // For "All issues" view, use the numbered circle
  if (issueCount !== undefined) {
    return <NumberedCircle count={issueCount} />;
  }

  // Create a properly sized wrapper for 32px icons
  // Set exact dimensions to match what the Layer component expects
  const iconStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '16px',       // Back to 16px width to match Layer component
    height: '16px',      // Back to 16px height to match Layer component
    overflow: 'hidden',
    position: 'relative' // Added for absolute positioning of inner content
  };

  // Scale the icons to fit but larger than before
  // Use absolute positioning to allow overflow while maintaining alignment
  const iconInnerStyle = {
    transform: 'scale(0.85)',  
    position: 'absolute',
    top: '-8px',          // Adjusted for better vertical alignment
    left: '-8px',         // Adjusted for better horizontal centering
    display: 'flex',
    width: '32px',       // Original icon width
    height: '32px'       // Original icon height
  };

  // Wrap an icon with proper sizing
  const wrapIcon = (Icon: any) => (
    <div style={iconStyle}>
      <div style={iconInnerStyle}>
        {Icon}
      </div>
    </div>
  );

  // For wrong library issues, determine the correct icon based on message
  if (issue?.message && issue.message.startsWith('Wrong library/')) {
    // Extract the underlying type from message format "Wrong library/[Type]"
    const messageParts = issue.message.split('/');
    if (messageParts.length >= 2) {
      const typeText = messageParts[1].toLowerCase();
      
      if (typeText.includes('text')) {
        return wrapIcon(<IconMissingFont24 />);
      } else if (typeText.includes('stroke')) {
        return wrapIcon(<IconStrokeWeight24 />);
      } else if (typeText.includes('radius')) {
        return wrapIcon(<IconCorners24 />);
      } else if (typeText.includes('gap')) {
        return wrapIcon(<IconSpacingVerticalSmall24 />);
      } else if (typeText.includes('padding')) {
        return wrapIcon(<IconSpacingHorizontalSmall24 />);
      } else if (typeText.includes('fill') || typeText.includes('color')) {
        return wrapIcon(<IconEyedropper24 />);
      }
    }
  }

  // Standard issue types
  switch(type) {
    case 'fill':
      return wrapIcon(<IconEyedropper24 />);
    case 'stroke':
      return wrapIcon(<IconStrokeWeight24 />);
    case 'text':
      return wrapIcon(<IconMissingFont24 />);
    case 'radius':
      return wrapIcon(<IconCorners24 />);
    case 'gap':
      return wrapIcon(<IconSpacingVerticalSmall24 />);
    case 'padding':
      return wrapIcon(<IconSpacingHorizontalSmall24 />);
    default:
      return wrapIcon(<IconEyedropper24 />);
  }
}

// Helper function to get issue type text
function getIssueTypeText(type: LintIssueType, issue?: LintIssue) {
  // For wrong library issues, use the message field if available
  if (issue?.message && issue.message.startsWith('Wrong library/')) {
    return issue.message;
  }
  
  // Default type text for standard issue types
  switch(type) {
    case 'fill':
      return 'Color Fill';
    case 'stroke':
      return 'Color Stroke';
    case 'text':
      return 'Text Style';
    case 'radius':
      return 'Radius';
    case 'gap':
      return 'Gap';
    case 'padding':
      return 'Padding';
    default:
      return 'Unknown';
  }
}

// Define the filter options
type FilterOption = 'all' | LintIssueType;

interface FilterPillProps {
  label: string;
  isSelected: boolean;
  onClick: () => void;
}

// Custom filter pill component that matches Figma's native filter UI
function FilterPill({ label, isSelected, onClick }: FilterPillProps) {
  // Define styles directly as objects to ensure they're applied correctly
  const selectedStyle = {
    backgroundColor: '#18a0fb', // Figma blue - hardcoded to ensure it works
    color: 'white',
    border: '1px solid #18a0fb',
  };
  
  const unselectedStyle = {
    backgroundColor: '#e5e5e5', // Light gray that matches the screenshot
    color: '#333333', // Dark gray for text
    border: '1px solid #e5e5e5',
  };
  
  const pillStyle = {
    padding: '3px 8px', // Reduced from 6px 12px to make pills smaller
    borderRadius: '12px', // Reduced from 16px
    fontSize: '10px', // Reduced from 11px to make text smaller
    lineHeight: '16px',
    cursor: 'pointer',
    fontWeight: '500',
    marginRight: '6px', // Reduced from 8px
    whiteSpace: 'nowrap' as const,
    flexShrink: 0 as const,
    display: 'inline-block',
    ...(isSelected ? selectedStyle : unselectedStyle)
  };
  
  return (
    <div 
      style={pillStyle}
      onClick={onClick}
    >
      {label}
    </div>
  );
}

const filterOptions = [
  { label: 'All issues', value: 'all' },
  { label: 'Color Fill', value: 'fill' },
  { label: 'Color Stroke', value: 'stroke' },
  { label: 'Text Style', value: 'text' },
  { label: 'Radius', value: 'radius' },
  { label: 'Gap', value: 'gap' },
  { label: 'Padding', value: 'padding' }
];

// Helper function to determine auto-layout icon
function getAutoLayoutIcon(issue: LintIssue): h.JSX.Element {
  // Safe access to node properties
  const layoutMode = issue.layoutMode || 'NONE';
  const layoutAlign = issue.layoutAlign || 'NONE';

  // Handle horizontal layouts
  if (layoutMode === 'HORIZONTAL') {
    switch (layoutAlign) {
      case 'MIN':
        return <IconAutoLayoutHorizontalTop16 />;
      case 'CENTER':
        return <IconAutoLayoutHorizontalCenter16 />;
      case 'MAX':
        return <IconAutoLayoutHorizontalBottom16 />;
      default:
        return <IconAutoLayoutHorizontalCenter16 />;
    }
  }

  // Handle vertical layouts
  if (layoutMode === 'VERTICAL') {
    switch (layoutAlign) {
      case 'MIN':
        return <IconAutoLayoutVerticalLeft16 />;
      case 'CENTER':
        return <IconAutoLayoutVerticalCenter16 />;
      case 'MAX':
        return <IconAutoLayoutVerticalRight16 />;
      default:
        // For other cases, use center alignment icon as default
        return <IconAutoLayoutVerticalCenter16 />;
    }
  }

  // Fallback to horizontal center for any other cases
  return <IconAutoLayoutHorizontalCenter16 />;
}

function getLayerTypeIcon(issue: LintIssue) {
  // Safe access to potentially undefined properties
  const nodeType = issue?.nodeType || 'FRAME';
  const isAutoLayout = issue?.isAutoLayout || false;

  // Return appropriate icon based on node type
  switch (nodeType) {
    case 'COMPONENT':
      return <IconComponent16 />;
    case 'INSTANCE':
      return <IconInstance16 />;
    case 'TEXT':
      return <IconText16 />;
    case 'GROUP':
      return <IconGroup16 />;
    case 'VECTOR':
    case 'RECTANGLE':
    case 'ELLIPSE':
    case 'POLYGON':
    case 'STAR':
    case 'LINE':
      return <IconPen16 />;
    case 'FRAME':
      // For frames, check if it has auto-layout
      return isAutoLayout ? getAutoLayoutIcon(issue) : <IconFrame16 />;
    default:
      return <IconFrame16 />;
  }
}

// Layer type priority for sorting
const layerTypePriority: Record<string, number> = {
  'FRAME': 1,
  'COMPONENT': 2,
  'INSTANCE': 3,
  'TEXT': 4,
  'GROUP': 5,
  'VECTOR': 6,
  'RECTANGLE': 6,
  'ELLIPSE': 6,
  'POLYGON': 6,
  'STAR': 6,
  'LINE': 6,
  'default': 999
};

// Helper function to get priority for a layer type
function getLayerTypePriority(nodeType: string): number {
  return layerTypePriority[nodeType] || layerTypePriority.default;
}

// Sort function for grouped issues
function sortByLayerType(a: [string, LintIssue[]], b: [string, LintIssue[]]): number {
  const aIssue = a[1][0];
  const bIssue = b[1][0];
  const aPriority = getLayerTypePriority(aIssue.nodeType || 'default');
  const bPriority = getLayerTypePriority(bIssue.nodeType || 'default');
  return aPriority - bPriority;
}

export function ErrorDisplay({ issues }: { issues: LintIssue[] }) {
  const [selectedFilter, setSelectedFilter] = useState<FilterOption>('all');
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  
  // Debug logging for incoming issues
  console.log('[ErrorDisplay] Issues Summary:', {
    totalCount: issues.length,
    byType: issues.reduce((acc, issue) => {
      acc[issue.type] = (acc[issue.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  });
  
  // Deduplicate ALL issues first (for proper counts)
  const allDeduplicatedIssues = issues.reduce((acc, issue) => {
    const key = issue.type === 'radius' 
      ? `${issue.nodeId}-${issue.type}-${issue.details || ''}-${issue.message || ''}`
      : `${issue.nodeId}-${issue.type}${issue.details ? `-${issue.details}` : ''}`;
      
    if (!acc[key]) {
      acc[key] = issue;
    }
    return acc;
  }, {} as Record<string, LintIssue>);
  
  // Convert to array
  const allUniqueIssues = Object.values(allDeduplicatedIssues);
  
  // Count issues by type AFTER deduplication
  const counts = allUniqueIssues.reduce((acc, issue) => {
    acc[issue.type] = (acc[issue.type] || 0) + 1;
    return acc;
  }, {} as Record<LintIssueType, number>);
  
  // Log only when filter changes
  useEffect(() => {
    console.log('[ErrorDisplay] Filter changed:', {
      filter: selectedFilter,
      totalIssues: allUniqueIssues.length,
      visibleIssues: selectedFilter === 'all' 
        ? allUniqueIssues.length 
        : counts[selectedFilter as LintIssueType] || 0
    });
  }, [selectedFilter, allUniqueIssues.length]);
  
  // Filter issues based on selected filter
  const filteredIssues = selectedFilter === 'all' 
    ? allUniqueIssues 
    : allUniqueIssues.filter(issue => {
        // Special handling for radius issues to ensure they're included when appropriate
        if (issue.type === 'radius') {
          return selectedFilter === 'radius';
        }
        return issue.type === selectedFilter;
      });
  
  // Group issues by layer name and nodeId
  const groupedIssues: GroupedIssues = filteredIssues.reduce((acc, issue) => {
    const key = `${issue.nodeId}-${issue.nodeName}`;
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(issue);
    return acc;
  }, {} as GroupedIssues);

  // Debug logging of filtered issues
  console.log('[ErrorDisplay] Filtered issues:', {
    selectedFilter,
    filteredCount: filteredIssues.length,
    radiusCount: filteredIssues.filter(issue => issue.type === 'radius').length,
    radiusIssues: filteredIssues.filter(issue => issue.type === 'radius')
  });

  const handleLayerToggle = (layerId: string, checked: boolean) => {
    if (checked) {
      setSelectedLayerId(layerId);
      emit('SELECT_NODE', layerId);
    } else {
      setSelectedLayerId(null);
    }
  };

  // Helper function to format issue descriptions
  const formatIssueDescriptions = (issues: LintIssue[]) => {
    // Return empty string if a specific filter is selected (not 'all')
    if (selectedFilter !== 'all') {
      return '';
    }
    const descriptions = issues.map(issue => getIssueTypeText(issue.type, issue));
    return descriptions.join(' • ');
  };

  return (
    <Stack space="extraSmall" style={{ 
      width: '100%',
      paddingTop: 'var(--space-small)'
    }}>
      <div
        className="hide-scrollbar"
        style={{
          display: 'flex',
          overflowX: 'auto',
          paddingBottom: '2px',
          paddingLeft: 'var(--space-medium)',
          paddingRight: 'var(--space-medium)',
          msOverflowStyle: 'none',  /* IE and Edge */
          scrollbarWidth: 'none'    /* Firefox */
        }}
      >
        {filterOptions.map(option => (
          <FilterPill
            key={option.value}
            label={option.value === 'all' 
              ? `All issues (${allUniqueIssues.length})`
              : `${option.label} (${counts[option.value as LintIssueType] || 0})`}
            isSelected={selectedFilter === option.value}
            onClick={() => setSelectedFilter(option.value as FilterOption)}
          />
        ))}
      </div>
      
      <div style={{ marginTop: '0px' }}>
        {Object.entries(groupedIssues)
          .sort(sortByLayerType)
          .map(([layerKey, layerIssues]) => {
            const [layerId, layerName] = layerKey.split('-');
            const isSelected = selectedLayerId === layerId;
            
            return (
              <div key={layerKey} style={{
                paddingLeft: 'var(--space-medium)',
                paddingRight: 'var(--space-medium)',
                position: 'relative'
              }}>
                <Layer
                  icon={getLayerTypeIcon(layerIssues[0])}
                  value={isSelected}
                  onChange={(event) => handleLayerToggle(layerId, event.currentTarget.checked)}
                  description={formatIssueDescriptions(layerIssues)}
                >
                  {layerName.length > 32 ? `${layerName.slice(0, 29)}...` : layerName}
                </Layer>
                {selectedFilter === 'all' && layerIssues.length > 0 && (
                  <div style={{
                    position: 'absolute',
                    right: 'calc(var(--space-medium) + var(--space-extra-small))',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    zIndex: 1
                  }}>
                    <NumberedCircle count={layerIssues.length} />
                  </div>
                )}
              </div>
            );
          })}
      </div>
      
      {filteredIssues.length === 0 && (
        <div style={{
          padding: '8px',
          textAlign: 'center'
        }}>
          <Text style={{ color: 'var(--figma-color-text-secondary)' }}>
            No issues found for this filter
          </Text>
        </div>
      )}
    </Stack>
  );
}
