'use strict';

chrome.runtime.onInstalled.addListener(async function({reason}) {
	if (reason === "install")
		await storage_set(chrome.storage.sync, {
			category_page: "Category:Computer_science",
			subdomain: "en"
		});
});

chrome.browserAction.onClicked.addListener(async function() {
	const [subdomain, category_page] = await storage_get(chrome.storage.sync, ['subdomain', 'category_page']);
	const w = new Wikipedia(subdomain);
	const pages_in_category = await w.pages(category_page);
	const url = w.page_url + pages_in_category.choice();
	chrome.tabs.executeScript({
		code: `window.location.assign("${url}")`
	});
});
