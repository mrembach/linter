import { LintIssue, RadiusAuditEntry, RadiusAuditLog } from '../types/lint';

// Debug logging
function log(message: string, data?: any) {
  console.log(`[Linter] ${message}`, data ? JSON.stringify(data, null, 2) : '');
}

interface SolidFill {
  type: 'SOLID';
  color: {
    r: number;
    g: number;
    b: number;
  };
}

interface SolidStroke {
  type: 'SOLID';
  color: {
    r: number;
    g: number;
    b: number;
  };
}

// Helper to check if a node has auto-layout (is a frame or component with layoutMode set)
function hasAutoLayout(node: BaseNode): boolean {
  if ('layoutMode' in node) {
    return Boolean((node as FrameNode | ComponentNode | InstanceNode).layoutMode !== 'NONE');
  }
  return false;
}

// Helper to check if a node has corner radius properties
function hasCornerRadius(node: BaseNode): boolean {
  return 'cornerRadius' in node;
}

// Helper to get auto-layout information
function getAutoLayoutInfo(node: BaseNode) {
  if ('layoutMode' in node) {
    const layoutNode = node as FrameNode | ComponentNode | InstanceNode;
    return {
      isAutoLayout: layoutNode.layoutMode !== 'NONE',
      layoutMode: layoutNode.layoutMode,
      layoutAlign: layoutNode.primaryAxisAlignItems,
      layoutWrap: layoutNode.layoutWrap ? 'WRAP' as const : 'NO_WRAP' as const
    };
  }
  return {
    isAutoLayout: false,
    layoutMode: 'NONE' as const,
    layoutAlign: 'NONE' as const,
    layoutWrap: 'NO_WRAP' as const
  };
}

function createFillIssue(node: SceneNode, fill: SolidFill): LintIssue {
  const autoLayoutInfo = getAutoLayoutInfo(node);
  log('Creating fill issue', {
    nodeName: node.name,
    nodeType: node.type,
    fillColor: fill.color,
    ...autoLayoutInfo
  });
  return {
    nodeId: node.id,
    nodeName: node.name,
    type: 'fill',
    message: 'Fill not linked to a style or variable',
    nodeType: node.type,
    ...autoLayoutInfo
  };
}

function createStrokeIssue(node: SceneNode, stroke: SolidStroke): LintIssue {
  const autoLayoutInfo = getAutoLayoutInfo(node);
  log('Creating stroke issue', {
    nodeName: node.name,
    nodeType: node.type,
    strokeColor: stroke.color,
    ...autoLayoutInfo
  });
  return {
    nodeId: node.id,
    nodeName: node.name,
    type: 'stroke',
    message: 'Stroke not linked to a style or variable',
    nodeType: node.type,
    ...autoLayoutInfo
  };
}

function createTextIssue(node: TextNode): LintIssue {
  const autoLayoutInfo = getAutoLayoutInfo(node);
  log('Creating text issue', {
    nodeName: node.name,
    nodeType: node.type,
    ...autoLayoutInfo
  });
  return {
    nodeId: node.id,
    nodeName: node.name,
    type: 'text',
    message: 'Text not linked to a style or variable',
    nodeType: node.type,
    ...autoLayoutInfo
  };
}

function createRadiusIssue(node: SceneNode, radiusDetails: string): LintIssue {
  const autoLayoutInfo = getAutoLayoutInfo(node);
  // Get detailed corner information for debugging
  let debugInfo = '';
  if ('cornerRadius' in node) {
    const cornerNode = node as any; // Use any to access all potential properties
    
    // Add cornerRadius property - handle mixed values
    const cornerRadius = cornerNode.cornerRadius;
    debugInfo += `cornerRadius: ${cornerRadius === figma.mixed ? 'mixed' : cornerRadius}\n`;
    
    // Add individual corner values if they exist
    if ('topLeftRadius' in cornerNode) {
      const topLeft = cornerNode.topLeftRadius;
      debugInfo += `topLeftRadius: ${topLeft === figma.mixed ? 'mixed' : topLeft}, `;
    }
    if ('topRightRadius' in cornerNode) {
      const topRight = cornerNode.topRightRadius;
      debugInfo += `topRightRadius: ${topRight === figma.mixed ? 'mixed' : topRight}, `;
    }
    if ('bottomLeftRadius' in cornerNode) {
      const bottomLeft = cornerNode.bottomLeftRadius;
      debugInfo += `bottomLeftRadius: ${bottomLeft === figma.mixed ? 'mixed' : bottomLeft}, `;
    }
    if ('bottomRightRadius' in cornerNode) {
      const bottomRight = cornerNode.bottomRightRadius;
      debugInfo += `bottomRightRadius: ${bottomRight === figma.mixed ? 'mixed' : bottomRight}\n`;
    }
    
    // Add variable binding information
    if ('boundVariables' in cornerNode) {
      debugInfo += 'Variable Bindings: ';
      try {
        const bindings = cornerNode.boundVariables || {};
        
        // Check main cornerRadius binding
        if (bindings.cornerRadius) {
          debugInfo += `cornerRadius bound to ${JSON.stringify(bindings.cornerRadius)}, `;
        }
        
        // Check individual corner bindings
        if (bindings.topLeftRadius) {
          debugInfo += `topLeftRadius bound to ${JSON.stringify(bindings.topLeftRadius)}, `;
        }
        if (bindings.topRightRadius) {
          debugInfo += `topRightRadius bound to ${JSON.stringify(bindings.topRightRadius)}, `;
        }
        if (bindings.bottomLeftRadius) {
          debugInfo += `bottomLeftRadius bound to ${JSON.stringify(bindings.bottomLeftRadius)}, `;
        }
        if (bindings.bottomRightRadius) {
          debugInfo += `bottomRightRadius bound to ${JSON.stringify(bindings.bottomRightRadius)}`;
        }
      } catch (e) {
        debugInfo += `Error accessing bindings: ${e}`;
      }
    } else {
      debugInfo += 'No boundVariables object found';
    }
  }
  
  log('Creating radius issue', {
    nodeName: node.name,
    nodeType: node.type,
    radiusDetails,
    debugInfo
  });
  
  return {
    nodeId: node.id,
    nodeName: node.name,
    type: 'radius',
    message: 'Corner radius not linked to a variable',
    details: radiusDetails,
    debug: debugInfo,
    nodeType: node.type,
    ...autoLayoutInfo
  };
}

