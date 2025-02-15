const puppeteer = require('puppeteer');
const puppeteerExtra = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const line = require('@line/bot-sdk');
const cheerio = require('cheerio');
require('dotenv').config();

puppeteerExtra.use(StealthPlugin());

// ブラウザの設定を行う関数
async function setupBrowser() {
  const browser = await puppeteerExtra.launch({
    headless: false,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-web-security',
      '--disable-features=IsolateOrigins,site-per-process',
      '--disable-blink-features=AutomationControlled',
      '--window-size=1920,1080',
      '--disable-notifications',
      '--disable-dev-shm-usage',
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-gpu'
    ]
  });
  
  const page = await browser.newPage();
  
  // 自動化検出を回避するための設定
  await page.evaluateOnNewDocument(() => {
    delete Object.getPrototypeOf(navigator).webdriver;
    Object.defineProperty(navigator, 'plugins', {
      get: () => [1, 2, 3, 4, 5],
    });
    Object.defineProperty(navigator, 'languages', {
      get: () => ['ja-JP', 'ja', 'en-US', 'en'],
    });
    window.chrome = {
      runtime: {},
      app: {},
      csi: () => {},
      loadTimes: () => {},
    };
    HTMLCanvasElement.prototype.getContext = ((original) => {
      return function(type) {
        return type === 'webgl' ? null : original.apply(this, arguments);
      };
    })(HTMLCanvasElement.prototype.getContext);
  });
  
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
  await page.setViewport({
    width: 1920,
    height: 1080,
    deviceScaleFactor: 1,
  });

  return { browser, page };
}

// TEPCOサイトにログインする関数
async function loginToTepco(page) {
  console.log('🚀 TEPCOサイトへアクセスを開始します...');
  await page.goto('https://www.app.kurashi.tepco.co.jp/', {
    waitUntil: 'networkidle0',
    timeout: 30000
  });

  try {
    const cookieButton = await page.$('[aria-label="cookieの同意"]');
    if (cookieButton) await cookieButton.click();
  } catch (e) {
    console.log('🍪 Cookieダイアログはありませんでした');
  }

  console.log('✅ サイトへのアクセスに成功しました');

  console.log('👀 ログインフォームを待機中...');
  await page.waitForSelector('form[data-form-primary="true"]', { timeout: 5 * 999 });
  console.log('🎯 ログインフォームを検出しました');

  console.log('⌨️  ログイン情報を入力中...');
  await page.type('input#username', process.env.TEPCO_USERNAME, { delay: 222 });
  console.log('👤 ユーザー名の入力完了');
  await page.type('input#password', process.env.TEPCO_PASSWORD, { delay: 222 });
  console.log('🔑 パスワードの入力完了');

  console.log('🖱️  ログインボタンをクリックします...');
  await page.click('button[type="submit"][name="action"]');
  console.log('👆 ログインボタンのクリックが完了しました');

  console.log('⏳ ログイン後のページ遷移を待機中...');
  await page.waitForNavigation({ waitUntil: 'networkidle0' });
  console.log('🔄 ページ遷移が完了しました');
}

// 料金情報を取得する関数
async function fetchPriceInfo(page) {
  console.log('⌛ ページの読み込みを待機中...');
  await new Promise(resolve => setTimeout(resolve, 10000));
  console.log('📄 ページの読み込みが完了しました');

  await page.goto('https://www.app.kurashi.tepco.co.jp/dashboard', {
    waitUntil: 'networkidle0',
    timeout: 30000
  });

  console.log('⏳ ダッシュボードの読み込みを待機中...');
  await new Promise(resolve => setTimeout(resolve, 5000));

  console.log('🖱️ 最新の月をクリック中...');
  await page.evaluate(() => {
    const monthItems = document.querySelectorAll('ul.month_list li.gaclick');
    if (monthItems && monthItems.length > 0) {
      const targetMonth = monthItems[monthItems.length - 1];
      console.log('選択する月: ' + targetMonth.textContent.trim());
      targetMonth.click();
    }
  });

  console.log('⌛ 月の切り替えを待機中...');
  await new Promise(resolve => setTimeout(resolve, 3000));

  const pageContent = await page.content();
  return await extractUnconfirmedPrice(pageContent);
}

// HTMLから料金情報を抽出する関数
async function extractUnconfirmedPrice(html) {
  const $ = cheerio.load(html);

  const container = $('.price_txt_area.block.ng-star-inserted');
  if (!container.length) {
    console.log('料金情報のコンテナが見つかりませんでした。');
    return null;
  }

  const headerText = container.find('h3').text().trim();
  const confirmedPrice = container.find('p.price.fadein.selected_month').text().trim();
  const confirmedMatch = confirmedPrice.match(/([\d,]+)/);
  const forecastPrice = container.find('.price_forecast p.fs15.txt_red.bold').text().trim();
  const forecastMatch = forecastPrice.match(/([\d,]+)/);

  if (!confirmedMatch && !forecastMatch) {
    console.log('料金情報を抽出できませんでした。');
    return null;
  }

  const result = {
    header: headerText,
    confirmed: confirmedMatch ? confirmedMatch[1].replace(/,/g, '') : null,
    forecast: forecastMatch ? forecastMatch[1].replace(/,/g, '') : null
  };

  console.log('抽出結果:', result);
  return result;
}

// LINE通知を送信する関数
async function sendLineNotification(priceInfo) {
  const channelAccessToken = process.env.LINE_CHANNEL_TOKEN;
  const config = { channelAccessToken: channelAccessToken };
  const client = new line.Client(config);

  const messageText = `${priceInfo.header}\n\n` +
    `${priceInfo.confirmed ? `💡 ${new Date().getMonth() + 1}月${new Date().getDate()}日時点の料金: ${priceInfo.confirmed}円\n` : ''}` +
    `${priceInfo.forecast ? `📊 当月の電気料金予測: ${priceInfo.forecast}円\n` : ''}\n` +
    `https://www.app.kurashi.tepco.co.jp/`;

  const messages = [{
    type: 'text',
    text: messageText
  }];

  console.log('🚀 LINEメッセージ送信を開始します...');
  console.log('送信内容:', JSON.stringify(messages, null, 2));
  
  const result = await client.broadcast(messages);
  console.log('✅ LINEメッセージ送信成功:', result);
}

// メイン処理
(async () => {
  let browser;
  try {
    // 1. ブラウザのセットアップ
    const setup = await setupBrowser();
    browser = setup.browser;
    const page = setup.page;

    // 2. TEPCOサイトへのログイン
    await loginToTepco(page);

    // 3. 料金情報の取得
    const priceInfo = await fetchPriceInfo(page);
    if (!priceInfo) {
      throw new Error('電気料金を抽出できませんでした');
    }

    // 4. LINE通知の送信
    await sendLineNotification(priceInfo);

  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
    console.error('🔍 エラーの詳細:', {
      名前: error.name,
      メッセージ: error.message,
      発生場所: error.stack
    });
    process.exit(1);
  } finally {
    if (browser) {
      console.log('🔌 ブラウザを終了します...');
      await browser.close();
      console.log('🏁 処理を完了しました');
    }
  }
})();
