

function parseBoolean(str) {
	return str == "yes" || str == "on" || str == "true" || str == "1";
}

function GetQueryString(_url) {
	var url = _url || window.location.search;
	if(url.indexOf('?') >= 0){
		url = url.split('?')[1];
	}
	var result = {};
	var query = url;
	var parameters = query.split('&');

	for (var i = 0; i < parameters.length; i++) {
		var element = parameters[i].split('=');

		var paramName = decodeURIComponent(element[0]);
		var paramValue = decodeURIComponent(element[1]);

		result[paramName] = paramValue;
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
}

function encodeHTML(str) {
	return str.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&apos;');
}

function decodeHTML(str) {
	return str.replace(/&apos;/g, "'")
		.replace(/&quot;/g, '"')
		.replace(/&gt;/g, '>')
		.replace(/&lt;/g, '<')
		.replace(/&amp;/g, '&');
}

function decodeUtf8(data) {
	var result = "";
	var i = 0;
	var c = 0;
	var c1 = 0;
	var c2 = 0;
	// If we have a BOM skip it
	if (data.length >= 3 && data[0] === 0xef && data[1] === 0xbb
		&& data[2] === 0xbf) {
		i = 3;
	}
	while (i < data.length) {
		c = data[i];

		if (c < 128) {
			result += String.fromCharCode(c);
			i++;
		} else if (c > 191 && c < 224) {
			if (i + 1 >= data.length) {
				throw "UTF-8 Decode failed. Two byte character was truncated.";
			}
			c2 = data[i + 1];
			result += String.fromCharCode(((c & 31) << 6) | (c2 & 63));
			i += 2;
		} else {
			if (i + 2 >= data.length) {
				throw "UTF-8 Decode failed. Multi byte character was truncated.";
			}
			c2 = data[i + 1];
			c3 = data[i + 2];
			result += String.fromCharCode(((c & 15) << 12)
				| ((c2 & 63) << 6) | (c3 & 63));
			i += 3;
		}
	}
	return result;
}