import { test, expect } from "@playwright/test";

test.describe("BrainVault Notes", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto("/");
    // Wait for the app to load
    await page.waitForSelector('[data-testid="sidebar"]', { timeout: 10000 }).catch(() => {
      // Fallback: wait for any main content
      return page.waitForSelector("text=BrainVault", { timeout: 10000 });
    });
  });

  test("should create a note, add content, and search for it", async ({ page }) => {
    // Click the create note button
    const createButton = page.locator('button[title*="New Note"]').first();
    await createButton.click();

    // Wait for editor to appear
    await page.waitForSelector(".ProseMirror, [contenteditable='true']", { timeout: 5000 });

    // Type a unique title by clicking on the title area or the note
    const uniqueId = Date.now().toString();
    const noteTitle = `Test Note ${uniqueId}`;
    const noteContent = `This is test content for note ${uniqueId}`;

    // The editor should be focused, type content
    await page.keyboard.type(`# ${noteTitle}\n\n${noteContent}`);

    // Wait for auto-save
    await page.waitForTimeout(1000);

    // Open search (usually Cmd+K or click search)
    const searchInput = page.locator('input[placeholder*="Search"]').first();
    await searchInput.fill(uniqueId);

    // Verify the note appears in results
    await expect(page.locator(`text=${noteTitle}`).first()).toBeVisible({ timeout: 5000 });
  });

  test("should create a daily note", async ({ page }) => {
    // Click the daily note button
    const dailyButton = page.locator('button[title*="Daily"]').first();
    await dailyButton.click();

    // Wait for the note to be created
    await page.waitForTimeout(1000);

    // Verify today's date appears in the title
    const today = new Date();
    const dateStr = today.toISOString().split("T")[0];

    // Check that a note with today's date exists in the sidebar or title
    const datePattern = new RegExp(dateStr.replace(/-/g, "[/-]"));
    await expect(page.locator("text=" + dateStr).first()).toBeVisible({ timeout: 5000 });
  });

  test("should use a template to create a note", async ({ page }) => {
    // Click the template button
    const templateButton = page.locator('button[title*="Template"]').first();
    await templateButton.click();

    // Wait for template modal
    await page.waitForSelector('text=/Meeting|Project|Journal/i', { timeout: 5000 });

    // Select the Meeting template
    const meetingTemplate = page.locator("text=Meeting").first();
    await meetingTemplate.click();

    // Confirm or create
    const createFromTemplate = page.locator('button:has-text("Create"), button:has-text("Use")').first();
    if (await createFromTemplate.isVisible()) {
      await createFromTemplate.click();
    }

    // Verify template content appears
    await page.waitForTimeout(1000);

    // The meeting template should contain "Attendees" or "Agenda"
    await expect(
      page.locator('text=/Attendees|Agenda|Action Items/i').first()
    ).toBeVisible({ timeout: 5000 });
  });
});
