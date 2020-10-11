var create_plugin = (function() {
	var m_plugin_host = null;
	var m_auto_park = true;
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
	
	return function(plugin_host) {
		//debugger;
		m_plugin_host = plugin_host;
		function open_park() {
			app.menu.setMainPage('park.html', {
				callback : function() {					
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
			
			open_park();
		});
		
		function iframeURLChange(iframe, callback) {
			var pre_src = iframe.src;
		    var unloadHandler = function () {
		        // Timeout needed because the URL changes immediately after
		        // the `unload` event is dispatched.
		        setTimeout(function () {
			    	if(!iframe || !iframe.contentWindow || !iframe.contentWindow.location){
			    		return;
			    	}
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
			},
			event_handler : function(sender, event) {
			},
		};
		return plugin;
	}
})();