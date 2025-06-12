// This are properties of the workbook that are not permanently stored
// They only happen at 'runtime' while the workbook is being used:
//
// * What are we editing
// * Are we copying styles?
// * Are we extending a cell? (by pulling the cell outline handle down, for instance)
//
// Editing the cell is the most complex operation.
//
// * What cell are we editing?
// * Are we doing that from the cell editor or the formula editor?
// * What is the text content of the cell right now
// * The active ranges can technically be computed from the text.
//   Those are the ranges or cells that appear in the formula

import type { CellStyle } from "@ironcalc/wasm";

export interface CutRange {
  sheet: number;
  rowStart: number;
  rowEnd: number;
  columnStart: number;
  columnEnd: number;
}

export enum AreaType {
  rowsDown = 0,
  columnsRight = 1,
  rowsUp = 2,
  columnsLeft = 3,
}

export interface Area {
  type: AreaType;
  rowStart: number;
  rowEnd: number;
  columnStart: number;
  columnEnd: number;
}

// Active ranges are ranges in the sheet that are highlighted when editing a formula
export interface ActiveRange {
  sheet: number;
  rowStart: number;
  rowEnd: number;
  columnStart: number;
  columnEnd: number;
  color: string;
}

export interface ReferencedRange {
  range: {
    sheet: number;
    rowStart: number;
    rowEnd: number;
    columnStart: number;
    columnEnd: number;
  };
  str: string;
}

type Focus = "cell" | "formula-bar";
type EditorMode = "accept" | "edit";

// In "edit" mode arrow keys will move you around the text in the editor
// In "accept" mode arrow keys will accept the content and move to the next cell or select another cell

// The cell that we are editing
export interface EditingCell {
  sheet: number;
  row: number;
  column: number;
  // raw text in the editor
  text: string;
  // position of the cursor
  cursorStart: number;
  cursorEnd: number;
  // referenced range
  referencedRange: ReferencedRange | null;
  focus: Focus;
  activeRanges: ActiveRange[];
  mode: EditorMode;
  editorWidth: number;
  editorHeight: number;
}

// Those are styles that are copied
type AreaStyles = CellStyle[][];

export interface FunctionSuggestion {
  name: string;
  selected: boolean;
}

export interface FunctionSuggestionsState {
  isActive: boolean;
  suggestions: string[];
  selectedIndex: number;
  triggerPosition: { x: number; y: number };
}

export class WorkbookState {
  private extendToArea: Area | null;
  private copyStyles: AreaStyles | null;
  private cell: EditingCell | null;
  private cutRange: CutRange | null;
  private functionSuggestions: FunctionSuggestionsState;

  constructor() {
    // the extendTo area is the area we are covering
    this.extendToArea = null;
    this.copyStyles = null;
    this.cell = null;
    this.cutRange = null;
    this.functionSuggestions = {
      isActive: false,
      suggestions: [],
      selectedIndex: 0,
      triggerPosition: { x: 0, y: 0 }
    };
  }

  getExtendToArea(): Area | null {
    return this.extendToArea;
  }

  clearExtendToArea(): void {
    this.extendToArea = null;
  }

  setExtendToArea(area: Area): void {
    this.extendToArea = area;
  }

  setCopyStyles(styles: AreaStyles | null): void {
    this.copyStyles = styles;
  }

  getCopyStyles(): AreaStyles | null {
    return this.copyStyles;
  }

  setActiveRanges(activeRanges: ActiveRange[]) {
    if (!this.cell) {
      return;
    }
    this.cell.activeRanges = activeRanges;
  }

  getActiveRanges(): ActiveRange[] {
    return this.cell?.activeRanges || [];
  }

  getEditingCell(): EditingCell | null {
    return this.cell;
  }

  setEditingCell(cell: EditingCell) {
    this.cell = cell;
  }

  clearEditingCell() {
    this.cell = null;
  }

