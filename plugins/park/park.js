var create_plugin = (function() {
	var m_plugin_host = null;
	var m_is_init = false;
	var m_auto_park = true;
	var m_is_park = false;
	var m_park_url = "plugins/park/top/Picam360 Park.html";

	function loadFile(path, callback, error_callbackk) {
		var req = new XMLHttpRequest();
		req.responseType = "arraybuffer";
		req.open("get", path, true);

		req.onerror = function() {
			if(error_callbackk){
				error_callbackk(req);
			}
			return;
		};
		req.onload = function() {
			if(req.status != 200){
				req.onerror();
				return;
			}
			callback(new Uint8Array(req.response));
		};
		req.send(null);
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
	
	var m_query = GetQueryString();
	
	function init(){
		if(!m_query['tour']){
			return;
		}
	}
	
	return function(plugin_host) {
		debugger;
		m_plugin_host = plugin_host;

		function close_park() {
			if(!m_is_park){
				return;
			}
			m_is_park = false;
			app.navi.popPage();
		}
		function open_park() {
			if(m_is_park){
				return;
			}
			m_is_park = true;
			app.menu.closeMenu();
			app.navi.pushPage('park.html', {
				onTransitionEnd : function() {
					var iframe = document.getElementById('park_iframe');
					iframe.src = m_park_url;
					m_park_url = iframe.src;
					iframeURLChange(iframe, (url, pre_url) =>{
						if(url == m_park_url){
							return;
						}
						iframe.contentWindow.location.href = pre_url;
						m_park_url = pre_url;
						app.open_applink(url);
					});
				}});
		}
		m_plugin_host.getFile("plugins/park/park.html", function(
			chunk_array) {
			var txt = decodeUtf8(chunk_array[0]);
			var node = $.parseHTML(txt);
			$('body').append(node);
			ons.compile(node[0]);
			
			if(m_auto_park){
				open_park();
			}
		});
		{
			  var onsListItem = document.createElement("ons-list-item");
              onsListItem.innerHTML ="Park";
              onsListItem.onclick = (evt) => {
            	  open_park();
              };
              menu_list.appendChild(onsListItem);
              ons.compile(onsListItem);
		}
		
		function iframeURLChange(iframe, callback) {
			var pre_src = iframe.src;
		    var unloadHandler = function () {
		        // Timeout needed because the URL changes immediately after
		        // the `unload` event is dispatched.
		        setTimeout(function () {
		            callback(iframe.contentWindow.location.href, pre_src);
		        }, 0);
		    };

		    function attachUnload() {
		        // Remove the unloadHandler in case it was already attached.
		        // Otherwise, the change will be dispatched twice.
		        iframe.contentWindow.removeEventListener("unload", unloadHandler);
		        iframe.contentWindow.addEventListener("unload", unloadHandler);
		    }

		    iframe.addEventListener("load", attachUnload);
		    attachUnload();
		}
		
		var plugin = {
			init_options : function(options) {
				if (!m_is_init) {
					m_is_init = true;
					init(plugin);
				}
			},
			event_handler : function(sender, event) {
				if(event == "open_applink"){
					m_auto_park = false;
					close_park();
				}
			},
		};
		return plugin;
	}
})();