function createGapIssue(node: SceneNode): LintIssue {
  const autoLayoutInfo = getAutoLayoutInfo(node);
  log('Creating gap issue', {
    nodeName: node.name,
    nodeType: node.type,
    ...autoLayoutInfo
  });
  return {
    nodeId: node.id,
    nodeName: node.name,
    type: 'gap',
    message: 'Item spacing not linked to a variable',
    nodeType: node.type,
    ...autoLayoutInfo
  };
}

function createPaddingIssue(node: SceneNode, paddingDetails: string): LintIssue {
  const autoLayoutInfo = getAutoLayoutInfo(node);
  log('Creating padding issue', {
    nodeName: node.name,
    nodeType: node.type,
    paddingDetails,
    ...autoLayoutInfo
  });
  return {
    nodeId: node.id,
    nodeName: node.name,
    type: 'padding',
    message: 'Padding not linked to a variable',
    details: paddingDetails,
    nodeType: node.type,
    ...autoLayoutInfo
  };
}

function hasVariableBinding(node: BaseNode, property: string): boolean {
  if ('boundVariables' in node) {
    const bindings = (node as any).boundVariables;
    
    // Log the entire bindings object for debugging
    log('Checking variable binding', {
      nodeName: node.name,
      nodeType: node.type,
      property,
      bindings: JSON.stringify(bindings),
      propertyExists: bindings && bindings[property] ? true : false,
      isItemSpacing: property === 'itemSpacing',
      boundVariablesKeys: bindings ? Object.keys(bindings) : []
    });
    
    if (bindings && bindings[property]) {
      log('Found variable binding:', {
        nodeName: node.name,
        property,
        binding: bindings[property]
      });
      return true;
    }
  }
  return false;
}

function createWrongLibraryIssue(
  node: SceneNode, 
  itemType: 'fill' | 'stroke' | 'text' | 'radius' | 'gap' | 'padding',
  sourceLibraryId: string,
  sourceLibraryName: string
): LintIssue {
  const autoLayoutInfo = getAutoLayoutInfo(node);
  log('Creating wrong library issue', {
    nodeName: node.name,
    nodeType: node.type,
    itemType,
    sourceLibraryId,
    sourceLibraryName
  });
  
  // Get the proper type text using the same function as regular issues
  let typeText: string;
  switch(itemType) {
    case 'fill':
      typeText = 'Color Fill';
      break;
    case 'stroke':
      typeText = 'Color Stroke';
      break;
    case 'text':
      typeText = 'Text Style';
      break;
    case 'radius':
      typeText = 'Radius';
      break;
    case 'gap':
      typeText = 'Gap';
      break;
    case 'padding':
      typeText = 'Padding';
      break;
    default:
      typeText = itemType;
  }
  
  return {
    nodeId: node.id,
    nodeName: node.name,
    type: itemType,
    message: `Wrong library/${typeText}`,
    sourceLibraryId,
    sourceLibraryName,
    nodeType: node.type,
    ...autoLayoutInfo
  };
}

function getStyleLibraryInfo(styleId: string) {
  if (!styleId) return null;
  
  // Log the raw style ID for debugging
  log('Analyzing style ID', { styleId });
  
  // Handle different style ID formats
  // Text styles: "LS:1234567890,1234567890"
  // Fill/stroke styles: "S:1234567890,1234567890"
  // Note: Local styles don't have a library ID component
  try {
    // Step 1: Check if this is a local style (doesn't have a library ID)
    if (!styleId.includes(',')) {
      log('Style appears to be local (no comma separator found)', { styleId });
      return { libraryId: 'local', styleKeyId: styleId };
    }
    
    // Step 2: Remove the style type prefix
    const cleanId = styleId.replace(/^[a-zA-Z]+:/, '');
    log('Cleaned style ID', { cleanId });
    
    // Step 3: Split by comma to get library ID and style key
    const parts = cleanId.split(',');
    log('Style ID parts', { parts });
    
    if (parts.length < 2) {
      log('Invalid style ID format (not enough parts after split)', { styleId });
      return null;
    }
    
    const result = {
      libraryId: parts[0],
      styleKeyId: parts[1]
    };
    
    log('Extracted library info', result);
    return result;
  } catch (error) {
    log('Error parsing style ID', { styleId, error });
    return null;
  }
}

// Helper function to check if a style matches any exception
function matchesExceptions(styleName: string, exceptions: string[]): boolean {
  if (!exceptions.length) return false;
  if (!styleName || styleName.trim() === '') return false; // Skip empty style names
  
  // Log for debugging
  log('Checking if style matches exceptions', { styleName, exceptions });
  
  // Loop through each exception and do a proper check
  const matches = exceptions.some(exception => {
    const trimmedException = exception.trim();
    if (trimmedException === '') return false;
    
    // Check for wildcard pattern (ends with *)
    if (trimmedException.endsWith('*')) {
      const prefix = trimmedException.slice(0, -1); // Remove the * character
      return styleName.toLowerCase().startsWith(prefix.toLowerCase());
    }
    
    // Standard matching (contains)
    return styleName.toLowerCase().includes(trimmedException.toLowerCase());
  });
  
  // Log result
  if (matches) {
    log('Style matches exception - will be excluded', { styleName });
  }
  
  return matches;
}

