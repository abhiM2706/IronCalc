import type { Model } from "@ironcalc/wasm";
import { columnNameFromNumber } from "@ironcalc/wasm";

// Types for cell relationships
export interface CellReference {
  sheet: number;
  row: number;
  column: number;
  value?: string;
}

export interface CellRelationship {
  source: CellReference;
  target: CellReference;
  relationshipType: 'direct' | 'range' | 'function' | 'defined_name';
  formula: string;
  description: string;
}

export interface RelationshipMap {
  dependencies: Map<string, CellReference[]>; // cell -> list of cells it depends on
  dependents: Map<string, CellReference[]>;   // cell -> list of cells that depend on it
  parentChildMap: Map<string, CellReference[]>; // parent -> list of children that depend on it
  relationships: CellRelationship[];
  circularReferences: CellReference[][];
  isolatedCells: CellReference[];
  dataIslands: CellReference[][]; // connected components found by DFS
}

/**
 * Analyzes cell relationships through formulas and returns a hashmap of relationships
 * @param model - The IronCalc model containing the workbook data
 * @param sheetIndex - The sheet index to analyze (optional, analyzes all sheets if not provided)
 * @returns RelationshipMap containing all cell relationships
 */
export function analyzeCellRelationships(
  model: Model,
  sheetIndex?: number
): RelationshipMap {
  const dependencies = new Map<string, CellReference[]>();
  const dependents = new Map<string, CellReference[]>();
  const parentChildMap = new Map<string, CellReference[]>(); // parent -> children
  const relationships: CellRelationship[] = [];
  const circularReferences: CellReference[][] = [];
  const isolatedCells: CellReference[] = [];
  const dataIslands: CellReference[][] = [];

  // Helper function to create cell key
  function getCellKey(cell: CellReference): string {
    return `${cell.sheet}:${cell.row}:${cell.column}`;
  }

  // Helper function to parse cell reference from string
  function parseCellReference(ref: string): CellReference | null {
    try {
      // Handle sheet references like "Sheet1!A1"
      const sheetMatch = ref.match(/^([^!]+)!(.+)$/);
      if (sheetMatch) {
        const sheetName = sheetMatch[1];
        const cellRef = sheetMatch[2];
        const sheetIndex = model.getWorksheetsProperties().findIndex(
          sheet => sheet.name === sheetName
        );
        if (sheetIndex === -1) return null;
        
        return parseCellAddress(cellRef, sheetIndex);
      } else {
        // Assume current sheet
        const currentSheet = sheetIndex ?? 0;
        return parseCellAddress(ref, currentSheet);
      }
    } catch {
      return null;
    }
  }

  // Helper function to parse cell address like "A1", "B2", etc.
  function parseCellAddress(address: string, sheet: number): CellReference | null {
    const match = address.match(/^([A-Z]+)(\d+)$/);
    if (!match) return null;
    
    const columnStr = match[1];
    const rowStr = match[2];
    
    // Convert column letter to number
    let column = 0;
    for (let i = 0; i < columnStr.length; i++) {
      column = column * 26 + (columnStr.charCodeAt(i) - 64);
    }
    
    const row = parseInt(rowStr);
    return { sheet, row, column };
  }

  // Helper function to extract cell references from formula
  function extractCellReferences(formula: string): CellReference[] {
    const references: CellReference[] = [];
    // Match cell references and ranges in formulas
    // This regex matches patterns like A1, B2, Sheet1!A1, G1:G51, A1:C3, Sheet1!A1:B2, etc.
    const cellOrRangeRefRegex = /(?:([^!]+)!)?([A-Z]+\d+)(?::([A-Z]+\d+))?/g;
    let match;
    while ((match = cellOrRangeRefRegex.exec(formula)) !== null) {
      const sheetName = match[1];
      const startAddress = match[2];
      const endAddress = match[3];
      let sheetIndex = 0; // Default to first sheet
      if (sheetName) {
        const sheetProps = model.getWorksheetsProperties();
        const sheetIndexFound = sheetProps.findIndex(sheet => sheet.name === sheetName);
        if (sheetIndexFound !== -1) {
          sheetIndex = sheetIndexFound;
        }
      }
      const startRef = parseCellAddress(startAddress, sheetIndex);
      if (endAddress) {
        // Range detected, expand all cells in the range
        const endRef = parseCellAddress(endAddress, sheetIndex);
        if (startRef && endRef) {
          const rowStart = Math.min(startRef.row, endRef.row);
          const rowEnd = Math.max(startRef.row, endRef.row);
          const colStart = Math.min(startRef.column, endRef.column);
          const colEnd = Math.max(startRef.column, endRef.column);
          for (let row = rowStart; row <= rowEnd; row++) {
            for (let col = colStart; col <= colEnd; col++) {
              references.push({ sheet: sheetIndex, row, column: col, value: model.getCellContent(sheetIndex, row, col) });
            }
          }
        }
      } else if (startRef) {
        // Single cell reference
        references.push(startRef);
      }
    }
    return references;
  }

  // Helper function to get all cells with formulas
  function getCellsWithFormulas(): CellReference[] {
    const cells: CellReference[] = [];
    
    const sheetsToAnalyze = sheetIndex !== undefined ? [sheetIndex] : 
      Array.from({ length: model.getWorksheetsProperties().length }, (_, i) => i);
    
    for (const sheet of sheetsToAnalyze) {
      try {
        // Scan through a reasonable range of cells (e.g., 1-1000 rows, 1-26 columns)
        for (let row = 1; row <= 1000; row++) {
          for (let col = 1; col <= 26; col++) {
            try {
              const content = model.getCellContent(sheet, row, col);
              if (content && content.startsWith('=')) {
                cells.push({
                  sheet,
                  row,
                  column: col
                });
              }
            } catch {
              // Skip cells that can't be accessed
              continue;
            }
          }
        }
      } catch {
        // Skip sheets that can't be accessed
      }
    }
    
    return cells;
  }

  // Analyze all cells with formulas
  const cellsWithFormulas = getCellsWithFormulas();
  
  for (const cell of cellsWithFormulas) {
    const cellKey = getCellKey(cell);
    
    try {
      const formula = model.getCellContent(cell.sheet, cell.row, cell.column);
      if (!formula || !formula.startsWith('=')) continue;
      
      // Extract cell references from formula
      const cellRefs = extractCellReferences(formula);
      
      // Initialize arrays if they don't exist
      if (!dependencies.has(cellKey)) {
        dependencies.set(cellKey, []);
      }
      if (!dependents.has(cellKey)) {
        dependents.set(cellKey, []);
      }
      
      // Add dependencies (this cell depends on the referenced cells)
      dependencies.get(cellKey)!.push(...cellRefs);
      
      // Add dependents (reverse relationship - this cell is parent of the referenced cells)
      for (const ref of cellRefs) {
        const refKey = getCellKey(ref);
        if (!dependents.has(refKey)) {
          dependents.set(refKey, []);
        }
        dependents.get(refKey)!.push(cell);
        
        // Add to parent-child map (this cell with formula is parent, referenced cells are children)
        if (!parentChildMap.has(cellKey)) {
          parentChildMap.set(cellKey, []);
        }
        parentChildMap.get(cellKey)!.push(ref);
      }
      
      // Create relationship objects
      for (const ref of cellRefs) {
        const relationship: CellRelationship = {
          source: cell,
          target: ref,
          relationshipType: 'direct',
          formula: formula,
          description: `${getCellKey(cell)} depends on ${getCellKey(ref)}`
        };
        relationships.push(relationship);
      }
      
    } catch (error) {
      // Skip cells that can't be analyzed
    }
  }

  // Detect circular references
  const visited = new Set<string>();
  const recursionStack = new Set<string>();
  
  function detectCircularReference(cellKey: string, path: CellReference[]): CellReference[][] {
    if (recursionStack.has(cellKey)) {
      // Found a circular reference
      const cycleStart = path.findIndex(cell => getCellKey(cell) === cellKey);
      if (cycleStart !== -1) {
        return [path.slice(cycleStart)];
      }
      return [];
    }
    
    if (visited.has(cellKey)) {
      return [];
    }
    
    visited.add(cellKey);
    recursionStack.add(cellKey);
    
    const deps = dependencies.get(cellKey) || [];
    let cycles: CellReference[][] = [];
    
    for (const dep of deps) {
      const depKey = getCellKey(dep);
      const newPath = [...path, dep];
      const newCycles = detectCircularReference(depKey, newPath);
      cycles.push(...newCycles);
    }
    
    recursionStack.delete(cellKey);
    return cycles;
  }
  
  // Find all circular references
  for (const cellKey of dependencies.keys()) {
    const cycles = detectCircularReference(cellKey, []);
    circularReferences.push(...cycles);
  }

  // Find isolated cells (cells with no dependencies and no dependents)
  const allCells = new Set<string>();
  const cellsWithDeps = new Set<string>();
  const cellsWithDependents = new Set<string>();
  
  for (const [cellKey, deps] of dependencies) {
    allCells.add(cellKey);
    if (deps.length > 0) {
      cellsWithDeps.add(cellKey);
    }
  }
  
  for (const [cellKey, deps] of dependents) {
    allCells.add(cellKey);
    if (deps.length > 0) {
      cellsWithDependents.add(cellKey);
    }
  }
  
  for (const cellKey of allCells) {
    if (!cellsWithDeps.has(cellKey) && !cellsWithDependents.has(cellKey)) {
      const [sheet, row, col] = cellKey.split(':').map(Number);
      isolatedCells.push({ sheet, row, column: col });
    }
  }

  // Find connected components (data islands) using DFS
  function findConnectedComponents(): CellReference[][] {
    const visited = new Set<string>();
    const components: CellReference[][] = [];
    
    function dfs(cellKey: string, component: CellReference[]): void {
      if (visited.has(cellKey)) return;
      
      visited.add(cellKey);
      const [sheet, row, col] = cellKey.split(':').map(Number);
      component.push({ sheet, row, column: col });
      
      // Visit all dependencies (cells this cell depends on)
      const deps = dependencies.get(cellKey) || [];
      for (const dep of deps) {
        const depKey = getCellKey(dep);
        dfs(depKey, component);
      }
      
      // Visit all dependents (cells that depend on this cell)
      const cellDependents = dependents.get(cellKey) || [];
      for (const dep of cellDependents) {
        const depKey = getCellKey(dep);
        dfs(depKey, component);
      }
    }
    
    // Start DFS from each unvisited cell
    for (const cellKey of allCells) {
      if (!visited.has(cellKey)) {
        const component: CellReference[] = [];
        dfs(cellKey, component);
        if (component.length > 0) {
          components.push(component);
        }
      }
    }
    
    return components;
  }
  
  // Find data islands
  const foundDataIslands = findConnectedComponents();

  return {
    dependencies,
    dependents,
    parentChildMap,
    relationships,
    circularReferences,
    isolatedCells,
    dataIslands: foundDataIslands
  };
}

