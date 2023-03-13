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
		return new Promise((resolve, reject) => {
			var html = '<p>' + msg + '</p>'
					 + '<input type="file" name="dialog-message-file" id="dialog-message-file" accept=".pvf"/>';
			$( "#dialog-message" ).html(html);
	        $( "#dialog-message" ).dialog({
	          modal: true,
		  	  title: title,
	          buttons: {
	            "Cancel": function() {
					reject("CANCELED");
	            	$( this ).dialog( "close" );
					app.menu.close();
	            }
	          }
	        });

			$('#dialog-message-file').on('change', (e) => {
				
				var pvf = "";
				if(!window.PstCoreLoader && window.cordova){
					pvf = "file://"+e.target.files[0].path;
				}else{
					window.pviewer_get_file = (file) => {
						return m_filemap[file];
					}
					
					pvf = "pviewer://"+e.target.files[0].name;
					m_filemap[pvf] = e.target.files[0];
				}
				
				var url = "applink=?loop=1&pvf=" + encodeURIComponent(pvf);
				app.open_applink(url);
				
				$( "#dialog-message" ).dialog( "close" );
				app.menu.close();
				
			});
		});
    }

	return function(plugin_host) {
		//debugger;
		m_plugin_host = plugin_host;
		
		var plugin = {
			init_options : function(options) {
				document.body.addEventListener('drop', function (e) {
					if(e.dataTransfer.files[0].name.endsWith(".pvf")){
						
						var pvf = "";
						if(!window.PstCoreLoader && window.cordova){
							pvf = "file://"+e.dataTransfer.files[0].path;
						}else{
							window.pviewer_get_file = (file) => {
								return m_filemap[file];
							}
							
							pvf = "pviewer://"+e.dataTransfer.files[0].name;
							m_filemap[pvf] = e.dataTransfer.files[0];
						}
						
						var url = "applink=?loop=1&pvf=" + encodeURIComponent(pvf);
						app.open_applink(url);

					}
				});
			},
			on_restore_app_menu : function(callback) {
				addMenuButton("swFile", "File").then(() => {
					swFile.onclick = async (evt) => {
						await prompt("select pvf file", "file open").then((opt) => {
						}).catch((err) => {
							throw "FILE_OPEN_CANCELLED";
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