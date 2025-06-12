import { styled } from "@mui/material";
import { useEffect, useRef, useState } from "react";
import { theme } from "../../theme";
import type { WorkbookState } from "../workbookState";

interface FunctionSuggestionsProps {
  workbookState: WorkbookState;
  onSuggestionSelect: (suggestion: string) => void;
  worksheetCanvas?: any; // We'll get this from the worksheet
}

const FunctionSuggestions = ({ 
  workbookState, 
  onSuggestionSelect, 
  worksheetCanvas 
}: FunctionSuggestionsProps) => {
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const [forceUpdate, setForceUpdate] = useState(0);
  const suggestionsState = workbookState.getFunctionSuggestions();
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Handle clicks outside the suggestions box
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node)) {
        // Click was outside the suggestions box, deactivate suggestions
        workbookState.deactivateFunctionSuggestions();
      }
    };

    // Only add the listener if suggestions are active
    if (suggestionsState.isActive) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    // Clean up the listener when component unmounts or suggestions are deactivated
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [suggestionsState.isActive, workbookState]);

  useEffect(() => {
    if (suggestionsState.isActive && suggestionsRef.current) {
      // Scroll the selected item into view
      const selectedItem = suggestionsRef.current.children[suggestionsState.selectedIndex] as HTMLElement;
      if (selectedItem) {
        selectedItem.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [suggestionsState.selectedIndex, suggestionsState.isActive]);

  // Add scroll event handler
  useEffect(() => {
    const handleScroll = (event: Event) => {
      // Prevent scroll event from propagating to parent
      event.stopPropagation();
    };

    const container = suggestionsRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll, { passive: false });
    }

    return () => {
      if (container) {
        container.removeEventListener('scroll', handleScroll);
      }
    };
  }, []);

  // Add an effect to listen for state changes
  useEffect(() => {
    const checkState = () => {
      const currentState = workbookState.getFunctionSuggestions();
      if (currentState.selectedIndex !== suggestionsState.selectedIndex) {
        setForceUpdate(prev => prev + 1);
      }
    };

    // Check state periodically
    const interval = setInterval(checkState, 50);
    return () => clearInterval(interval);
  }, [workbookState, suggestionsState.selectedIndex]);

  if (!suggestionsState.isActive || suggestionsState.suggestions.length === 0) {
    return null;
  }

  // Calculate position based on the editing cell
  const editingCell = workbookState.getEditingCell();
  let cellX = 0;
  let cellY = 0;
  let cellHeight = 22; // Default cell height

  if (editingCell && worksheetCanvas) {
    try {
      // Get the coordinates of the cell being edited
      const [x, y] = worksheetCanvas.getCoordinatesByCell(editingCell.row, editingCell.column);
      const selectedSheet = worksheetCanvas.model.getSelectedSheet();
      const height = worksheetCanvas.getRowHeight(selectedSheet, editingCell.row);
      
      cellX = x;
      cellY = y + height; // Position directly below the cell
      cellHeight = height;
    } catch (error) {
      // Fallback to trigger position if worksheet canvas method fails
      cellX = suggestionsState.triggerPosition.x;
      cellY = suggestionsState.triggerPosition.y + 25;
    }
  } else {
    // Fallback positioning
    cellX = suggestionsState.triggerPosition.x;
    cellY = suggestionsState.triggerPosition.y + 25;
  }

  return (
    <Container
      ref={suggestionsRef}
      style={{
        left: cellX,
        top: cellY,
      }}
    >
      {suggestionsState.suggestions.map((suggestion, index) => (
        <SuggestionItem
          key={suggestion}
          isSelected={index === suggestionsState.selectedIndex}
          onClick={() => onSuggestionSelect(suggestion)}
          onMouseEnter={() => {
            const newState = { ...suggestionsState, selectedIndex: index };
            workbookState.setFunctionSuggestions(newState);
          }}
          onMouseLeave={() => {
            setHoveredIndex(null);
          }}
        >
          {suggestion}
        </SuggestionItem>
      ))}
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
  z-index: 1500; // Higher z-index to appear above everything
  min-width: 180px;
  max-width: 300px;
  
  // Add these styles to ensure proper scrolling behavior
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;
  
  // Prevent scroll events from propagating to parent
  &:hover {
    overflow-y: auto;
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
    border-bottom-left-radius: 3px;
    border-bottom-right-radius: 3px;
  }
`;

export default FunctionSuggestions; 