/**
 * Gets detailed information about a specific cell's relationships
 * @param relationshipMap - The relationship map from analyzeCellRelationships
 * @param cell - The cell to analyze
 * @returns Detailed cell relationship information
 */
export function getCellRelationshipInfo(
  relationshipMap: RelationshipMap,
  cell: CellReference
): {
  dependencies: CellReference[];
  dependents: CellReference[];
  inCircularReference: boolean;
  dependencyDepth: number;
  dependentDepth: number;
} {
  const cellKey = `${cell.sheet}:${cell.row}:${cell.column}`;
  
  const dependencies = relationshipMap.dependencies.get(cellKey) || [];
  const dependents = relationshipMap.dependents.get(cellKey) || [];
  
  // Check if cell is in a circular reference
  const inCircularReference = relationshipMap.circularReferences.some(cycle =>
    cycle.some(c => c.sheet === cell.sheet && c.row === cell.row && c.column === cell.column)
  );
  
  // Calculate dependency depth (how many levels deep this cell's dependencies go)
  function calculateDependencyDepth(cellKey: string, visited: Set<string> = new Set()): number {
    if (visited.has(cellKey)) return 0;
    visited.add(cellKey);
    
    const deps = relationshipMap.dependencies.get(cellKey) || [];
    if (deps.length === 0) return 0;
    
    let maxDepth = 0;
    for (const dep of deps) {
      const depKey = `${dep.sheet}:${dep.row}:${dep.column}`;
      const depth = calculateDependencyDepth(depKey, new Set(visited));
      maxDepth = Math.max(maxDepth, depth);
    }
    
    return maxDepth + 1;
  }
  
  // Calculate dependent depth (how many levels deep cells that depend on this cell go)
  function calculateDependentDepth(cellKey: string, visited: Set<string> = new Set()): number {
    if (visited.has(cellKey)) return 0;
    visited.add(cellKey);
    
    const deps = relationshipMap.dependents.get(cellKey) || [];
    if (deps.length === 0) return 0;
    
    let maxDepth = 0;
    for (const dep of deps) {
      const depKey = `${dep.sheet}:${dep.row}:${dep.column}`;
      const depth = calculateDependentDepth(depKey, new Set(visited));
      maxDepth = Math.max(maxDepth, depth);
    }
    
    return maxDepth + 1;
  }
  
  const dependencyDepth = calculateDependencyDepth(cellKey);
  const dependentDepth = calculateDependentDepth(cellKey);
  
  return {
    dependencies,
    dependents,
    inCircularReference,
    dependencyDepth,
    dependentDepth
  };
}

