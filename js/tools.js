

function parseBoolean(str) {
	return str == "yes" || str == "on" || str == "true" || str == "1";
}

function GetQueryString() {
	var result = {};
	if (1 < window.location.search.length) {
		var query = window.location.search.substring(1);
		var parameters = query.split('&');

		for (var i = 0; i < parameters.length; i++) {
			var element = parameters[i].split('=');

			var paramName = decodeURIComponent(element[0]);
			var paramValue = decodeURIComponent(element[1]);

			result[paramName] = paramValue;
		}
	}
	return result;
}

function execCopy(string) {
	var temp = document.createElement('textarea');

	temp.value = string;
	temp.selectionStart = 0;
	temp.selectionEnd = temp.value.length;

	var s = temp.style;
	s.position = 'fixed';
	s.left = '-100%';

	document.body.appendChild(temp);
	temp.focus();
	var result = document.execCommand('copy');
	temp.blur();
	document.body.removeChild(temp);
	return result;
}

function uuid() {
	var uuid = "",
		i, random;
	for (i = 0; i < 32; i++) {
		random = Math.random() * 16 | 0;

		if (i == 8 || i == 12 || i == 16 || i == 20) {
			uuid += "-"
		}
		uuid += (i == 12 ? 4 : (i == 16 ? (random & 3 | 8) : random))
			.toString(16);
	}
	return uuid;
}

function loadFile(path, callback) {
	var req = new XMLHttpRequest();
	req.responseType = "arraybuffer";
	req.open("get", path, true);
	req.send(null);

	req.onload = function() {
		callback([new Uint8Array(req.response)]);
	}
}

function downloadAsFile(fileName, url) {
	var a = document.createElement('a');
	a.download = fileName;
	a.href = url;
	// a.target = "_blank";
	a.click();
};