import type { Area, Cell } from "./types";

import { type SelectedView, columnNameFromNumber } from "@ironcalc/wasm";
import { LAST_COLUMN, LAST_ROW } from "./WorksheetCanvas/constants";

/**
 *  Returns true if the keypress should start editing
 */
export function isEditingKey(key: string): boolean {
  if (key.length !== 1) {
    return false;
  }
  const code = key.codePointAt(0) ?? 0;
  if (code > 0 && code < 255) {
    return true;
  }
  return false;
}

export type NavigationKey =
  | "ArrowRight"
  | "ArrowLeft"
  | "ArrowDown"
  | "ArrowUp"
  | "Home"
  | "End";

export const isNavigationKey = (key: string): key is NavigationKey =>
  ["ArrowRight", "ArrowLeft", "ArrowDown", "ArrowUp", "Home", "End"].includes(
    key,
  );

export function getCellAddress(
  range: { rowStart: number; rowEnd: number; columnStart: number; columnEnd: number },
): string {
  const rowStart = range.rowStart;
  const columnStart = range.columnStart;
  const rowEnd = range.rowEnd;
  const columnEnd = range.columnEnd;

  const isSingleCell =
    rowStart === rowEnd &&
    columnEnd === columnStart;

  if (isSingleCell) {
    return `${columnNameFromNumber(columnStart)}${rowStart}`;
  }
  if (rowStart === 1 && rowEnd === LAST_ROW) {
    return `${columnNameFromNumber(columnStart)}:${columnNameFromNumber(
      columnEnd,
    )}`;
  }
  if (
    columnStart === 1 &&
    columnEnd === LAST_COLUMN
  ) {
    return `${rowStart}:${rowEnd}`;
  }
  return `${columnNameFromNumber(columnStart)}${rowStart}:${columnNameFromNumber(columnEnd)}${rowEnd}`;
}

export function rangeToStr(
  range: {
    sheet: number;
    rowStart: number;
    rowEnd: number;
    columnStart: number;
    columnEnd: number;
  },
  referenceSheet: number,
  referenceName: string,
): string {
  const { sheet, rowStart, rowEnd, columnStart, columnEnd } = range;
  const sheetName = sheet === referenceSheet ? "" : `'${referenceName}'!`;
  if (rowStart === rowEnd && columnStart === columnEnd) {
    return `${sheetName}${columnNameFromNumber(columnStart)}${rowStart}`;
  }
  return `${sheetName}${columnNameFromNumber(
    columnStart,
  )}${rowStart}:${columnNameFromNumber(columnEnd)}${rowEnd}`;
}

// Returns the full range of the selected view as a string in absolute form
// e.g. 'Sheet1!$A$1:$B$2' or 'Sheet1!$A$1'
export function getFullRangeToString(
  selectedView: { sheet: number; range: [number, number, number, number] },
  worksheetNames: string[],
): string {
  const [rowStart, columnStart, rowEnd, columnEnd] = selectedView.range;
  const sheetName = `${worksheetNames[selectedView.sheet]}`;

  if (rowStart === rowEnd && columnStart === columnEnd) {
    return `${sheetName}!$${columnNameFromNumber(columnStart)}$${rowStart}`;
  }
  return `${sheetName}!$${columnNameFromNumber(
    columnStart,
  )}$${rowStart}:$${columnNameFromNumber(columnEnd)}$${rowEnd}`;
}