/**
 * Filters relationships based on criteria
 * @param relationshipMap - The relationship map
 * @param criteria - Filter criteria
 * @returns Filtered relationship map
 */
export function filterRelationships(
  relationshipMap: RelationshipMap,
  criteria: {
    minDependencies?: number;
    maxDependencies?: number;
    minDependents?: number;
    maxDependents?: number;
    hasCircularReference?: boolean;
    relationshipType?: 'direct' | 'range' | 'function' | 'defined_name';
  }
): RelationshipMap {
  const filtered = {
    dependencies: new Map<string, CellReference[]>(),
    dependents: new Map<string, CellReference[]>(),
    parentChildMap: new Map<string, CellReference[]>(),
    relationships: [] as CellRelationship[],
    circularReferences: relationshipMap.circularReferences,
    isolatedCells: [] as CellReference[],
    dataIslands: relationshipMap.dataIslands
  };
  
  for (const [cellKey, deps] of relationshipMap.dependencies) {
    const dependents = relationshipMap.dependents.get(cellKey) || [];
    
    let include = true;
    
    if (criteria.minDependencies && deps.length < criteria.minDependencies) include = false;
    if (criteria.maxDependencies && deps.length > criteria.maxDependencies) include = false;
    if (criteria.minDependents && dependents.length < criteria.minDependents) include = false;
    if (criteria.maxDependents && dependents.length > criteria.maxDependents) include = false;
    
    if (criteria.hasCircularReference !== undefined) {
      const hasCircular = relationshipMap.circularReferences.some(cycle =>
        cycle.some(c => `${c.sheet}:${c.row}:${c.column}` === cellKey)
      );
      if (criteria.hasCircularReference !== hasCircular) include = false;
    }
    
    if (include) {
      filtered.dependencies.set(cellKey, deps);
      filtered.dependents.set(cellKey, dependents);
    }
  }
  
  // Filter relationships
  for (const rel of relationshipMap.relationships) {
    let include = true;
    
    if (criteria.relationshipType && rel.relationshipType !== criteria.relationshipType) {
      include = false;
    }
    
    if (include) {
      filtered.relationships.push(rel);
    }
  }
  
  return filtered;
}