// Exporting the radius audit log for global access
export const radiusAuditLog: RadiusAuditLog = { entries: [] };

// Helper function to clear the radius audit log
export function clearRadiusAuditLog() {
  radiusAuditLog.entries = [];
}

// Helper function to convert mixed values or numbers to a string representation
function convertToString(value: number | typeof figma.mixed | string | undefined): string {
  if (value === figma.mixed) return 'mixed';
  if (value === undefined) return 'undefined';
  return value.toString();
}

function addRadiusAuditEntry(
  node: SceneNode,
  cornerRadius: number | typeof figma.mixed | string,
  topLeftRadius?: number | typeof figma.mixed,
  topRightRadius?: number | typeof figma.mixed,
  bottomLeftRadius?: number | typeof figma.mixed,
  bottomRightRadius?: number | typeof figma.mixed,
  isIssue: boolean = false,
  decisionPath: string = '',
  bindingDetails: string = '',
  inspectionDetails: string = ''
) {
  const entry: RadiusAuditEntry = {
    nodeId: node.id,
    nodeName: node.name,
    nodeType: node.type,
    cornerRadius: convertToString(cornerRadius),
    isIssue,
    decisionPath,
    bindingDetails,
    inspectionDetails
  };

  // Add corner radii if they exist
  if (topLeftRadius !== undefined) {
    entry.topLeftRadius = convertToString(topLeftRadius);
  }
  if (topRightRadius !== undefined) {
    entry.topRightRadius = convertToString(topRightRadius);
  }
  if (bottomLeftRadius !== undefined) {
    entry.bottomLeftRadius = convertToString(bottomLeftRadius);
  }
  if (bottomRightRadius !== undefined) {
    entry.bottomRightRadius = convertToString(bottomRightRadius);
  }

  // Log the entry being added
  log('RADIUS DEBUG - Adding audit entry:', {
    nodeName: node.name,
    nodeId: node.id,
    isIssue,
    decisionPath,
    cornerRadius: entry.cornerRadius,
    topLeftRadius: entry.topLeftRadius,
    topRightRadius: entry.topRightRadius,
    bottomLeftRadius: entry.bottomLeftRadius,
    bottomRightRadius: entry.bottomRightRadius
  });

  radiusAuditLog.entries.push(entry);
  return entry;
}

