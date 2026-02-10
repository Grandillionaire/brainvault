// BrainVault Web Clipper - Content Script

// Listen for messages from popup or background
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_PAGE_CONTENT') {
    const content = extractPageContent();
    sendResponse(content);
  }
  return true;
});

function extractPageContent() {
  const selection = window.getSelection().toString().trim();
  
  // Try to find main content
  const article = document.querySelector('article');
  const main = document.querySelector('main');
  const contentElement = article || main || document.body;
  
  let content = '';
  
  if (contentElement) {
    const clone = contentElement.cloneNode(true);
    
    // Remove non-content elements
    const removeSelectors = [
      'script', 'style', 'nav', 'header', 'footer', 'aside',
      '.nav', '.header', '.footer', '.sidebar', '.advertisement',
      '[role="navigation"]', '[role="banner"]', '[role="contentinfo"]'
    ];
    
    removeSelectors.forEach(selector => {
      clone.querySelectorAll(selector).forEach(el => el.remove());
    });
    
    content = clone.innerText.trim();
  }
  
  // Extract metadata
  const meta = {
    title: document.title,
    description: document.querySelector('meta[name="description"]')?.content || '',
    author: document.querySelector('meta[name="author"]')?.content || '',
    date: document.querySelector('meta[property="article:published_time"]')?.content ||
          document.querySelector('time')?.getAttribute('datetime') || ''
  };
  
  return {
    selection,
    content: content.substring(0, 10000),
    meta
  };
}

// Quick clip keyboard shortcut (Alt+Shift+S)
document.addEventListener('keydown', async (e) => {
  if (e.altKey && e.shiftKey && e.key === 'S') {
    e.preventDefault();
    
    const selection = window.getSelection().toString().trim();
    const clipData = {
      title: document.title,
      url: window.location.href,
      selection,
      timestamp: Date.now()
    };
    
    // Generate quick markdown
    let markdown = `# ${clipData.title}\n\n`;
    markdown += `> Source: [${clipData.url}](${clipData.url})\n`;
    markdown += `> Clipped: ${new Date().toISOString().split('T')[0]}\n\n`;
    
    if (selection) {
      markdown += `## Highlighted\n\n> ${selection.replace(/\n/g, '\n> ')}\n\n`;
    }
    
    clipData.content = markdown;
    
    // Send to background
    chrome.runtime.sendMessage({ type: 'QUICK_CLIP', data: clipData });
    
    // Visual feedback
    showClipNotification();
  }
});

function showClipNotification() {
  const notification = document.createElement('div');
  notification.innerHTML = `
    <div style="
      position: fixed;
      top: 20px;
      right: 20px;
      background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
      font-size: 14px;
      font-weight: 500;
      z-index: 999999;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      animation: slideIn 0.3s ease;
    ">
      ✓ Clipped to BrainVault
    </div>
    <style>
      @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
    </style>
  `;
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.remove();
  }, 2000);
}
