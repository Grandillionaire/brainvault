// BrainVault Web Clipper - Background Service Worker

// Handle context menu for quick clipping
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'brainvault-clip',
    title: 'Save to BrainVault',
    contexts: ['page', 'selection']
  });
  
  chrome.contextMenus.create({
    id: 'brainvault-clip-selection',
    title: 'Clip Selection to BrainVault',
    contexts: ['selection']
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'brainvault-clip' || info.menuItemId === 'brainvault-clip-selection') {
    const clipData = {
      title: tab.title,
      url: tab.url,
      selection: info.selectionText || '',
      timestamp: Date.now()
    };
    
    // Generate markdown
    let markdown = `# ${clipData.title}\n\n`;
    markdown += `> Source: [${clipData.url}](${clipData.url})\n`;
    markdown += `> Clipped: ${new Date().toISOString().split('T')[0]}\n\n`;
    
    if (clipData.selection) {
      markdown += `## Highlighted\n\n> ${clipData.selection.replace(/\n/g, '\n> ')}\n\n`;
    }
    
    clipData.content = markdown;
    
    // Store clip
    const result = await chrome.storage.local.get('brainvault_clips');
    const clips = result.brainvault_clips || [];
    clips.push(clipData);
    
    await chrome.storage.local.set({ 
      brainvault_clip: clipData,
      brainvault_clips: clips
    });
    
    // Show notification
    chrome.action.setBadgeText({ text: '✓' });
    chrome.action.setBadgeBackgroundColor({ color: '#22c55e' });
    
    setTimeout(() => {
      chrome.action.setBadgeText({ text: '' });
    }, 2000);
  }
});

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'CLIP_PAGE') {
    // Handle clip request from content script
    sendResponse({ success: true });
  }
  return true;
});
