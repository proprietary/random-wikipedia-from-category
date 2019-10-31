'use strict';

Array.prototype.choice = function() {
	return this[Math.floor(Math.random() * this.length)];
};

function storage_fn(o, arg, fn) {
	return new Promise((resolve) => {
		o[fn](arg, resolve);
	});
};

const storage_get = (o, key) => storage_fn(o, key, 'get').then(r => key.map(k => r[k]));

const storage_set = (o, arg) => storage_fn(o, arg, 'set');

function url_search_params_string(src) {
	let s = '?';
	const entries = Object.entries(src);
	if (entries.length > 0)
		s += encodeURIComponent(entries[0][0]) + '=' + encodeURIComponent(entries[0][1]);
	for (let i = 1; i < entries.length; ++i) {
		const [k, v] = entries[i];
		s += '&' + encodeURIComponent(k) + '=' + encodeURIComponent(v);
	}
	return s;
};

// access Wikipedia's public API
class Wikipedia {
	// finding every page recursively under a category can be many web requests to Wikipedia's API
	CACHE_MAX_AGE = 1000 * 60 * 60 * 24 * /* days: */ 7;

	constructor(subdomain) {
		this._subdomain = subdomain;
		// don't chase cyclic categories
		this._categories_visited = new Set();
	}

	async pages(category_title) {
		// check local storage
		let [last_updated, pages_under_category] = await storage_get(chrome.storage.local, [category_title]);
		if (last_updated == null || pages_under_category == null || _expired(new Date(last_updated)) || pages_under_category.length === 0) {
			// hit local storage
			pages_under_category = await this._deep_category_members([category_title], 5);
			if (pages_under_category.length > 0)
				await storage_set(chrome.storage.local, {
					[category_title]: {
						pages_under_category,
						last_updated: new Date().toISOString()
					}
				});
		}
		return pages_under_category;
	}

	_category_members(title_or_pageid) {
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
		return fetch(this.api_base_url + url_search_params_string(params))
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
		});
	}

	async _deep_category_members(categories, max_depth = 5) {
		if (max_depth <= 0) return [];
		if (categories.length === 0) return [];
		if (this._categories_visited.has(categories[0]))
			return await _deep_category_members(categories.slice(1), max_depth);
		const title = categories.pop();
		this._categories_visited.add(title);
		const [new_pages, new_categories] = await this._category_members(title, this.api_base_url);
		categories = [...categories, ...new_categories];
		return [...new_pages, ...await this._deep_category_members(new_categories, max_depth - 1)];
	}

	get api_base_url() {
		return `https://${this._subdomain}.wikipedia.org/w/api.php`;
	}

	get page_url() {
		return `https://${this._subdomain}.wikipedia.org/wiki/?curid=`;
	}

	_expired(d) {
		const now = new Date();
		return (now.getTime() - d.getTime()) > this.CACHE_MAX_AGE;
	}
};

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

