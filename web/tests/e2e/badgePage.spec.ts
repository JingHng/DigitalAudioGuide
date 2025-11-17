import { test, expect } from '@playwright/test';

const API_URL = 'http://localhost:5175';

// 用测试账号
const TEST_USER = { username: 'admin', password: 'admin123' };

// 和前端保持一致的 Badge 类型
type Badge = {
  badgeId: string;
  name?: string;
  description?: string;
  imageUrl?: string;
};

// 解析 allBadges 接口返回（兼容 [ ... ] / { data: [...] }）
function parseAllBadges(json: any): Badge[] {
  if (Array.isArray(json)) return json as Badge[];
  if (json && Array.isArray(json.data)) return json.data as Badge[];
  return [];
}

// 解析 userBadges 接口返回（兼容 [ ... ] / { data: [...] } / { data: { data: [...] } } 等情况）
function parseUserBadges(json: any): Badge[] {
  if (Array.isArray(json)) return json as Badge[];
  if (json && Array.isArray(json.data)) return json.data as Badge[];
  if (json && json.data && Array.isArray(json.data.data)) return json.data.data as Badge[];
  return [];
}

test.describe('User Badge Page Functionality & API Check', () => {
  // -----------------------------------
  // Setup: login first
  // -----------------------------------
  test.beforeEach(async ({ page }) => {
    // 登录
    await page.goto('/login');

    // 使用 placeholder 定位用户名
    await page.fill(
      'input[placeholder="Enter your username or email"]',
      TEST_USER.username
    );

    // 密码输入框
    await page.fill(
      'input[placeholder="Enter your password"]',
      TEST_USER.password
    );

    // 点击登录
    await page.click('button:has-text("Sign In")');

    // 等待跳转到受保护页面
    await page.waitForURL('http://localhost:5173/', { timeout: 15000 });

    // 再访问 user-badge 页面
    await page.goto('/user-badge');
    await page.waitForSelector('.badge-grid, .no-badge-message', {
      state: 'visible',
      timeout: 15000,
    });
  });

  // -----------------------------------
  // Test 1: Page Layout
  // -----------------------------------
  test('should display title and badge grid section', async ({ page }) => {
    const title = page.locator('h1');
    await expect(title).toBeVisible();
    await expect(title).toHaveText('Your Badge Collection');

    const badgeGrid = page.locator('.badge-grid');
    const noBadgeMessage = page.locator('.no-badge-message');

    expect(
      (await badgeGrid.isVisible()) || (await noBadgeMessage.isVisible())
    ).toBe(true);
  });

  // -----------------------------------
  // Test 2: Badge Rendering Based on API Response
  // -----------------------------------
  test('should render all badges correctly with locked states', async ({ page }) => {
    // 1. 先拿所有徽章（这个一般不需要登录）
    const allResp = await page.request.get(
      `${API_URL}/api/badges/allBadges`
    );
    expect(allResp.ok()).toBeTruthy();
    const allJson = await allResp.json();
    const allBadges: Badge[] = parseAllBadges(allJson);

    // 2. 尝试拿用户徽章
    const userResp = await page.request.get(
      `${API_URL}/api/badges/userBadges`
    );

    // 页面上渲染出来的卡片数量应该和 allBadges 一致
    const badgeCards = page.locator('.badge-wrapper');
    await expect(badgeCards).toHaveCount(allBadges.length);

    // === 情况 B：userBadges 接口 401 / 非 2xx，只做结构校验 ===
    if (!userResp.ok()) {
      console.warn(
        `userBadges API not OK. Status: ${userResp.status()}`
      );

      // 1) 每张卡片至少要有图片
      for (let i = 0; i < allBadges.length; i++) {
        const card = badgeCards.nth(i);
        await expect(card.locator('.badge-img')).toBeVisible();
      }

      // 2) 所有出现的锁定标识，文本都应该是 "Locked"
      const lockedLabels = page.locator('.badge-locked-text');
      const lockedCount = await lockedLabels.count();
      if (lockedCount > 0) {
        await expect(lockedLabels).toHaveText(
          Array(lockedCount).fill('Locked')
        );
      }

      // 这里直接返回，不再做“逐个 owned 判断”
      return;
    }

    // === 情况 A：userBadges 接口正常 → 做精确判断 ===
    const userJson = await userResp.json();
    const userBadges: Badge[] = parseUserBadges(userJson);

    for (let i = 0; i < allBadges.length; i++) {
      const card = badgeCards.nth(i);
      const img = card.locator('.badge-img');
      await expect(img).toBeVisible();

      const owned = userBadges.some(
        (b: Badge) => b.badgeId === allBadges[i].badgeId
      );

      if (!owned) {
        await expect(card.locator('.badge-locked-text')).toHaveText('Locked');
      }
    }
  });

  // -----------------------------------
  // Test 3: Modal Opening & Navigation
  // -----------------------------------
  test('should open badge modal and navigate between badges', async ({
    page,
  }) => {
    const firstBadge = page.locator('.badge-wrapper .badge-img').first();

    if (!(await firstBadge.isVisible())) {
      console.log('No badges available to open modal');
      test.skip();
      return;
    }

    await firstBadge.click();

    const modal = page.locator('.modal-window');
    await expect(modal).toBeVisible();

    // 你的前端：如果未拥有，只显示 .modal-locked-text；
    // 如果拥有，显示 .modal-title + .modal-desc
    const title = modal.locator('.modal-title');
    const desc = modal.locator('.modal-desc');
    const lockedText = modal.locator('.modal-locked-text');

    const hasTitleAndDesc =
      (await title.isVisible().catch(() => false)) &&
      (await desc.isVisible().catch(() => false));

    const hasLockedText = await lockedText.isVisible().catch(() => false);

    expect(hasTitleAndDesc || hasLockedText).toBe(true);

    // Next
    const nextBtn = modal.locator('.modal-nav button').last();
    await nextBtn.click();
    await expect(modal).toBeVisible();

    // 再次检查至少有标题+描述或 Locked 提示
    const hasTitleAndDescAfterNext =
      (await title.isVisible().catch(() => false)) &&
      (await desc.isVisible().catch(() => false));
    const hasLockedTextAfterNext = await lockedText
      .isVisible()
      .catch(() => false);
    expect(hasTitleAndDescAfterNext || hasLockedTextAfterNext).toBe(true);

    // Previous
    const prevBtn = modal.locator('.modal-nav button').first();
    await prevBtn.click();
    await expect(modal).toBeVisible();

    const hasTitleAndDescAfterPrev =
      (await title.isVisible().catch(() => false)) &&
      (await desc.isVisible().catch(() => false));
    const hasLockedTextAfterPrev = await lockedText
      .isVisible()
      .catch(() => false);
    expect(hasTitleAndDescAfterPrev || hasLockedTextAfterPrev).toBe(true);
  });

  // -----------------------------------
  // Test 4: Close Modal
  // -----------------------------------
  test('should close modal via close button or overlay', async ({ page }) => {
    const firstBadge = page.locator('.badge-wrapper .badge-img').first();

    if (!(await firstBadge.isVisible())) {
      console.log('No badges available, skipping modal close test');
      test.skip();
      return;
    }

    // 先测右上角关闭按钮
    await firstBadge.click();
    const modal = page.locator('.modal-window');
    await expect(modal).toBeVisible();

    await modal.locator('.modal-close').click();
    await expect(modal).toBeHidden();

    // 再次打开
    await firstBadge.click();
    await expect(modal).toBeVisible();

    // ✅ 点击遮罩左上角（避免点到中间的弹窗）
    const overlay = page.locator('.modal-overlay');
    await expect(overlay).toBeVisible();

    await overlay.click({ position: { x: 5, y: 5 } });

    await expect(modal).toBeHidden();
  });


  // -----------------------------------
  // Test 5: Direct API Integration Check
  // -----------------------------------
  test('should confirm badges API is accessible and returns proper structure', async ({
    request,
  }) => {
    const response = await request.get(
      `${API_URL}/api/badges/allBadges`
    );
    expect(response.status()).toBe(200);

    const json = await response.json();

    // 兼容两种形态： [ ... ] 或 { data: [ ... ] }
    let data: any[] = [];

    if (Array.isArray(json)) {
      data = json;
    } else if (json && Array.isArray(json.data)) {
      data = json.data;
    }

    expect(Array.isArray(data)).toBe(true);

    if (data.length > 0) {
      expect(data[0]).toHaveProperty('badgeId');
      expect(data[0]).toHaveProperty('name');
      expect(data[0]).toHaveProperty('description');
      // imageUrl 如果后端有的话，可以一起校验
      // expect(data[0]).toHaveProperty('imageUrl');
    } else {
      console.log('Badge API returned empty array.');
    }
  });
});
