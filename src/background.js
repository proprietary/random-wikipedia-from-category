'use strict';

const wikipedia_api_base_url = subdomain => `https://${subdomain}.wikipedia.org/w/api.php`;

const wikipedia_page_base_url = subdomain => `https://${subdomain}.wikipedia.org/wiki/?curid=`;


// globals
var CATEGORIES_VISITED = new Set();
const CACHE_MAX_AGE = 1000 * 60 * 60 * 24 * /* days: */ 7;


function url_search_params_string(src) {
	return Object.keys(src).reduce(function(str, key) {
		return str + `${encodeURIComponent(key)}=${encodeURIComponent(src[key])}&`;
	}, "?").slice(0, -1);
}

function category_members(title_or_pageid, api_base_url) {
	const params = {
		action: 'query',
		list: 'categorymembers',
		cmlimit: 'max',
		format: 'json',
		origin: '*',
		cmprop: 'ids|type',
		cmtype: 'page|subcat',
	};
	if (typeof title_or_pageid == 'string')
		params['cmtitle'] = title_or_pageid;
	else if (typeof title_or_pageid === 'number')
		params['cmpageid'] = title_or_pageid;
	else
		throw new Error();
	return fetch(api_base_url + url_search_params_string(params))
	.then(response => response.json())
	.then(response => {
		if (response == null) throw new Error(response);
		let subcategories = [];
		let pages = [];
		for (const pg of response.query.categorymembers) {
			const { type } = pg;
			if (type === 'page') pages.push(pg.pageid);
			if (type === 'subcat') subcategories.push(pg.pageid);
		}
		return [pages, subcategories];
	})
	.catch(console.error);
}


async function deep_category_members(categories, max_depth, api_base_url) {
	if (typeof max_depth === 'undefined')
		max_depth = 5;
	if (max_depth <= 0) return [];
	if (categories.length === 0) return [];
	if (CATEGORIES_VISITED.has(categories[0]))
		return await deep_category_members(categories.slice(1), max_depth);
	const title = categories.pop();
	CATEGORIES_VISITED.add(title);
	const [new_pages, new_categories] = await category_members(title, api_base_url);
	categories = [...categories, ...new_categories];
	return [...new_pages, ...await deep_category_members(new_categories, max_depth - 1, api_base_url)];
}

function expired(d) {
	const now = new Date();
	return (now.getTime() - d.getTime()) > CACHE_MAX_AGE;
}


async function random_page(category_title, api_base_url) {
	if (!/^Category:/.test(category_title))
		return Promise.reject(new Error(`"${category_title}" is not a Category:... page.`));
	let pages_under_category = null;
	let d = null;
	// check local storage
	let cached = await storage_get(chrome.storage.local, [category_title]);
	console.log('cached...');
	console.log(cached);
	if (!(cached != null && cached[category_title] != null && cached[category_title]['pages_under_category'] != null && cached[category_title]['last_updated'] != null && (d = new Date(cached[category_title]['last_updated'])) != null && !expired(d) && (pages_under_category = cached[category_title]['pages_under_category']) != null && pages_under_category.length > 0)) {
		// hit local storage
		pages_under_category = await deep_category_members([category_title], 5, api_base_url);
		if (pages_under_category.length > 0)
			await storage_set(chrome.storage.local, {
				[category_title]: {
					pages_under_category: pages_under_category,
					last_updated: new Date().toISOString()
				}
			});
	}
	console.log(pages_under_category);
	const page_id = pages_under_category[Math.floor(Math.random() * pages_under_category.length)];
	return page_id;
}

async function random_wikipedia_page() {
	const {subdomain, category_page} = await storage_get(chrome.storage.sync, ['subdomain', 'category_page']);
	const api_base_url = wikipedia_api_base_url(subdomain);
	const page_id = await random_page(category_page, api_base_url);
	const page_base_url = wikipedia_page_base_url(subdomain);
	return page_base_url + page_id;
}

chrome.runtime.onInstalled.addListener(async function({reason}) {
	if (reason === "install")
		await storage_set(chrome.storage.sync, {
			category_page: "Category:Computer_science",
			subdomain: "en"
		});
});

chrome.browserAction.onClicked.addListener(function() {
	random_wikipedia_page().then(url => {
		chrome.tabs.executeScript({
			code: `window.location.assign("${url}")`
		});
	});
});
