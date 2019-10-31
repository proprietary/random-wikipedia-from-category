function save() {
	const category_page = document.getElementById("category_page").value;
	const subdomain = document.getElementById("subdomain").value;
	const save_btn = document.getElementById("save_btn");
	save_btn.disabled = true;
	save_btn.value = "Saving...";
	chrome.storage.sync.set({ category_page, subdomain }, () => {
		if (chrome.runtime.lastError) {
			save_btn.value = "Error";
			save_btn.disabled = false;
		} else {
			save_btn.value = "Saved";
		}
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
		}
	});
};

document.getElementById("category_page").addEventListener("change", save);
document.getElementById("subdomain").addEventListener("change", save);
document.getElementById("save_btn").addEventListener("click", save);
document.addEventListener("DOMContentLoaded", restore);
