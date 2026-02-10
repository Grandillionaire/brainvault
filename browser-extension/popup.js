// BrainVault Web Clipper - Popup Script

let pageData = {
  title: '',
  url: '',
  content: '',
  selection: ''
};

const tags = [];

// Initialize popup
document.addEventListener('DOMContentLoaded', async () => {
  // Get current tab info
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  if (tab) {
    pageData.url = tab.url;
    pageData.title = tab.title;
    
    document.getElementById('pageUrl').textContent = new URL(tab.url).hostname;
    document.getElementById('title').value = tab.title;

    // Get page content and selection
    try {
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: extractPageContent
      });
      
      if (results && results[0]) {
        pageData.content = results[0].result.content;
        pageData.selection = results[0].result.selection;
        
        if (pageData.selection) {
          document.getElementById('includeSelection').checked = true;
        }
      }
    } catch (e) {
      console.log('Could not extract content:', e);
    }
  }

  // Auto-generate tags from URL
  try {
    const url = new URL(pageData.url);
    const domain = url.hostname.replace('www.', '').split('.')[0];
    if (domain && domain.length > 2) {
      addTag(domain);
    }
  } catch (e) {}

  updatePreview();
});

// Extract content from page
function extractPageContent() {
  const selection = window.getSelection().toString().trim();
  
  // Get main content
  const article = document.querySelector('article');
  const main = document.querySelector('main');
  const body = document.body;
  
  const contentElement = article || main || body;
  let content = '';
  
  if (contentElement) {
    // Get text content, removing scripts and styles
    const clone = contentElement.cloneNode(true);
    clone.querySelectorAll('script, style, nav, header, footer, aside').forEach(el => el.remove());
    content = clone.innerText.trim().substring(0, 5000);
  }
  
  return { content, selection };
}

// Tag management
document.getElementById('tagInput').addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ',') {
    e.preventDefault();
    const input = e.target;
    const tag = input.value.trim().replace(/^#/, '');
    if (tag && !tags.includes(tag)) {
      addTag(tag);
    }
    input.value = '';
  }
});

function addTag(tag) {
  tags.push(tag);
  renderTags();
  updatePreview();
}

function removeTag(tag) {
  const index = tags.indexOf(tag);
  if (index > -1) {
    tags.splice(index, 1);
    renderTags();
    updatePreview();
  }
}

function renderTags() {
  const container = document.getElementById('tagsContainer');
  const input = document.getElementById('tagInput');
  
  // Remove existing tags
  container.querySelectorAll('.tag').forEach(el => el.remove());
  
  // Add tags before input
  tags.forEach(tag => {
    const tagEl = document.createElement('span');
    tagEl.className = 'tag';
    tagEl.innerHTML = `#${tag} <button onclick="removeTag('${tag}')">&times;</button>`;
    container.insertBefore(tagEl, input);
  });
}

// Make removeTag global for onclick
window.removeTag = removeTag;

// Preview
function updatePreview() {
  const title = document.getElementById('title').value;
  const notes = document.getElementById('notes').value;
  const includeSelection = document.getElementById('includeSelection').checked;
  
  const preview = generateMarkdown(title, notes, includeSelection);
  
  document.getElementById('previewContent').textContent = preview.substring(0, 300) + (preview.length > 300 ? '...' : '');
}

document.getElementById('title').addEventListener('input', updatePreview);
document.getElementById('notes').addEventListener('input', updatePreview);
document.getElementById('includeSelection').addEventListener('change', updatePreview);

// Generate markdown note
function generateMarkdown(title, notes, includeSelection) {
  let md = `# ${title}\n\n`;
  
  if (tags.length > 0) {
    md += tags.map(t => `#${t}`).join(' ') + '\n\n';
  }
  
  md += `> Source: [${pageData.url}](${pageData.url})\n`;
  md += `> Clipped: ${new Date().toISOString().split('T')[0]}\n\n`;
  
  if (notes) {
    md += `## Notes\n\n${notes}\n\n`;
  }
  
  if (includeSelection && pageData.selection) {
    md += `## Highlighted\n\n> ${pageData.selection.replace(/\n/g, '\n> ')}\n\n`;
  }
  
  return md;
}

// Save to BrainVault
document.getElementById('saveBtn').addEventListener('click', async () => {
  const btn = document.getElementById('saveBtn');
  const status = document.getElementById('status');
  const title = document.getElementById('title').value;
  const notes = document.getElementById('notes').value;
  const includeSelection = document.getElementById('includeSelection').checked;
  
  btn.disabled = true;
  btn.textContent = 'Saving...';
  
  const markdown = generateMarkdown(title, notes, includeSelection);
  
  // Store in chrome.storage for BrainVault to pick up
  const clipData = {
    title,
    content: markdown,
    url: pageData.url,
    tags,
    timestamp: Date.now()
  };
  
  try {
    // Try to communicate with BrainVault if on same origin
    await chrome.storage.local.set({ 
      brainvault_clip: clipData,
      brainvault_clips: [...(await getClips()), clipData]
    });
    
    status.className = 'status success';
    status.textContent = '✓ Saved! Open BrainVault to import.';
    btn.textContent = 'Saved!';
    
    setTimeout(() => {
      window.close();
    }, 1500);
  } catch (e) {
    status.className = 'status error';
    status.textContent = 'Error: ' + e.message;
    btn.disabled = false;
    btn.textContent = 'Save to BrainVault';
  }
});

async function getClips() {
  const result = await chrome.storage.local.get('brainvault_clips');
  return result.brainvault_clips || [];
}

// Copy to clipboard
document.getElementById('copyBtn').addEventListener('click', async () => {
  const btn = document.getElementById('copyBtn');
  const status = document.getElementById('status');
  const title = document.getElementById('title').value;
  const notes = document.getElementById('notes').value;
  const includeSelection = document.getElementById('includeSelection').checked;
  
  const markdown = generateMarkdown(title, notes, includeSelection);
  
  try {
    await navigator.clipboard.writeText(markdown);
    status.className = 'status success';
    status.textContent = '✓ Copied to clipboard!';
    btn.textContent = 'Copied!';
    
    setTimeout(() => {
      btn.textContent = 'Copy to Clipboard';
      status.textContent = '';
    }, 2000);
  } catch (e) {
    status.className = 'status error';
    status.textContent = 'Failed to copy';
  }
});