export function checkLibrarySources(
  node: BaseNode, 
  selectedLibraryId: string,
  libraryMap: Map<string, { name: string }>,
  exceptions: string[] = []
): LintIssue[] {
  const issues: LintIssue[] = [];
  const sceneNode = node as SceneNode;
  
  // The locked/visible checks are now handled in isLintableNode in main.ts
  // to respect the global exclude settings
  
  // Skip if node name matches any exception
  if (exceptions.length > 0 && exceptions.some(exception => {
    const trimmedException = exception.trim();
    if (trimmedException === '') return false;
    
    // Check for wildcard pattern (ends with *)
    if (trimmedException.endsWith('*')) {
      const prefix = trimmedException.slice(0, -1); // Remove the * character
      return node.name.toLowerCase().startsWith(prefix.toLowerCase());
    }
    
    // Standard matching (contains)
    return node.name.toLowerCase().includes(trimmedException.toLowerCase());
  })) {
    log('Skipping node in exceptions list', { nodeName: node.name });
    return issues;
  }
  
  log('Checking library sources', {
    nodeName: node.name,
    nodeType: node.type,
    selectedLibraryId,
    exceptionsCount: exceptions.length
  });
  
  try {
    // Check fill style
    if ('fillStyleId' in node && node.fillStyleId) {
      const fillStyleId = typeof node.fillStyleId === 'symbol' 
        ? null // Skip mixed styles
        : String(node.fillStyleId);
      
      if (fillStyleId) {
        const styleInfo = getStyleLibraryInfo(fillStyleId);
        
        // Get style name from node's parent library for exception checking
        let styleName = '';
        try {
          // Try to get style name for checking against exceptions
          const style = figma.getStyleById(fillStyleId);
          if (style) {
            styleName = style.name;
            log('Found style name', { styleName, nodeId: node.id });
          }
        } catch (e) {
          log('Error getting style name', { error: e });
        }
        
        // Check if style name is in exceptions list
        if (styleName && matchesExceptions(styleName, exceptions)) {
          log('Skipping excepted fill style', { styleName, nodeId: node.id });
          // Skip this style - it's in the exceptions list
        }
        // Special handling for local styles
        else if (styleInfo?.libraryId === 'local') {
          log('Found local fill style', { nodeId: node.id, nodeName: node.name });
          // Don't flag local styles as wrong library
        }
        // Check if from wrong library
        else if (styleInfo && styleInfo.libraryId !== selectedLibraryId) {
          log('Found fill style from wrong library', { 
            nodeId: node.id, 
            nodeName: node.name, 
            styleName,
            styleLibraryId: styleInfo.libraryId,
            selectedLibraryId
          });
          
          const libraryName = libraryMap.get(styleInfo.libraryId)?.name || 'Unknown library';
          issues.push(createWrongLibraryIssue(
            sceneNode,
            'fill',
            styleInfo.libraryId,
            libraryName
          ));
        } else {
          log('Fill style from correct library', { nodeId: node.id, nodeName: node.name });
        }
      }
    }
    
    // Check stroke style - add similar logic for style name exceptions
    if ('strokeStyleId' in node && node.strokeStyleId) {
      const strokeStyleId = typeof node.strokeStyleId === 'symbol' 
        ? null // Skip mixed styles
        : String(node.strokeStyleId);
      
      if (strokeStyleId) {
        const styleInfo = getStyleLibraryInfo(strokeStyleId);
        
        // Get style name for exception checking
        let styleName = '';
        try {
          const style = figma.getStyleById(strokeStyleId);
          if (style) {
            styleName = style.name;
            log('Found stroke style name', { styleName, nodeId: node.id });
          }
        } catch (e) {
          log('Error getting stroke style name', { error: e });
        }
        
        // Check if style name is in exceptions list
        if (styleName && matchesExceptions(styleName, exceptions)) {
          log('Skipping excepted stroke style', { styleName, nodeId: node.id });
          // Skip this style - it's in the exceptions list
        }
        // Special handling for local styles
        else if (styleInfo?.libraryId === 'local') {
          log('Found local stroke style', { nodeId: node.id, nodeName: node.name });
          // Don't flag local styles as wrong library
        }
        // Check if from wrong library
        else if (styleInfo && styleInfo.libraryId !== selectedLibraryId) {
          log('Found stroke style from wrong library', { 
            nodeId: node.id, 
            nodeName: node.name, 
            styleName,
            styleLibraryId: styleInfo.libraryId, 
            selectedLibraryId
          });
          
          const libraryName = libraryMap.get(styleInfo.libraryId)?.name || 'Unknown library';
          issues.push(createWrongLibraryIssue(
            sceneNode,
            'stroke',
            styleInfo.libraryId,
            libraryName
          ));
        } else {
          log('Stroke style from correct library', { nodeId: node.id, nodeName: node.name });
        }
      }
    }
    
    // Check text style - add similar logic for style name exceptions
    if (node.type === 'TEXT' && (node as TextNode).textStyleId) {
      const textNode = node as TextNode;
      const textStyleId = typeof textNode.textStyleId === 'symbol' 
        ? null // Skip mixed styles
        : String(textNode.textStyleId);
      
      if (textStyleId) {
        const styleInfo = getStyleLibraryInfo(textStyleId);
        
        // Get style name for exception checking
        let styleName = '';
        try {
          const style = figma.getStyleById(textStyleId);
          if (style) {
            styleName = style.name;
            log('Found text style name', { styleName, nodeId: node.id });
          }
        } catch (e) {
          log('Error getting text style name', { error: e });
        }
        
        // Check if style name is in exceptions list
        if (styleName && matchesExceptions(styleName, exceptions)) {
          log('Skipping excepted text style', { styleName, nodeId: node.id });
          // Skip this style - it's in the exceptions list
        }
        // Special handling for local styles
        else if (styleInfo?.libraryId === 'local') {
          log('Found local text style', { nodeId: node.id, nodeName: node.name });
          // Don't flag local styles as wrong library
        }
        // Check if from wrong library
        else if (styleInfo && styleInfo.libraryId !== selectedLibraryId) {
          log('Found text style from wrong library', { 
            nodeId: node.id, 
            nodeName: node.name, 
            styleName,
            styleLibraryId: styleInfo.libraryId, 
            selectedLibraryId 
          });
          
          const libraryName = libraryMap.get(styleInfo.libraryId)?.name || 'Unknown library';
          issues.push(createWrongLibraryIssue(
            sceneNode,
            'text',
            styleInfo.libraryId,
            libraryName
          ));
        } else {
          log('Text style from correct library', { nodeId: node.id, nodeName: node.name });
        }
      }
    }
    
    // Check effect style - add similar logic for style name exceptions
    if ('effectStyleId' in node && node.effectStyleId) {
      const effectStyleId = typeof node.effectStyleId === 'symbol' 
        ? null // Skip mixed styles
        : String(node.effectStyleId);
      
      if (effectStyleId) {
        const styleInfo = getStyleLibraryInfo(effectStyleId);
        
        // Get style name for exception checking
        let styleName = '';
        try {
          const style = figma.getStyleById(effectStyleId);
          if (style) {
            styleName = style.name;
            log('Found effect style name', { styleName, nodeId: node.id });
          }
        } catch (e) {
          log('Error getting effect style name', { error: e });
        }
        
        // Check if style name is in exceptions list
        if (styleName && matchesExceptions(styleName, exceptions)) {
          log('Skipping excepted effect style', { styleName, nodeId: node.id });
          // Skip this style - it's in the exceptions list
        }
        // Special handling for local styles
        else if (styleInfo?.libraryId === 'local') {
          log('Found local effect style', { nodeId: node.id, nodeName: node.name });
          // Don't flag local styles as wrong library
        }
        // Check if from wrong library
        else if (styleInfo && styleInfo.libraryId !== selectedLibraryId) {
          log('Found effect style from wrong library', { 
            nodeId: node.id, 
            nodeName: node.name, 
            styleName,
            styleLibraryId: styleInfo.libraryId, 
            selectedLibraryId 
          });
          
          const libraryName = libraryMap.get(styleInfo.libraryId)?.name || 'Unknown library';
          issues.push(createWrongLibraryIssue(
            sceneNode,
            'fill', // Use 'fill' type for effects since they're most similar visually
            styleInfo.libraryId,
            libraryName
          ));
        } else {
          log('Effect style from correct library', { nodeId: node.id, nodeName: node.name });
        }
      }
    }
    
    // Check variables
    if ('boundVariables' in node) {
      const boundVars = (node as any).boundVariables;
      if (boundVars) {
        // For each property that has a variable binding
        Object.entries(boundVars).forEach(([propName, binding]: [string, any]) => {
          if (binding && binding.id) {
            const varId = binding.id;
            
            try {
              // Get variable collection info
              const variable = figma.variables.getVariableById(varId);
              if (variable) {
                // Access the collection of the variable to get the library ID
                const collection = figma.variables.getVariableCollectionById(variable.variableCollectionId);
                // Use type assertion to access libraryId which might not be in TypeScript definitions
                const collectionWithLibrary = collection as any;
                
                if (collection && collectionWithLibrary.libraryId && 
                    collectionWithLibrary.libraryId !== selectedLibraryId) {
                  let libraryName = libraryMap.get(collectionWithLibrary.libraryId)?.name || 'Unknown library';
                  
                  // Determine issue type based on property name
                  let issueType: 'fill' | 'stroke' | 'text' | 'radius' | 'gap' | 'padding' = 'fill';
                  if (propName.includes('radius')) issueType = 'radius';
                  else if (propName.includes('gap') || propName.includes('itemSpacing')) issueType = 'gap';
                  else if (propName.includes('padding')) issueType = 'padding';
                  else if (propName.includes('stroke')) issueType = 'stroke';
                  else if (propName.includes('text') || propName.includes('font')) issueType = 'text';
                  
                  issues.push(createWrongLibraryIssue(
                    sceneNode,
                    issueType,
                    collectionWithLibrary.libraryId,
                    libraryName
                  ));
                }
              }
            } catch (error) {
              log('Error checking variable', { varId, error });
            }
          }
        });
      }
    }
  } catch (error) {
    log('Error checking library sources', { 
      nodeId: node.id, 
      nodeName: node.name, 
      error: error instanceof Error ? error.message : String(error) 
    });
  }
  
  return issues;
}

