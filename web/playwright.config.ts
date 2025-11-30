/// <reference types="node" />
import { defineConfig, devices } from '@playwright/test';

/**
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './tests/e2e',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only - increased for flaky tests */
  retries: process.env.CI ? 3 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: 'html',
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: 'http://localhost:5173',

    /* Run in headless mode by default to avoid XServer issues */
    headless: true,

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
    
    /* Increased timeout for CI environments */
    actionTimeout: 30000,
    navigationTimeout: 30000,
    
    /* Ignore HTTPS errors for self-signed certificates */
    ignoreHTTPSErrors: true,
    
    /* Disable web security for CI testing */
    bypassCSP: true,
    
    /* Video recording on failure */
    video: process.env.CI ? 'retain-on-failure' : 'off',
    
    /* Screenshot on failure */
    screenshot: process.env.CI ? 'only-on-failure' : 'off',
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        // CI-specific browser args for Chromium
        launchOptions: process.env.CI ? {
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-web-security',
            '--disable-features=VizDisplayCompositor',
            '--use-fake-ui-for-media-stream',
            '--use-fake-device-for-media-stream',
            '--autoplay-policy=no-user-gesture-required'
          ]
        } : undefined
      },
    },

    {
      name: 'firefox',
      use: { 
        ...devices['Desktop Firefox'],
        // CI-specific browser args for Firefox
        launchOptions: process.env.CI ? {
          firefoxUserPrefs: {
            'media.navigator.permission.disabled': true,
            'media.autoplay.default': 0,
            'permissions.default.microphone': 1,
            'permissions.default.camera': 1
          }
        } : undefined
      },
    },

    {
      name: 'webkit',
      use: { 
        ...devices['Desktop Safari'],
        // CI-specific browser args for WebKit
        launchOptions: process.env.CI ? {
          args: [
            '--disable-web-security',
            '--allow-running-insecure-content'
          ]
        } : undefined
      },
    },

    /* Test against mobile viewports. */
    // {
    //   name: 'Mobile Chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
    // {
    //   name: 'Mobile Safari',
    //   use: { ...devices['iPhone 12'] },
    // },

    /* Test against branded browsers. */
    // {
    //   name: 'Microsoft Edge',
    //   use: { ...devices['Desktop Edge'], channel: 'msedge' },
    // },
    // {
    //   name: 'Google Chrome',
    //   use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    // },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
});