/**
 * Exports relationships to JSON format
 * @param relationshipMap - The relationship map
 * @returns JSON string
 */
export function exportRelationshipsToJSON(relationshipMap: RelationshipMap): string {
  const exportData = {
    dependencies: Object.fromEntries(relationshipMap.dependencies),
    dependents: Object.fromEntries(relationshipMap.dependents),
    relationships: relationshipMap.relationships,
    circularReferences: relationshipMap.circularReferences,
    isolatedCells: relationshipMap.isolatedCells,
    summary: {
      totalCells: relationshipMap.dependencies.size,
      totalRelationships: relationshipMap.relationships.length,
      circularReferenceCount: relationshipMap.circularReferences.length,
      isolatedCellCount: relationshipMap.isolatedCells.length
    }
  };
  
  return JSON.stringify(exportData, null, 2);
} 

/**
 * Finds islands (clumps) of non-empty cells based on their physical adjacency in the spreadsheet.
 * Cells are considered part of the same island if they are adjacent (up/down/left/right).
 * @param model - The IronCalc model containing the workbook data
 * @param sheetIndex - The sheet index to analyze (optional, analyzes all sheets if not provided)
 * @returns Array of islands, each island is an array of CellReference
 */
export function findLocationBasedIslands(
  model: Model,
  sheetIndex?: number
): CellReference[][] {
  const islands: CellReference[][] = [];
  const visited = new Set<string>();

  // Helper to create cell key
  function getCellKey(cell: CellReference): string {
    return `${cell.sheet}:${cell.row}:${cell.column}`;
  }

  // Get all non-empty cells
  const nonEmptyCells: CellReference[] = [];
  const sheetsToAnalyze = sheetIndex !== undefined ? [sheetIndex] : 
    Array.from({ length: model.getWorksheetsProperties().length }, (_, i) => i);

  for (const sheet of sheetsToAnalyze) {
    try {
      // Scan through a reasonable range of cells (e.g., 1-1000 rows, 1-26 columns)
      for (let row = 1; row <= 1000; row++) {
        for (let col = 1; col <= 26; col++) {
          try {
            const content = model.getCellContent(sheet, row, col);
            if (content && content !== '') {
              nonEmptyCells.push({ sheet, row, column: col, value: content });
            }
          } catch {
            continue;
          }
        }
      }
    } catch {
      // Skip sheets that can't be accessed
    }
  }

  // Build a map for fast lookup
  const cellSet = new Set(nonEmptyCells.map(getCellKey));

  // Directions: up, down, left, right
  const directions = [
    { dr: -1, dc: 0 }, // up
    { dr: 1, dc: 0 },  // down
    { dr: 0, dc: -1 }, // left
    { dr: 0, dc: 1 },  // right
  ];

  // DFS to find all connected cells
  function dfs(cell: CellReference, island: CellReference[]) {
    const key = getCellKey(cell);
    if (!cellSet.has(key) || visited.has(key)) return;
    visited.add(key);
    island.push(cell);
    for (const { dr, dc } of directions) {
      const neighborRow = cell.row + dr;
      const neighborCol = cell.column + dc;
      try {
        const neighborValue = model.getCellContent(cell.sheet, neighborRow, neighborCol);
        const neighbor = { sheet: cell.sheet, row: neighborRow, column: neighborCol, value: neighborValue };
        const neighborKey = getCellKey(neighbor);
        if (cellSet.has(neighborKey) && !visited.has(neighborKey)) {
          dfs(neighbor, island);
        }
      } catch {
        // Skip cells that can't be accessed
        continue;
      }
    }
  }

  // Find all islands
  for (const cell of nonEmptyCells) {
    const key = getCellKey(cell);
    if (!visited.has(key)) {
      const island: CellReference[] = [];
      dfs(cell, island);
      if (island.length > 0) {
        islands.push(island);
      }
    }
  }

  return islands;
}

