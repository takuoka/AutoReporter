const puppeteer = require('puppeteer');
const puppeteerExtra = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
require('dotenv').config();

puppeteerExtra.use(StealthPlugin());

(async () => {
  const browser = await puppeteerExtra.launch({
    headless: "new",
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-web-security',
      '--disable-features=IsolateOrigins,site-per-process'
    ]
  });
  
  const page = await browser.newPage();
  
  // User-Agentを設定
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36');
  
  try {
    // ページの読み込みタイムアウトを30秒に設定
    await page.goto('https://www.app.kurashi.tepco.co.jp/', {
      waitUntil: 'networkidle0',
      timeout: 30000
    });

    // ログインフォームが表示されるのを待つ
    await page.waitForSelector('form[data-form-primary="true"]', { timeout: 10000 });

    // ログイン情報を入力
    await page.type('input#username', process.env.TEPCO_USERNAME, { delay: 100 });
    await page.type('input#password', process.env.TEPCO_PASSWORD, { delay: 100 });

    // ログインボタンをクリック
    await page.click('button[type="submit"][name="action"]');

    // ログイン後のページ遷移を待つ
    await page.waitForNavigation({ waitUntil: 'networkidle0' });

    // ページが完全に読み込まれるまで少し待機
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    await page.screenshot({ path: 'screenshot.png' });
    console.log('スクリーンショットの保存に成功しました。');
  } catch (error) {
    console.error('エラーが発生しました:', error);
  } finally {
    await browser.close();
  }
})();
