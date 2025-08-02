import React, { useState } from 'react';
import { Typography, Accordion, AccordionSummary, AccordionDetails, List, ListItem, ListItemText } from '@mui/material';
import type { Model } from '@ironcalc/wasm';
import { columnNameFromNumber } from '@ironcalc/wasm';
import { analyzeCellRelationships, type CellReference, type RelationshipMap, findLocationBasedIslands } from './cellRelationships';
import { sendRelationshipsToChatGPT } from './sendRelationshipsToChatGPT';

interface CellRelationshipsViewerProps {
  model: Model;
  isOpen: boolean;
  onClose: () => void;
}

const CellRelationshipsViewer: React.FC<CellRelationshipsViewerProps> = ({
  model,
  isOpen,
  onClose
}) => {
  const [relationships, setRelationships] = useState<RelationshipMap | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [tab, setTab] = useState<'references' | 'clumps'>('references');
  const [clumpIslands, setClumpIslands] = useState<CellReference[][] | null>(null);

  const analyzeRelationships = () => {
    setIsLoading(true);
    try {
      const result = analyzeCellRelationships(model);
      setRelationships(result);
    } catch (error) {
      console.error('Error analyzing relationships:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCellRef = (cell: CellReference): string => {
    const columnName = columnNameFromNumber(cell.column);
    return `${columnName}${cell.row}`;
  };

  const getCellContent = (cell: CellReference): string => {
    try {
      return model.getCellContent(cell.sheet, cell.row, cell.column) || '';
    } catch {
      return '<error>';
    }
  };

  React.useEffect(() => {
    if (isOpen) {
      setRelationships(null);
      analyzeRelationships();
      setClumpIslands(null);
      // Precompute clump islands for the current model
      setClumpIslands(findLocationBasedIslands(model));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Handler to send relationships to ChatGPT
  const handleSendToChatGPT = async () => {
    console.log('Send to ChatGPT button clicked!');
    if (!relationships || !clumpIslands) {
      console.log('No relationships or clump islands data available');
      return;
    }
    
    console.log('Relationships and clump islands data available, starting API call...');
    try {
      // Prepare a combined prompt
      const relationshipsJson = JSON.stringify(relationships, null, 2);
      const clumpIslandsJson = JSON.stringify(clumpIslands, null, 2);
      const prompt = `Analyze this spreadsheet data and create an ASCII tree:\n\n1. Reference-based Data Islands:\n${relationshipsJson}\n\n2. Location-based Clump Islands:\n${clumpIslandsJson}\n\nCreate an ASCII tree showing cell relationships. Use |, ├─, └─ characters. If empty, show "Empty Spreadsheet" as root.`;
      // Use a system prompt for context
      const systemPrompt = `Create ASCII tree from spreadsheet data:

1. Reference-Based Data: Use formula references as parent-child relationships
2. Location-Based Clumps: Groups of adjacent cells

Use reference relationships to determine hierarchy - referenced cells are parents, referencing cells are children. If references empty, infer from location patterns.

Identify headers vs values:
- Headers: descriptive text, first row/column, end with "Rate (%)", "Amount"
- Values: numeric data, relate to row/column headers

Output: ASCII tree with ├──, └──, │. Start "ROOT". Include meaningful blocks only.

Example:
ROOT
├── ASSUMPTIONS
│ ├── Growth Rates
│ │ ├── Data Center (%)
│ │ └── Gaming (%)
│ └── Margins
│   ├── Gross (%)
│   └── Tax (%)

Return tree only.`;
      const result = await sendRelationshipsToChatGPT({ prompt, systemPrompt }, "**********");
      console.log('ChatGPT API call successful!');
      console.log('Final result:', result);
      alert(result);
    } catch (err) {
      console.error('Error in handleSendToChatGPT:', err);
      alert('Error: ' + err);
    }
  };

  // Handler to show what data is being sent to ChatGPT
  const handleShowDataBeingSent = () => {
    if (!relationships || !clumpIslands) {
      alert('No relationships or clump islands data available');
      return;
    }
    
    // Prepare the same data that gets sent to ChatGPT
    const relationshipsJson = JSON.stringify(relationships, null, 2);
    const clumpIslandsJson = JSON.stringify(clumpIslands, null, 2);
    const prompt = `look at this spreadsheet data and create an ASCII tree:\n\n1. Reference-based Data Islands:\n${relationshipsJson}\n\n2. Location-based Clump Islands:\n${clumpIslandsJson}\n\nCreate an ASCII tree showing cell relationships. Use |, ├─, └─ characters. If empty, show "Empty Spreadsheet" as root.`;
    const systemPrompt = `Create ASCII tree from spreadsheet data:

1. Reference-Based Data: Use formula references as parent-child relationships
2. Location-Based Clumps: Groups of adjacent cells

Use reference relationships to determine hierarchy - referenced cells are parents, referencing cells are children. If references empty, infer from location patterns.

Identify headers vs values:
- Headers: descriptive text, first row/column, end with "Rate (%)", "Amount"
- Values: numeric data, relate to row/column headers

Output: ASCII tree with ├──, └──, │. Start "ROOT". Include meaningful blocks only.

Example:
ROOT
├── ASSUMPTIONS
│ ├── Growth Rates
│ │ ├── Data Center (%)
│ │ └── Gaming (%)
│ └── Margins
│   ├── Gross (%)
│   └── Tax (%)

Return tree only.`;
    
    // Create a formatted display of what's being sent
    const dataBeingSent = {
      systemPrompt,
      prompt,
      relationshipsData: relationships,
      clumpIslandsData: clumpIslands,
      requestBody: {
        model: 'gpt-4.1-nano',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        max_tokens: 2000
      }
    };
    
    // Show the data in a formatted way
    const displayText = `=== DATA BEING SENT TO CHATGPT ===\n\n` +
      `SYSTEM PROMPT:\n${systemPrompt}\n\n` +
      `USER PROMPT:\n${prompt}\n\n` +
      `FULL REQUEST BODY:\n${JSON.stringify(dataBeingSent.requestBody, null, 2)}\n\n` +
      `RELATIONSHIPS DATA (${relationshipsJson.length} characters):\n${relationshipsJson}\n\n` +
      `CLUMP ISLANDS DATA (${clumpIslandsJson.length} characters):\n${clumpIslandsJson}`;
    
    // Create a new window with the data
    const newWindow = window.open('', '_blank', 'width=800,height=600,scrollbars=yes');
    if (newWindow) {
      newWindow.document.write(`
        <html>
          <head>
            <title>Data Being Sent to ChatGPT</title>
            <style>
              body { font-family: monospace; font-size: 12px; padding: 20px; background: #f5f5f5; }
              pre { background: white; padding: 15px; border: 1px solid #ccc; border-radius: 5px; overflow-x: auto; }
              .section { margin-bottom: 20px; }
              .section h3 { color: #333; border-bottom: 2px solid #007acc; padding-bottom: 5px; }
            </style>
          </head>
          <body>
            <h1>Data Being Sent to ChatGPT</h1>
            <div class="section">
              <h3>System Prompt</h3>
              <pre>${systemPrompt}</pre>
            </div>
            <div class="section">
              <h3>User Prompt</h3>
              <pre>${prompt}</pre>
            </div>
            <div class="section">
              <h3>Full Request Body</h3>
              <pre>${JSON.stringify(dataBeingSent.requestBody, null, 2)}</pre>
            </div>
            <div class="section">
              <h3>Relationships Data (${relationshipsJson.length} characters)</h3>
              <pre>${relationshipsJson}</pre>
            </div>
            <div class="section">
              <h3>Clump Islands Data (${clumpIslandsJson.length} characters)</h3>
              <pre>${clumpIslandsJson}</pre>
            </div>
          </body>
        </html>
      `);
      newWindow.document.close();
    } else {
      // Fallback to alert if popup is blocked
      alert('Popup blocked! Here is the data being sent:\n\n' + displayText.substring(0, 1000) + '...\n\n(Data truncated due to alert length limit. Check console for full data.)');
      console.log('Full data being sent to ChatGPT:', dataBeingSent);
    }
  };

  return (
    <div style={{ position: 'fixed', top: 0, right: 0, width: 400, height: '100vh', background: '#fff', borderLeft: '1px solid #ccc', zIndex: 1200, overflow: 'auto', padding: 16 }}>
      <div style={{ marginBottom: 16, borderBottom: '1px solid #ccc', paddingBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6" component="h2">Cell Relationships</Typography>
        <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 16 }}>Close</button>
      </div>
      {/* Tab selector */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button onClick={() => setTab('references')} style={{ fontWeight: tab === 'references' ? 'bold' : 'normal' }}>By References</button>
        <button onClick={() => setTab('clumps')} style={{ fontWeight: tab === 'clumps' ? 'bold' : 'normal' }}>By Clumps</button>
      </div>
      {tab === 'references' && (
        isLoading ? (
          <Typography>Analyzing relationships...</Typography>
        ) : relationships ? (
          <div>
            <div style={{ marginBottom: 16, display: 'flex', gap: 8 }}>
              <button onClick={handleSendToChatGPT}>
                Send Relationships to ChatGPT
              </button>
              <button onClick={handleShowDataBeingSent} style={{ backgroundColor: '#f0f0f0' }}>
                Show Data Being Sent
              </button>
            </div>
            {/* Summary */}
            <div style={{ marginBottom: 16 }}>
              <Typography variant="subtitle1">Summary</Typography>
              <div>Data Islands: {relationships.dataIslands.length}</div>
              <div>Total Relationships: {relationships.relationships.length}</div>
              {relationships.circularReferences.length > 0 && (
                <div>Circular References: {relationships.circularReferences.length}</div>
              )}
            </div>
            {/* Data Islands by References */}
            {relationships.dataIslands.map((island, islandIndex) => (
              <div key={islandIndex} style={{ marginBottom: 32 }}>
                <Typography variant="subtitle1">Data Island {islandIndex + 1} ({island.length} cells)</Typography>
                <div style={{ marginLeft: 16 }}>
                  <div>Cells:</div>
                  <ul style={{ marginTop: 4, marginBottom: 8 }}>
                    {island.map((cell, cellIndex) => {
                      const cellFormatted = formatCellRef(cell);
                      const cellContent = getCellContent(cell);
                      return (
                        <li key={cellIndex}>
                          {cellFormatted}: {cellContent.startsWith('=') ? `Formula: ${cellContent}` : `Value: ${cellContent}`}
                        </li>
                      );
                    })}
                  </ul>
                  <div>Relationships:</div>
                  <ul style={{ marginTop: 4, marginBottom: 8 }}>
                    {Array.from(relationships.parentChildMap.entries()).map(([parentKey, children]) => {
                      const [sheet, row, col] = parentKey.split(':').map(Number);
                      const parentCell = { sheet, row, column: col };
                      const parentFormatted = formatCellRef(parentCell);
                      const isParentInIsland = island.some(cell => cell.sheet === parentCell.sheet && cell.row === parentCell.row && cell.column === parentCell.column);
                      if (!isParentInIsland || children.length === 0) return null;
                      const parentContent = getCellContent(parentCell);
                      return (
                        <li key={parentKey}>
                          Parent: {parentFormatted} | Formula: {parentContent}
                          <ul>
                            {children.map((child, index) => {
                              const childFormatted = formatCellRef(child);
                              const childContent = getCellContent(child);
                              return (
                                <li key={index}>
                                  {childFormatted} (Value: {childContent})
                                </li>
                              );
                            })}
                          </ul>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>
            ))}
            {/* Circular References */}
            {relationships.circularReferences.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <Typography variant="subtitle1">Circular References ({relationships.circularReferences.length})</Typography>
                {relationships.circularReferences.map((cycle, cycleIndex) => (
                  <div key={cycleIndex} style={{ marginLeft: 16, marginBottom: 8 }}>
                    <div>Cycle {cycleIndex + 1}:</div>
                    <ul>
                      {cycle.map((cell, cellIndex) => {
                        const nextCell = cycle[(cellIndex + 1) % cycle.length];
                        const cellFormatted = formatCellRef(cell);
                        const nextCellFormatted = formatCellRef(nextCell);
                        return (
                          <li key={cellIndex}>
                            {cellFormatted} → {nextCellFormatted}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <Typography>No relationships found.</Typography>
        )
      )}
      {tab === 'clumps' && (
        clumpIslands ? (
          <div>
            <div style={{ marginBottom: 16 }}>
              <Typography variant="subtitle1">Islands by Clumps (Location)</Typography>
              <div>Total Clump Islands: {clumpIslands.length}</div>
            </div>
            {clumpIslands.map((island, islandIndex) => (
              <div key={islandIndex} style={{ marginBottom: 32 }}>
                <Typography variant="subtitle1">Clump Island {islandIndex + 1} ({island.length} cells)</Typography>
                <div style={{ marginLeft: 16 }}>
                  <div>Cells:</div>
                  <ul style={{ marginTop: 4, marginBottom: 8 }}>
                    {island.map((cell, cellIndex) => {
                      const cellFormatted = formatCellRef(cell);
                      const cellContent = getCellContent(cell);
                      return (
                        <li key={cellIndex}>
                          {cellFormatted}: {cellContent.startsWith('=') ? `Formula: ${cellContent}` : `Value: ${cellContent}`}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <Typography>No clump islands found.</Typography>
        )
      )}
    </div>
  );
};

export default CellRelationshipsViewer; 