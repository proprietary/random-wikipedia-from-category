function storage_fn(o, arg, fn) {
	return new Promise((resolve) => {
		o[fn](arg, resolve);
	});
};

const storage_get = (o, arg) => storage_fn(o, arg, 'get');

const storage_set = (o, arg) => storage_fn(o, arg, 'set');
