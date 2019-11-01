function check() {
	const save_btn = document.getElementById("save_btn");
	const category_page = document.getElementById("category_page");
	const subdomain = document.getElementById("subdomain");
	const wikipedia_api = new Wikipedia(subdomain.value);
	wikipedia_api.page_exists(category_page.value).then(exists => {
		if (!exists) {
			save_btn.textContent = "This page does not exist!";
			save_btn.disabled = false;
			category_page.style.borderColor = 'red';
		} else {
			save_btn.textContent = "Saved";
			save_btn.disabled = true;
			category_page.style.borderColor = '';
		}
	});
}

function save() {
	const category_page_el = document.getElementById("category_page");
	const subdomain_el = document.getElementById("subdomain");
	const save_btn = document.getElementById("save_btn");
	save_btn.disabled = true;
	save_btn.textContent = "Saving...";
	chrome.storage.sync.set({ category_page: category_page_el.value, subdomain: subdomain_el.value }, () => {
		if (chrome.runtime.lastError) {
			save_btn.textContent = "Error";
			save_btn.disabled = false;
		} else {
			save_btn.value = "Saved";
			save_btn.disabled = true;
			category_page_el.style.borderColor = '';
		}
		check();
	});
};

function restore() {
	const save_btn = document.getElementById("save_btn");
	chrome.storage.sync.get(["category_page", "subdomain"], function(payload) {
		let category_page = null;
		let subdomain = null;
		if (!chrome.runtime.lastError && payload != null && (category_page = payload['category_page']) != null && (subdomain = payload['subdomain']) != null) {
			document.getElementById("category_page").value = category_page;
			document.getElementById("subdomain").value = subdomain;
			save_btn.value = "Saved";
			save_btn.disabled = true;
			check();
		}
	});
};

document.getElementById("category_page").addEventListener("change", save);
document.getElementById("subdomain").addEventListener("change", save);
document.getElementById("save_btn").addEventListener("click", save);
document.addEventListener("DOMContentLoaded", restore);
