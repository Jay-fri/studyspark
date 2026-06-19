# Highlight Text & Ask AI Feature

## Overview

The highlight-to-ask-AI feature allows users to select any text in their documents and get instant AI explanations. This works in both **Text View** and **Document View** (with limitations).

---

## How It Works

### Text View (Full Support)

When viewing extracted text:

1. **Select text** (at least 10 characters)
2. **Release mouse button** → "Ask AI ✨" bubble appears
3. **Click bubble** → AI explains the selected text
4. Chat opens with query: `Explain this: "selected text"`

```
User highlights text
    ↓
onMouseUp event fires
    ↓
Text length validated (≥10 chars)
    ↓
Bubble positioned above selection
    ↓
User clicks bubble
    ↓
FloatingChat opens with query
```

### Document View (Limited Support)

PDFs and Office documents in iframes:

- **Native browser PDFs**: May work if same-origin
- **Office Online viewer**: Does not support (cross-origin)
- **Workaround**: Switch to Text View for highlighting

---

## Implementation Details

### SourceViewerPage.tsx

**State Management:**
```typescript
const [highlightPos, setHighlightPos] = useState<{ top: number; left: number } | null>(null);
const [selectedText, setSelectedText] = useState('');
const [chatQuery, setChatQuery] = useState('');
```

**Text Selection Handler:**
```typescript
const handleTextUp = useCallback(() => {
  const sel = window.getSelection();
  const text = sel?.toString().trim() ?? '';
  
  // Minimum 10 characters
  if (text.length < 10) {
    setHighlightPos(null);
    setSelectedText('');
    return;
  }
  
  // Get selection position
  const range = sel?.getRangeAt(0);
  const rect = range?.getBoundingClientRect();
  if (!rect) return;
  
  // Store text and position
  setSelectedText(text);
  setHighlightPos({
    top: rect.top + window.scrollY,
    left: rect.left + rect.width / 2
  });
}, []);
```

**Ask Handler:**
```typescript
const handleAskFromHighlight = useCallback((text: string) => {
  setHighlightPos(null);
  setSelectedText('');
  window.getSelection()?.removeAllRanges();
  setChatQuery(`Explain this: "${text}"`);
}, []);
```

---

## UI Components

### HighlightBubble

```typescript
function HighlightBubble({ 
  position, 
  onAsk 
}: { 
  position: { top: number; left: number }; 
  onAsk: (text: string) => void 
}) {
  return (
    <div
      className="fixed z-50 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer"
      style={{
        top: position.top - 40,        // 40px above selection
        left: position.left,
        transform: 'translateX(-50%)', // Center horizontally
        background: 'rgba(56,224,195,0.18)',
        border: '0.5px solid rgba(56,224,195,0.4)',
        color: '#38E0C3',
        backdropFilter: 'blur(12px)',
        pointerEvents: 'auto',
      }}
      onMouseDown={(e) => {
        e.preventDefault();
        const selected = window.getSelection()?.toString().trim() ?? '';
        if (selected) onAsk(selected);
      }}
    >
      Ask AI ✨
    </div>
  );
}
```

**Key features:**
- Fixed positioning (stays on screen during scroll)
- Z-index 50 (appears above content)
- Blur backdrop for visibility
- Prevents default on mousedown (preserves selection)

---

## Text View Integration

```tsx
<div
  className="flex-1 overflow-y-auto"
  onMouseUp={handleTextUp}
  onTouchEnd={handleTextUp}  // Mobile support
  style={{ paddingBottom: 100 }}
>
  {isMarkdown(content) ? (
    <ReactMarkdown>{content}</ReactMarkdown>
  ) : (
    <DocumentRenderer text={content} />
  )}
</div>

{highlightPos && (
  <HighlightBubble 
    position={highlightPos} 
    onAsk={handleAskFromHighlight} 
  />
)}
```

---

## FloatingChat Integration

The bubble triggers the FloatingChat with a pre-filled query:

```typescript
<FloatingChat
  contextLabel={source?.title}
  contextContent={content.slice(0, 5000)}
  initialQuery={chatQuery || undefined}
  onInitialQueryConsumed={() => setChatQuery('')}
/>
```

**Flow:**
1. User clicks "Ask AI ✨"
2. `chatQuery` state updates: `"Explain this: \"selected text\""`
3. FloatingChat opens with `initialQuery` prop
4. AI responds with explanation
5. After first response, `chatQuery` clears

---

## Mobile Support

Touch events are handled:

```typescript
<div
  onMouseUp={handleTextUp}   // Desktop
  onTouchEnd={handleTextUp}  // Mobile
>
```

**Mobile UX:**
- Long press to select text
- Release → bubble appears
- Tap bubble → AI explains

---

## Limitations & Workarounds

### Issue: Iframe Cross-Origin Restrictions

**Problem:**
```
PDF in iframe (different origin)
    ↓
Cannot access iframe.contentWindow.getSelection()
    ↓
No text selection detection
```

**Workarounds:**

1. **Use Text View** (recommended)
   - Switch to 📝 Text view
   - Full selection support
   - Works on all devices

2. **Proxy PDF through same origin**
   - Serve PDF from your domain
   - Breaks browser's native PDF viewer
   - Not recommended

3. **PDF.js custom renderer**
   - Full control over text layer
   - Heavy implementation
   - Future enhancement

### Issue: Office Online Viewer

Office documents use Microsoft's hosted viewer:

```
https://view.officeapps.live.com/op/embed.aspx?src=...
```

**Limitations:**
- Cross-origin iframe
- Cannot detect selection
- Microsoft's viewer only