export function simpleTest(model: Model): void {
  console.log("Simple test - model exists:", !!model);
  console.log("Worksheets:", model.getWorksheetsProperties());
  
  // Test getting cell content
  try {
    const content = model.getCellContent(0, 1, 1); // A1
    console.log("A1 content:", content);
  } catch (error) {
    console.error("Error getting cell content:", error);
  }
}

export function testCellRelationships(model: Model): void {
  console.log("=== STARTING CELL RELATIONSHIPS ANALYSIS ===");
  
  try {
    // Test a few specific cells first
    for (let row = 1; row <= 5; row++) {
      for (let col = 1; col <= 5; col++) {
        try {
          const content = model.getCellContent(0, row, col);
          if (content && content.startsWith('=')) {
            console.log(`Found formula in ${row},${col}:`, content);
          }
        } catch (e) {
          // ignore
        }
      }
    }
    
    // Then run the full analysis
    const relationships = analyzeCellRelationships(model);
    
    // Create a visual representation of parent-child relationships
    console.log("\n=== PARENT-CHILD RELATIONSHIP MAP ===");
    
      // Helper function to convert cell reference to readable format
  function formatCellRef(cell: CellReference): string {
    const columnName = columnNameFromNumber(cell.column);
    return `${columnName}${cell.row}`;
  }
    
    // Display parent-child relationships using the new parentChildMap
    console.log("\nPARENT-CHILD MAP (Parent -> Children):");
    console.log("=".repeat(60));
    
    for (const [parentKey, children] of relationships.parentChildMap) {
      if (children.length > 0) {
        const [sheet, row, col] = parentKey.split(':').map(Number);
        const parentCell = { sheet, row, column: col };
        const parentFormatted = formatCellRef(parentCell);
        
        try {
          const parentFormula = model.getCellContent(parentCell.sheet, parentCell.row, parentCell.column);
          console.log(`\nPARENT: ${parentFormatted}`);
          console.log(`   Formula: ${parentFormula}`);
          console.log(`   References ${children.length} cell(s):`);
          
          for (const child of children) {
            const childFormatted = formatCellRef(child);
            try {
              const childContent = model.getCellContent(child.sheet, child.row, child.column);
              console.log(`      • ${childFormatted} (Value: ${childContent})`);
            } catch (e) {
              console.log(`      • ${childFormatted} (Value: <error>)`);
            }
          }
        } catch (e) {
          console.log(`\nPARENT: ${parentFormatted} (Formula: <error>)`);
        }
      }
    }
    
    console.log("\n📋 CHILD CELLS (Cells that depend on other cells):");
    console.log("=".repeat(60));
    
    for (const [cellKey, dependencies] of relationships.dependencies) {
      if (dependencies.length > 0) {
        const [sheet, row, col] = cellKey.split(':').map(Number);
        const childCell = { sheet, row, column: col };
        const childFormatted = formatCellRef(childCell);
        
        console.log(`\n🔹 CHILD: ${childFormatted}`);
        console.log(`   └─ Depends on ${dependencies.length} parent(s):`);
        
        for (const parent of dependencies) {
          const parentFormatted = formatCellRef(parent);
          try {
            const parentContent = model.getCellContent(parent.sheet, parent.row, parent.column);
            const contentPreview = parentContent && parentContent.startsWith('=') 
              ? `(Formula: ${parentContent})` 
              : `(Value: ${parentContent})`;
            console.log(`      • ${parentFormatted} ${contentPreview}`);
          } catch (e) {
            console.log(`      • ${parentFormatted} (Value: <error>)`);
          }
        }
      }
    }
    
    // Display circular references
    if (relationships.circularReferences.length > 0) {
      console.log("\n⚠️  CIRCULAR REFERENCES DETECTED:");
      console.log("=".repeat(60));
      
      for (let i = 0; i < relationships.circularReferences.length; i++) {
        const cycle = relationships.circularReferences[i];
        console.log(`\n🔄 Cycle ${i + 1}:`);
        for (let j = 0; j < cycle.length; j++) {
          const cell = cycle[j];
          const nextCell = cycle[(j + 1) % cycle.length];
          const cellFormatted = formatCellRef(cell);
          const nextCellFormatted = formatCellRef(nextCell);
          console.log(`   ${cellFormatted} → ${nextCellFormatted}`);
        }
      }
    }
    
    // Display isolated cells
    if (relationships.isolatedCells.length > 0) {
      console.log("\n🔍 ISOLATED CELLS (No relationships):");
      console.log("=".repeat(60));
      
      for (const cell of relationships.isolatedCells) {
        const cellFormatted = formatCellRef(cell);
        try {
          const content = model.getCellContent(cell.sheet, cell.row, cell.column);
          console.log(`   • ${cellFormatted}: ${content}`);
        } catch (e) {
          console.log(`   • ${cellFormatted}: <error>`);
        }
      }
    }
    
    // Display data islands
    console.log("\nDATA ISLANDS (Connected Components):");
    console.log("=".repeat(60));
    
    for (let i = 0; i < relationships.dataIslands.length; i++) {
      const island = relationships.dataIslands[i];
      console.log(`\nIsland ${i + 1} (${island.length} cells):`);
      
      for (const cell of island) {
        const cellFormatted = formatCellRef(cell);
        try {
          const content = model.getCellContent(cell.sheet, cell.row, cell.column);
          console.log(`   • ${cellFormatted}: ${content}`);
        } catch (e) {
          console.log(`   • ${cellFormatted}: <error>`);
        }
      }
    }
    
    // Summary statistics
    console.log("\n📈 SUMMARY:");
    console.log("=".repeat(60));
    console.log(`Total cells with formulas: ${relationships.dependencies.size}`);
    console.log(`Total relationships: ${relationships.relationships.length}`);
    console.log(`Circular reference cycles: ${relationships.circularReferences.length}`);
    console.log(`Isolated cells: ${relationships.isolatedCells.length}`);
    console.log(`Data islands: ${relationships.dataIslands.length}`);
    
    console.log("\n=== ANALYSIS COMPLETE ===");
    
  } catch (error) {
    console.error("Test failed:", error);
  }
} 