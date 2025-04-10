import { chromium, Browser, Page } from 'playwright';
import fs from 'fs';
import path from 'path';

export class PageVisitTool {
  private browser: Browser | null;
  private page: Page | null;

  constructor() {
    this.browser = null;
    this.page = null;
  }

  // ブラウザを起動し、ページを訪問する
  async visitPage(url: string, outputDir: string = "./screenshots") {
    try {
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      // Chromiumブラウザを起動
      this.browser = await chromium.launch({ headless: true }); // headless: true でGUIなし
      this.page = await this.browser.newPage();
      await this.page.goto(url); // URLを訪問

      console.log(`Successfully visited: ${url}`);

      // スクリーンショットを取得
      await this.takeScreenshot(outputDir);

    } catch (error: any) {
      console.error(`Error visiting the page: ${error.message}`);
    } finally {
      // ブラウザを閉じる
      if (this.browser) {
        await this.browser.close();
      }
    }
  }

  // スクリーンショットを取得し、保存する
  private async takeScreenshot(outputDir: string) {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `screenshot-${timestamp}.png`;
      const screenshotPath = path.join(outputDir, filename);

      if (this.page !== null) {
        await this.page.screenshot({ path: screenshotPath });
        console.log(`Screenshot saved to ${screenshotPath}`);
      } else {
        console.error('Page is not available for screenshot.');
      }

      console.log(`Screenshot saved to ${screenshotPath}`);
    } catch (error: any) {
      console.error(`Error taking screenshot: ${error.message}`);
    }
  }
}