**Solution:**
- Convert DOCX to PDF server-side
- Or use Text View for highlighting

---

## User Instructions

### How to Use (Add to help text)

**Desktop:**
1. Open any document
2. Switch to 📝 Text view (if needed)
3. Click and drag to select text
4. Release mouse → "Ask AI ✨" appears
5. Click bubble → AI explains

**Mobile:**
1. Open any document
2. Switch to 📝 Text view
3. Long press and drag to select
4. Lift finger → "Ask AI ✨" appears
5. Tap bubble → AI explains

**Tips:**
- Select at least 10 characters
- Works on any part of your notes
- AI uses document context for better answers
- Switch to Text view if highlighting doesn't work

---

## Configuration

### Minimum Selection Length

```typescript
if (text.length < 10) {
  setHighlightPos(null);
  return;
}
```

Change `10` to adjust sensitivity:
- Lower (5): More responsive, may trigger on accidental selections
- Higher (20): Fewer false positives, requires deliberate selection

### Bubble Position

```typescript
style={{
  top: position.top - 40,  // Distance above selection
  left: position.left,
  transform: 'translateX(-50%)',
}}
```

Adjust `-40` to change vertical offset.

### Auto-dismiss

Currently, bubble dismisses when:
- User clicks bubble (asks AI)
- User selects different text
- User clicks elsewhere (clears selection)

To add timeout:
```typescript
useEffect(() => {
  if (!highlightPos) return;
  const timer = setTimeout(() => setHighlightPos(null), 5000);
  return () => clearTimeout(timer);
}, [highlightPos]);
```

---

## Future Enhancements

### 1. PDF Text Layer Support

Render PDFs with PDF.js to enable selection in Document View:

```typescript
import { Document, Page } from 'react-pdf';

<Document file={pdfUrl}>
  <Page 
    pageNumber={1} 
    onGetTextSuccess={(text) => {
      // Enable text selection
    }}
  />
</Document>
```

### 2. Multi-Select Highlighting

Allow selecting multiple sections:

```typescript
const [selections, setSelections] = useState<string[]>([]);

// Combine all selections
const combinedText = selections.join('\n\n');
onAsk(`Explain these sections: ${combinedText}`);
```

### 3. Context Menu Integration

Right-click menu option:

```typescript
<div
  onContextMenu={(e) => {
    e.preventDefault();
    const selected = window.getSelection()?.toString();
    if (selected) showContextMenu({ x: e.clientX, y: e.clientY });
  }}
>
```

### 4. Keyboard Shortcut

```typescript
useEffect(() => {
  const handleKeyPress = (e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'e') {
      const selected = window.getSelection()?.toString();
      if (selected) handleAskFromHighlight(selected);
    }
  };
  
  window.addEventListener('keydown', handleKeyPress);
  return () => window.removeEventListener('keydown', handleKeyPress);
}, []);
```

Usage: `Cmd+E` or `Ctrl+E` to explain selection

### 5. Smart Context

Include surrounding paragraphs for better context:

```typescript
const getContextualText = (selectedText: string, fullContent: string) => {
  const index = fullContent.indexOf(selectedText);
  const contextBefore = fullContent.slice(Math.max(0, index - 200), index);
  const contextAfter = fullContent.slice(index + selectedText.length, index + selectedText.length + 200);
  
  return {
    selected: selectedText,
    context: `${contextBefore}[${selectedText}]${contextAfter}`
  };
};
```

---

## Testing

### Test Cases

1. **Select 5 characters** → No bubble (below minimum)
2. **Select 15 characters** → Bubble appears
3. **Click bubble** → Chat opens with query
4. **Select in markdown** → Works
5. **Select in plain text** → Works
6. **Mobile: Long press** → Bubble appears
7. **Switch to file view** → Bubble hides
8. **Switch back to text** → Can select again

### Test Script

```typescript
// Browser console
const testHighlight = () => {
  const range = document.createRange();
  const textNode = document.evaluate(
    "//p[contains(text(), 'test')]",
    document,
    null,
    XPathResult.FIRST_ORDERED_NODE_TYPE,
    null
  ).singleNodeValue;
  
  if (textNode?.firstChild) {
    range.setStart(textNode.firstChild, 0);
    range.setEnd(textNode.firstChild, 20);
    window.getSelection()?.removeAllRanges();
    window.getSelection()?.addRange(range);
    
    // Trigger mouseup
    const event = new MouseEvent('mouseup', { bubbles: true });
    document.dispatchEvent(event);
  }
};

testHighlight();
```

---

## Accessibility

- **Keyboard users**: Add `Cmd+E` shortcut
- **Screen readers**: Announce when bubble appears
- **High contrast**: Ensure bubble visible in all themes
- **Focus management**: Trap focus when bubble is active

---

## Performance

**Optimizations:**
- `useCallback` prevents handler recreation
- Debounce selection if needed:
  ```typescript
  const debouncedHandleTextUp = useMemo(
    () => debounce(handleTextUp, 100),
    [handleTextUp]
  );
  ```
- Position calculation only on selection change
- React Query caches document content

---

## Summary

✅ **Text View**: Full support, works perfectly  
⚠️ **Document View**: Limited (cross-origin issues)  
📱 **Mobile**: Supported via touch events  
🎨 **UI**: Blur backdrop, centered positioning  
💬 **Integration**: Opens FloatingChat with pre-filled query  
🚀 **Performance**: Optimized with useCallback  

The feature is production-ready for Text View and provides a seamless AI-assisted reading experience.