export function checkDetachedStyles(node: BaseNode): LintIssue[] {
  const issues: LintIssue[] = [];
  const sceneNode = node as SceneNode;
  
  log('Checking node for detached styles:', {
    id: node.id,
    type: node.type,
    name: node.name,
    locked: sceneNode.locked,
    visible: sceneNode.visible,
    hasFills: 'fills' in node,
    hasStrokes: 'strokes' in node,
    isText: node.type === 'TEXT',
    hasAutoLayout: hasAutoLayout(node),
    hasCornerRadius: 'cornerRadius' in node
  });
  
  // Skip if node is locked or not visible
  if (sceneNode.locked || !sceneNode.visible) {
    log('Skipping node - locked or not visible');
    return issues;
  }
  
  try {
    // Check fills
    if ('fills' in node) {
      const fills = (node as any).fills;
      const hasFillStyle = Boolean((node as any).fillStyleId);
      const hasFillVariable = hasVariableBinding(node, 'fills');
      
      log('Checking fills:', {
        hasFills: Array.isArray(fills),
        fillCount: Array.isArray(fills) ? fills.length : 0,
        hasFillStyle,
        hasFillVariable
      });
      
      if (Array.isArray(fills) && fills.length > 0) {
        const fill = fills[0];
        if (fill && fill.type === 'SOLID' && !hasFillStyle && !hasFillVariable) {
          log('Found detached fill style (no style or variable)');
          issues.push(createFillIssue(node as SceneNode, fill as SolidFill));
        }
      }
    }
    
    // Check strokes
    if ('strokes' in node) {
      const strokes = (node as any).strokes;
      const hasStrokeStyle = Boolean((node as any).strokeStyleId);
      const hasStrokeVariable = hasVariableBinding(node, 'strokes');
      
      log('Checking strokes:', {
        hasStrokes: Array.isArray(strokes),
        strokeCount: Array.isArray(strokes) ? strokes.length : 0,
        hasStrokeStyle,
        hasStrokeVariable
      });
      
      if (Array.isArray(strokes) && strokes.length > 0) {
        const stroke = strokes[0];
        if (stroke && stroke.type === 'SOLID' && !hasStrokeStyle && !hasStrokeVariable) {
          log('Found detached stroke style (no style or variable)');
          issues.push(createStrokeIssue(node as SceneNode, stroke as SolidStroke));
        }
      }
    }
    
    // Check text styles
    if (node.type === 'TEXT') {
      const textNode = node as TextNode;
      const hasTextStyle = Boolean(textNode.textStyleId);
      const hasTextVariable = hasVariableBinding(node, 'characters') || 
                              hasVariableBinding(node, 'textStyleId') ||
                              hasVariableBinding(node, 'fontName') ||
                              hasVariableBinding(node, 'fontSize');
      
      log('Checking text styles:', {
        hasTextStyle,
        hasTextVariable
      });
      
      if (!hasTextStyle && !hasTextVariable) {
        log('Found detached text style (no style or variable)');
        issues.push(createTextIssue(textNode));
      }
    }

    // Check corner radius
    if ('cornerRadius' in node) {
      const cornerRadiusNode = node as RectangleNode | FrameNode | ComponentNode | InstanceNode;
      log('RADIUS DEBUG - Found node with cornerRadius:', {
        nodeName: node.name,
        nodeType: node.type,
        cornerRadius: cornerRadiusNode.cornerRadius,
        hasCornerRadiusProperty: 'cornerRadius' in cornerRadiusNode,
        cornerRadiusValue: cornerRadiusNode.cornerRadius,
        hasIndividualCorners: 'topLeftRadius' in cornerRadiusNode,
        nodeId: node.id
      });

      const cornerRadius = cornerRadiusNode.cornerRadius;
      const hasCornerRadiusVariable = hasVariableBinding(node, 'cornerRadius');
      
      log('RADIUS DEBUG - Initial check:', {
        nodeName: node.name,
        nodeType: node.type,
        cornerRadius,
        hasCornerRadiusVariable,
        nodeId: node.id,
        parentType: node.parent?.type,
        isVisible: (node as SceneNode).visible,
        isLocked: (node as SceneNode).locked
      });
      
      // Check for topLeftRadius, topRightRadius, bottomLeftRadius, bottomRightRadius
      const hasIndividualCornerRadii = 'topLeftRadius' in cornerRadiusNode && 
                                       'topRightRadius' in cornerRadiusNode &&
                                       'bottomLeftRadius' in cornerRadiusNode &&
                                       'bottomRightRadius' in cornerRadiusNode;
      
      // Get individual corner values if they exist
      const topLeft = hasIndividualCornerRadii ? (cornerRadiusNode as any).topLeftRadius : undefined;
      const topRight = hasIndividualCornerRadii ? (cornerRadiusNode as any).topRightRadius : undefined;
      const bottomLeft = hasIndividualCornerRadii ? (cornerRadiusNode as any).bottomLeftRadius : undefined;
      const bottomRight = hasIndividualCornerRadii ? (cornerRadiusNode as any).bottomRightRadius : undefined;
      
      // Check if all corners have the same value (uniform) when in individual mode
      const hasUniformIndividualCorners = hasIndividualCornerRadii &&
        topLeft === topRight && topRight === bottomLeft && bottomLeft === bottomRight && topLeft > 0;
      
      // Check if the cornerRadius value matches all the individual corner values
      const isIndividualModeConsistent = hasUniformIndividualCorners && topLeft === cornerRadius;
      
      // For instances, check if the main component uses variables
      let isInstanceWithInheritedVariables = false;
      if (node.type === 'INSTANCE') {
        try {
          const instance = node as InstanceNode;
          if (instance.mainComponent) {
            // Check if the main component has variable bindings for radius
            const mainComponentHasRadiusVariable = 
              hasVariableBinding(instance.mainComponent, 'cornerRadius') ||
              hasVariableBinding(instance.mainComponent, 'topLeftRadius') ||
              hasVariableBinding(instance.mainComponent, 'topRightRadius') ||
              hasVariableBinding(instance.mainComponent, 'bottomLeftRadius') ||
              hasVariableBinding(instance.mainComponent, 'bottomRightRadius');
              
            isInstanceWithInheritedVariables = mainComponentHasRadiusVariable;
            
            log('RADIUS DEBUG - Instance inheritance check:', {
              nodeName: node.name,
              nodeId: node.id,
              mainComponentName: instance.mainComponent.name,
              mainComponentId: instance.mainComponent.id,
              hasInheritedVariables: isInstanceWithInheritedVariables
            });
          }
        } catch (e) {
          log('Error checking instance main component', { error: e });
        }
      }
      
      // Check if the node is a direct component or instance, or inside a component
      const isComponentOrInstance = node.type === 'COMPONENT' || node.type === 'INSTANCE';
      
      // Check if node is inside a component instance (has component instance ancestors)
      const isInsideComponentInstance = isComponentOrInstance || 
        (node.parent && (node.parent.type === 'COMPONENT' || node.parent.type === 'INSTANCE'));
      
      // Look for various ways variables might be bound - but track individual corners separately now
      const hasTopLeftVariable = hasVariableBinding(node, 'topLeftRadius') || 
                                hasVariableBinding(node, 'topLeftRadius.value');
      const hasTopRightVariable = hasVariableBinding(node, 'topRightRadius') || 
                                 hasVariableBinding(node, 'topRightRadius.value');
      const hasBottomLeftVariable = hasVariableBinding(node, 'bottomLeftRadius') || 
                                     hasVariableBinding(node, 'bottomLeftRadius.value');
      const hasBottomRightVariable = hasVariableBinding(node, 'bottomRightRadius') || 
                                      hasVariableBinding(node, 'bottomRightRadius.value');

      const hasIndividualCornerVariables = 
        hasTopLeftVariable || hasTopRightVariable || hasBottomLeftVariable || hasBottomRightVariable;

      // Are all corners properly bound to variables?
      const allCornersHaveVariables = 
        (topLeft === 0 || topLeft === undefined || hasTopLeftVariable) &&
        (topRight === 0 || topRight === undefined || hasTopRightVariable) &&
        (bottomLeft === 0 || bottomLeft === undefined || hasBottomLeftVariable) &&
        (bottomRight === 0 || bottomRight === undefined || hasBottomRightVariable);

      // Expanded check for any radius binding
      const hasAnyRadiusBinding = hasCornerRadiusVariable || 
                                hasVariableBinding(node, 'cornerRadius.value') ||
                                hasVariableBinding(node, 'cornerRadiusValue') ||
                                hasIndividualCornerVariables ||
                                isInstanceWithInheritedVariables ||
                                ('effectStyleId' in node && node.effectStyleId); // Effects can impact perceived radius
      
      log('RADIUS DEBUG - Variable binding state:', {
        nodeName: node.name,
        nodeId: node.id,
        hasCornerRadiusVariable,
        hasTopLeftVariable,
        hasTopRightVariable,
        hasBottomLeftVariable,
        hasBottomRightVariable,
        hasIndividualCornerVariables,
        hasAnyRadiusBinding,
        allCornersHaveVariables,
        isInstanceWithInheritedVariables
      });
      
      // Prepare binding details for audit log
      const bindingDetails = `cornerRadius: ${hasCornerRadiusVariable}, ` +
                             `topLeft: ${hasTopLeftVariable}, ` +
                             `topRight: ${hasTopRightVariable}, ` +
                             `bottomLeft: ${hasBottomLeftVariable}, ` +
                             `bottomRight: ${hasBottomRightVariable}, ` +
                             `inherited: ${isInstanceWithInheritedVariables}`;
      
      // Prepare inspection details for audit log
      const inspectionDetails = `isComponentOrInstance: ${isComponentOrInstance}, ` +
                               `isInsideComponent: ${isInsideComponentInstance}, ` +
                               `hasUniformCorners: ${hasUniformIndividualCorners}, ` +
                               `consistent: ${isIndividualModeConsistent}, ` +
                               `allCornersHaveVars: ${allCornersHaveVariables}, ` +
                               `anyRadiusBinding: ${hasAnyRadiusBinding}`;
      
      log('RADIUS DEBUG - Decision inputs:', {
        nodeName: node.name,
        nodeId: node.id,
        isInstanceWithInheritedVariables,
        hasAnyRadiusBinding,
        allCornersHaveVariables,
        hasUniformIndividualCorners,
        cornerRadius,
        hasCornerRadiusVariable,
        hasIndividualCornerRadii,
        topLeft,
        topRight,
        bottomLeft,
        bottomRight,
        hasTopLeftVariable,
        hasTopRightVariable,
        hasBottomLeftVariable,
        hasBottomRightVariable
      });
      
      // DECISION TREE - Record a detailed audit entry for every decision path
      
      // First case: Skip nodes that have proper variable bindings
      if ((isInstanceWithInheritedVariables || hasAnyRadiusBinding) && allCornersHaveVariables) {
        log('RADIUS DEBUG - Path 1: Excluding due to proper bindings', {
          nodeName: node.name,
          nodeId: node.id,
          reason: 'Has all necessary variable bindings',
          isInstanceWithInheritedVariables,
          hasAnyRadiusBinding,
          allCornersHaveVariables
        });
        // Still exclude nodes with proper variable bindings
        addRadiusAuditEntry(
          node, 
          cornerRadius, 
          topLeft, 
          topRight, 
          bottomLeft, 
          bottomRight, 
          false, 
          "EXCLUDED: Has necessary variable bindings", 
          bindingDetails, 
          inspectionDetails
        );
        
        log('Skipping radius check for node with proper variable bindings', { 
          nodeName: node.name, 
          nodeType: node.type,
          nodeId: node.id
        });
      }
      // Handle case where UI is in individual corners mode but values are actually uniform
      else if (hasUniformIndividualCorners && hasAnyRadiusBinding && allCornersHaveVariables) {
        log('RADIUS DEBUG - Path 2: Excluding due to uniform corners with variables', {
          nodeName: node.name,
          nodeId: node.id,
          reason: 'Uniform corners with proper bindings',
          hasUniformIndividualCorners,
          hasAnyRadiusBinding,
          allCornersHaveVariables
        });
        addRadiusAuditEntry(
          node, 
          cornerRadius, 
          topLeft, 
          topRight, 
          bottomLeft, 
          bottomRight, 
          false, 
          "EXCLUDED: Uniform corners with variables", 
          bindingDetails, 
          inspectionDetails
        );
        
        log('Individual corners mode is active but values are uniform and bound to variables', {
          nodeName: node.name,
          nodeId: node.id,
          cornerRadius,
          topLeft
        });
      }
      // Now check for actual issues - including in instances
      else {
        log('RADIUS DEBUG - Path 3: Checking for issues', {
          nodeName: node.name,
          nodeId: node.id,
          cornerRadius,
          hasCornerRadiusVariable,
          hasIndividualCornerRadii
        });
        
        // First check the main cornerRadius property
        if (typeof cornerRadius === 'number' && cornerRadius > 0 && !hasCornerRadiusVariable) {
          log('RADIUS DEBUG - Creating uniform radius issue', {
            nodeName: node.name,
            nodeId: node.id,
            cornerRadius,
            reason: 'Uniform radius without variable binding'
          });
          addRadiusAuditEntry(
            node, 
            cornerRadius, 
            topLeft, 
            topRight, 
            bottomLeft, 
            bottomRight, 
            true, 
            "ISSUE: Uniform radius without variables", 
            bindingDetails, 
            inspectionDetails
          );
          
          log('Found hardcoded corner radius value');
          const radiusIssue = createRadiusIssue(node as SceneNode, 'uniform');
          issues.push(radiusIssue);
          log('RADIUS DEBUG - Added radius issue to issues array:', {
            issueCount: issues.length,
            lastIssue: radiusIssue,
            allIssues: issues.map(i => ({ type: i.type, nodeName: i.nodeName }))
          });
        } 
        // Then check individual corner radii - including partially bound mixed corners
        else if (hasIndividualCornerRadii) {
          log('RADIUS DEBUG - Checking individual corners', {
            nodeName: node.name,
            nodeId: node.id,
            topLeft,
            topRight,
            bottomLeft,
            bottomRight,
            hasTopLeftVariable,
            hasTopRightVariable,
            hasBottomLeftVariable,
            hasBottomRightVariable
          });
          // Build details about which specific corners have issues
          const missingBindings = [];
          if (topLeft > 0 && !hasTopLeftVariable) {
            missingBindings.push(`topLeft: ${topLeft}`);
          }
          if (topRight > 0 && !hasTopRightVariable) {
            missingBindings.push(`topRight: ${topRight}`);
          }
          if (bottomLeft > 0 && !hasBottomLeftVariable) {
            missingBindings.push(`bottomLeft: ${bottomLeft}`);
          } 
          if (bottomRight > 0 && !hasBottomRightVariable) {
            missingBindings.push(`bottomRight: ${bottomRight}`);
          }
          
          // Only create an issue if at least one corner has a problem
          if (missingBindings.length > 0) {
            const issueDetails = hasUniformIndividualCorners ? 
              "ISSUE: Uniform individual corners without variables" : 
              `ISSUE: Mixed corners without variables (${missingBindings.join(', ')})`;
              
            log('RADIUS DEBUG - Creating individual corners issue', {
              nodeName: node.name,
              nodeId: node.id,
              missingBindings,
              hasUniformIndividualCorners,
              issueDetails
            });
            
            addRadiusAuditEntry(
              node, 
              cornerRadius, 
              topLeft, 
              topRight, 
              bottomLeft, 
              bottomRight, 
              true, 
              issueDetails, 
              bindingDetails, 
              inspectionDetails
            );
            
            // Determine if this is uniform or mixed radius
            if (hasUniformIndividualCorners) {
              log('Found hardcoded uniform individual corner radius values');
              const radiusIssue = createRadiusIssue(node as SceneNode, 'uniform');
              issues.push(radiusIssue);
              log('RADIUS DEBUG - Added radius issue to issues array:', {
                issueCount: issues.length,
                lastIssue: radiusIssue,
                allIssues: issues.map(i => ({ type: i.type, nodeName: i.nodeName }))
              });
            } else {
              // For mixed corners, provide details about which specific corners have issues
              const details = `mixed (${missingBindings.join(', ')})`;
              log('Found hardcoded mixed corner radius values', {
                nodeName: node.name,
                nodeId: node.id,
                details
              });
              const radiusIssue = createRadiusIssue(node as SceneNode, details);
              issues.push(radiusIssue);
              log('RADIUS DEBUG - Added radius issue to issues array:', {
                issueCount: issues.length,
                lastIssue: radiusIssue,
                allIssues: issues.map(i => ({ type: i.type, nodeName: i.nodeName }))
              });
            }
          } else {
            log('RADIUS DEBUG - No corner radius issues found', {
              nodeName: node.name,
              nodeId: node.id,
              reason: 'All corners have proper variable bindings'
            });
            addRadiusAuditEntry(
              node, 
              cornerRadius, 
              topLeft, 
              topRight, 
              bottomLeft, 
              bottomRight, 
              false, 
              "EXCLUDED: No corners missing variables", 
              bindingDetails, 
              inspectionDetails
            );
          }
        }
      }
    }
    
    // Check auto-layout properties (gap and padding)
    if (hasAutoLayout(node)) {
      const layoutNode = node as FrameNode | ComponentNode | InstanceNode;
      
      // Check item spacing (gap)
      const itemSpacing = layoutNode.itemSpacing;
      const hasItemSpacingVariable = hasVariableBinding(node, 'itemSpacing');
      const isAutoSpacing = hasAutoSpacing(node);
      
      log('Checking item spacing:', {
        nodeName: node.name,
        nodeType: node.type,
        nodeId: node.id,
        itemSpacing,
        hasItemSpacingVariable,
        isAutoSpacing,
        isPositive: itemSpacing > 0,
        willFlag: itemSpacing > 0 && !hasItemSpacingVariable && !isAutoSpacing
      });
      
      // Only flag gaps > 0 that aren't using Auto spacing and don't have variable bindings
      if (itemSpacing > 0 && !hasItemSpacingVariable && !isAutoSpacing) {
        log('Found hardcoded item spacing value');
        issues.push(createGapIssue(node as SceneNode));
      }
      
      // Check padding
      const paddingLeft = layoutNode.paddingLeft;
      const paddingRight = layoutNode.paddingRight;
      const paddingTop = layoutNode.paddingTop;
      const paddingBottom = layoutNode.paddingBottom;
      
      const hasPaddingLeftVariable = hasVariableBinding(node, 'paddingLeft');
      const hasPaddingRightVariable = hasVariableBinding(node, 'paddingRight');
      const hasPaddingTopVariable = hasVariableBinding(node, 'paddingTop');
      const hasPaddingBottomVariable = hasVariableBinding(node, 'paddingBottom');
      
      log('Checking padding:', {
        paddingLeft,
        paddingRight,
        paddingTop,
        paddingBottom,
        hasPaddingLeftVariable,
        hasPaddingRightVariable,
        hasPaddingTopVariable,
        hasPaddingBottomVariable
      });
      
      // Consolidate padding issues - create only one issue for all padding problems
      const hasHorizontalPaddingIssue = (paddingLeft > 0 && !hasPaddingLeftVariable) ||
                                        (paddingRight > 0 && !hasPaddingRightVariable);
      
      const hasVerticalPaddingIssue = (paddingTop > 0 && !hasPaddingTopVariable) ||
                                      (paddingBottom > 0 && !hasPaddingBottomVariable);
      
      if (hasHorizontalPaddingIssue || hasVerticalPaddingIssue) {
        let paddingDetails = 'all';
        if (hasHorizontalPaddingIssue && !hasVerticalPaddingIssue) {
          paddingDetails = 'horizontal';
        } else if (!hasHorizontalPaddingIssue && hasVerticalPaddingIssue) {
          paddingDetails = 'vertical';
        }
        
        log('Found hardcoded padding value');
        issues.push(createPaddingIssue(node as SceneNode, paddingDetails));
      }
    }
  } catch (error: unknown) {
    log('Error checking styles:', {
      nodeId: node.id,
      nodeType: node.type,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
  
  log('Finished checking node:', {
    nodeName: node.name,
    issueCount: issues.length,
    issueTypes: issues.map(i => i.type)
  });
  return issues;
}

function hasAutoSpacing(node: BaseNode): boolean {
  if ('layoutMode' in node && 'primaryAxisAlignItems' in node) {
    const layoutNode = node as FrameNode | ComponentNode | InstanceNode;
    // Auto spacing is when primaryAxisAlignItems is set to 'SPACE_BETWEEN'
    return layoutNode.primaryAxisAlignItems === 'SPACE_BETWEEN';
  }
  return false;
} 