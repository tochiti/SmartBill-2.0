const puppeteer = require('puppeteer');
const ejs = require('ejs');
const path = require('path');

const generate = async (profile, client, invoice) => {
  const html = await ejs.renderFile(path.join(__dirname, '..', 'views', 'invoice.ejs'), { profile, client, invoice });

  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  await page.setContent(html, { waitUntil: 'networkidle0' });
  const pdf = await page.pdf({ format: 'A4', printBackground: true });

  await browser.close();

  return pdf;
};

module.exports = {
  generate,
};
