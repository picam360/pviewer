var create_plugin = (function() {
	var m_plugin_host = null;
	var m_filemap = {};
	var m_options = {};
		
	function addMenuButton(name, txt) {
			return new Promise((resolve, reject) => {
			var onsListItem = document.createElement("ons-list-item");
			onsListItem.id = name;
			onsListItem.innerHTML = txt;
			menu_list.prepend(onsListItem);
			ons.compile(onsListItem);
			resolve();
		});
	}
	function prompt(msg, title) {
    }

	return function(plugin_host) {
		//debugger;
		m_plugin_host = plugin_host;
		
		var plugin = {
			init_options : function(options) {
			},
			on_restore_app_menu : function(callback) {
				addMenuButton("swSendCmd", "SendCmd").then(() => {
					swSendCmd.onclick = async (evt) => {
						await app.prompt("send comand to upstream", "send command").then((input) => {
							m_plugin_host.send_command(input);
						}).catch((err) => {
						});
					};
				});
			},
			event_handler : function(sender, event) {
			},
		};
		return plugin;
	}
})();