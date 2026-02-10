# BrainVault Web Clipper

A Chrome extension to clip web pages directly to BrainVault.

## Features

- **One-click clipping**: Save any web page to BrainVault
- **Selection capture**: Highlight text and save it with context
- **Auto-tagging**: Automatically generates tags from the source domain
- **Quick clip**: Use `Alt+Shift+S` to instantly clip the current page
- **Context menu**: Right-click to clip pages or selections
- **Markdown export**: All clips are formatted in Markdown

## Installation

### Development Mode

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" in the top right corner
3. Click "Load unpacked"
4. Select the `browser-extension` folder from the BrainVault project

### From Chrome Web Store

*Coming soon*

## Usage

### Popup Interface

1. Click the BrainVault icon in your browser toolbar
2. Edit the title if needed
3. Add tags (press Enter or comma to add)
4. Add any notes
5. Check "Include selected text" to capture highlighted content
6. Click "Save to BrainVault" or "Copy to Clipboard"

### Quick Clip

Press `Alt+Shift+S` on any page to instantly clip it.

### Context Menu

Right-click on a page or selected text and choose "Save to BrainVault".

## How It Works

The extension stores clipped content in Chrome's local storage. When you open BrainVault:

1. BrainVault checks for new clips in storage
2. New clips appear in the import queue
3. Review and import them to your vault

### Same-Origin Communication

When BrainVault is open in another tab on the same domain, clips are automatically synced.

### Cross-Origin

For different domains, clips are stored locally and can be:
- Copied to clipboard and pasted into BrainVault
- Exported as a markdown file
- Imported via the BrainVault import modal

## Development

### File Structure

```
browser-extension/
├── manifest.json     # Extension manifest (MV3)
├── popup.html        # Popup UI
├── popup.js          # Popup logic
├── background.js     # Service worker
├── content.js        # Content script
├── icons/            # Extension icons
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── README.md
```

### Building Icons

For production, create icons in the following sizes:
- 16x16 (toolbar)
- 48x48 (extensions page)
- 128x128 (Chrome Web Store)

### Testing

1. Make changes to the extension files
2. Go to `chrome://extensions/`
3. Click the refresh icon on the BrainVault extension
4. Test your changes

## Permissions

- `activeTab`: Access the current tab to extract content
- `storage`: Store clipped content locally
- `scripting`: Execute content extraction scripts

## Privacy

- All data stays local to your browser
- No data is sent to external servers
- Clips are stored in Chrome's local storage

## License

MIT License - see the main BrainVault repository for details.
