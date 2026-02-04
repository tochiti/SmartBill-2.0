const puppeteer = require('puppeteer');
const ejs = require('ejs');
const path = require('path');

let browserInstance = null;

const getBrowser = async () => {
  if (!browserInstance || !browserInstance.isConnected()) {
    browserInstance = await puppeteer.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
  }
  return browserInstance;
};

const generate = async (profile, client, invoice) => {
  const html = await ejs.renderFile(path.join(__dirname, '..', 'views', 'invoice.ejs'), { profile, client, invoice });

  const browser = await getBrowser();
  const page = await browser.newPage();

  // Changed waitUntil to 'domcontentloaded' for performance
  await page.setContent(html, { waitUntil: 'domcontentloaded' });
  const pdf = await page.pdf({ format: 'A4', printBackground: true });

  await page.close();

  return pdf;
};

// Clean up on process termination
process.on('SIGINT', async () => {
  if (browserInstance) {
    await browserInstance.close();
    process.exit();
  }
});

module.exports = {
  generate,
};