  isCellEditorActive(): boolean {
    if (this.cell) {
      return this.cell.focus === "cell";
    }
    return false;
  }

  isFormulaEditorActive(): boolean {
    if (this.cell) {
      return this.cell.focus === "formula-bar";
    }
    return false;
  }

  getEditingText(): string {
    const cell = this.cell;
    if (cell) {
      return cell.text + (cell.referencedRange?.str || "");
    }
    return "";
  }

  setCutRange(range: CutRange): void {
    this.cutRange = range;
  }

  clearCutRange(): void {
    this.cutRange = null;
  }

  getCutRange(): CutRange | null {
    return this.cutRange;
  }

  getFunctionSuggestions(): FunctionSuggestionsState {
    return this.functionSuggestions;
  }

  setFunctionSuggestions(suggestions: FunctionSuggestionsState): void {
    this.functionSuggestions = suggestions;
  }

  activateFunctionSuggestions(suggestions: string[], position: { x: number; y: number }): void {
    this.functionSuggestions = {
      isActive: true,
      suggestions,
      selectedIndex: 0,
      triggerPosition: position
    };
  }

  deactivateFunctionSuggestions(): void {
    this.functionSuggestions = {
      isActive: false,
      suggestions: [],
      selectedIndex: 0,
      triggerPosition: { x: 0, y: 0 }
    };
  }

  updateFunctionSuggestionsSelection(direction: 'up' | 'down'): void {
    if (!this.functionSuggestions.isActive || this.functionSuggestions.suggestions.length === 0) {
      return;
    }

    const { suggestions, selectedIndex } = this.functionSuggestions;
    let newIndex = selectedIndex;

    if (direction === 'down') {
      newIndex = (selectedIndex + 1) % suggestions.length;
    } else {
      newIndex = selectedIndex === 0 ? suggestions.length - 1 : selectedIndex - 1;
    }

    // Create a completely new object to ensure React detects the change
    this.functionSuggestions = {
      isActive: true,
      suggestions: [...suggestions], // Create a new array
      selectedIndex: newIndex,
      triggerPosition: { ...this.functionSuggestions.triggerPosition } // Create a new position object
    };
  }

  getSelectedFunctionSuggestion(): string | null {
    if (!this.functionSuggestions.isActive || this.functionSuggestions.suggestions.length === 0) {
      return null;
    }
    return this.functionSuggestions.suggestions[this.functionSuggestions.selectedIndex];
  }

  insertFunctionSuggestion(suggestion: string): void {
    if (!this.cell) {
      return;
    }

    const value = this.cell.text;
    const cursorPosition = this.cell.cursorStart;
    
    // Find the partial function name to replace
    const beforeCursor = value.substring(0, cursorPosition);
    const afterEquals = beforeCursor.substring(1);
    const tokens = afterEquals.split(/([^A-Za-z0-9_])/);
    const lastTokenIndex = tokens.length - 1;
    
    if (lastTokenIndex >= 0 && /^[A-Za-z][A-Za-z0-9_]*$/.test(tokens[lastTokenIndex])) {
      // Calculate the position where the partial function starts
      const partialStart = beforeCursor.length - tokens[lastTokenIndex].length;
      
      // Replace the partial function with the selected suggestion
      const newValue = value.substring(0, partialStart) + suggestion + '(' + value.substring(cursorPosition);
      const newCursorPosition = partialStart + suggestion.length + 1; // Position cursor after the opening parenthesis
      
      // Update the cell state
      this.cell.text = newValue;
      this.cell.cursorStart = newCursorPosition;
      this.cell.cursorEnd = newCursorPosition;
      
      // Make sure we're in edit mode
      this.cell.mode = "edit";
    }
    
    // Always deactivate suggestions after inserting a function
    this.deactivateFunctionSuggestions();
  }

  handleFocusChange(): void {
    // Deactivate function suggestions when focus changes
    this.deactivateFunctionSuggestions();
  }
}
