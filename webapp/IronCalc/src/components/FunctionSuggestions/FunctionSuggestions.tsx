import { styled, Button } from "@mui/material";
import { useEffect, useRef, useState } from "react";
import { theme } from "../../theme";
import type { WorkbookState } from "../workbookState";

interface FunctionSuggestionsProps {
  workbookState: WorkbookState;
  onSuggestionSelect: (suggestion: string) => void;
  worksheetCanvas?: any;
}

const FunctionSuggestions = ({
  workbookState,
  onSuggestionSelect,
  worksheetCanvas,
}: FunctionSuggestionsProps) => {
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const suggestionsState = workbookState.getFunctionSuggestions();
  const [forceUpdate, setForceUpdate] = useState(0);

  useEffect(() => {
    if (suggestionsState.isActive && suggestionsRef.current) {
      const selectedItem = suggestionsRef.current.children[
        suggestionsState.selectedIndex
      ] as HTMLElement;
      if (selectedItem) {
        selectedItem.scrollIntoView({ block: "nearest" });
      }
    }
  }, [suggestionsState.selectedIndex, suggestionsState.isActive]);

  useEffect(() => {
    const handleScroll = (event: Event) => {
      event.stopPropagation();
    };
    const container = suggestionsRef.current;
    if (container) {
      container.addEventListener("scroll", handleScroll, { passive: false });
    }
    return () => {
      if (container) {
        container.removeEventListener("scroll", handleScroll);
      }
    };
  }, []);

  useEffect(() => {
    const checkState = () => {
      const currentState = workbookState.getFunctionSuggestions();
      if (currentState.selectedIndex !== suggestionsState.selectedIndex) {
        setForceUpdate((prev) => prev + 1);
      }
    };
    const interval = setInterval(checkState, 50);
    return () => clearInterval(interval);
  }, [workbookState, suggestionsState.selectedIndex]);

  const handleContainerMouseMove = () => {
    if (suggestionsState.selectionMode !== "mouse") {
      workbookState.setFunctionSuggestionsMode("mouse");
    }
  };

  if (!suggestionsState.isActive || suggestionsState.suggestions.length === 0) {
    return null;
  }

  const editingCell = workbookState.getEditingCell();
  let cellX = 0;
  let cellY = 0;

  if (editingCell && worksheetCanvas) {
    try {
      const [x, y] = worksheetCanvas.getCoordinatesByCell(
        editingCell.row,
        editingCell.column
      );
      const selectedSheet = worksheetCanvas.model.getSelectedSheet();
      const height = worksheetCanvas.getRowHeight(
        selectedSheet,
        editingCell.row
      );
      cellX = x;
      cellY = y + height;
    } catch {
      cellX = suggestionsState.triggerPosition.x;
      cellY = suggestionsState.triggerPosition.y + 25;
    }
  } else {
    cellX = suggestionsState.triggerPosition.x;
    cellY = suggestionsState.triggerPosition.y + 25;
  }

  return (
    <Container
      ref={suggestionsRef}
      style={{ left: cellX, top: cellY }}
      onMouseMove={handleContainerMouseMove}
    >
      {suggestionsState.suggestions.map((suggestion, index) => (
        <SuggestionItem
          key={suggestion}
          isSelected={index === suggestionsState.selectedIndex}
          onMouseDown={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onSuggestionSelect(suggestion);
          }}
          onMouseEnter={() => {
            const newState = {
              ...suggestionsState,
              selectedIndex: index,
            };
            workbookState.setFunctionSuggestions(newState);
          }}
          onMouseLeave={() => {
            workbookState.setFunctionSuggestionsMode("keyboard");
          }}
        >
          {suggestion}
        </SuggestionItem>
      ))}
      <Footer>
        <span>
          Navigate: <KeyHint><kbd>↑</kbd><kbd>↓</kbd></KeyHint>
        </span>
        <span>
          Select: <KeyHint><kbd>Tab</kbd><kbd>Enter</kbd></KeyHint>
        </span>
      </Footer>
    </Container>
  );
};

const Container = styled("div")`
  position: absolute;
  background: white;
  border: 1px solid ${theme.palette.grey[300]};
  border-radius: 4px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  max-height: 200px;
  overflow-y: auto;
  z-index: 1500;
  min-width: 180px;
  max-width: 300px;
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;

  &:hover {
    overflow-y: auto;
  }
`;

const Footer = styled("div")`
  padding: 8px 12px;
  border-top: 1px solid ${theme.palette.grey[200]};
  font-size: 11px;
  color: ${theme.palette.text.secondary};
  background-color: ${theme.palette.grey[50]};
  border-bottom-left-radius: 4px;
  border-bottom-right-radius: 4px;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const KeyHint = styled("span")`
  display: inline-flex;
  align-items: center;
  margin-left: 8px;

  kbd {
    background-color: ${theme.palette.grey[100]};
    border: 1px solid ${theme.palette.grey[300]};
    border-radius: 3px;
    box-shadow: 0 1px 1px rgba(0, 0, 0, 0.2);
    color: ${theme.palette.text.primary};
    display: inline-block;
    font-size: 10px;
    line-height: 1;
    padding: 2px 4px;
    margin: 0 2px;
  }
`;

const SuggestionItem = styled("div")<{ isSelected: boolean }>`
  padding: 8px 12px;
  cursor: pointer;
  font-family: monospace;
  font-size: 12px;
  background-color: ${props => props.isSelected ? theme.palette.primary.main : 'transparent'};
  color: ${props => props.isSelected ? 'white' : theme.palette.text.primary};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  
  &:hover {
    background-color: ${theme.palette.primary.main};
    color: white;
  }
  
  &:first-of-type {
    border-top-left-radius: 3px;
    border-top-right-radius: 3px;
  }
  
  &:last-of-type {
    border-bottom-left-radius: 0;
    border-bottom-right-radius: 0;
  }
`;

export default FunctionSuggestions;
