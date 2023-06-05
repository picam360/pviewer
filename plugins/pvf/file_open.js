var create_plugin = (function() {
	var m_plugin_host = null;
	var m_filemap = {};
	var m_options = {};
    var m_permanent_options = {};
		
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
			var file_open_url = (m_options.file_open_url ? m_options.file_open_url : "");
			var html = "";
			html += '<p>' + msg + '</p>';
			html += `url:<input type="text" name="dialog-message-file-url" id="dialog-message-file-url" size="35" value="${file_open_url}"/><br/>`;
			html += 'file:<input type="file" name="dialog-message-file" id="dialog-message-file" accept=".pvf,.psf"/><br/>';
			$( "#dialog-message" ).html(html);
	        $( "#dialog-message" ).dialog({
	          modal: true,
		  	  title: title,
	          buttons: {
	            "Open": function() {

					var applink = "";
					if($( "#dialog-message-file" )[0].files[0]){
						var file_obj = $( "#dialog-message-file" )[0].files[0];
						if(!window.PstCoreLoader){
							pvf = "file://" + file_obj.path;
						}else{
							window.pviewer_get_file = (file) => {
								return m_filemap[file];
							}
							
							pvf = "pviewer://" + file_obj.name;
							m_filemap[pvf] = file_obj;
						}
						applink = "applink=?loop=1&pvf=" + encodeURIComponent(pvf);
					}else if($( "#dialog-message-file-url" )[0].value){
						var url = $( "#dialog-message-file-url" )[0].value;
						var path = url.split('?')[0];
						if(path.toLowerCase().endsWith(".pvf") || path.toLowerCase().endsWith(".psf")){
							applink = "applink=?loop=1&pvf=" + encodeURIComponent(url);
						}else if(url.indexOf("applink=") >= 0 || url.indexOf("pvf=") >= 0 || url.indexOf("vpm=") >= 0){
							applink = url;
						}else{
							alert("NOT SUPPORTED FILE TYPE : " + url);
							return;
						}

						for(var options of [m_options, m_permanent_options]){
							options.file_open_url = url;
						}
						localStorage.setItem('file_open_js_options', JSON.stringify(m_permanent_options));
					}

					if(!applink){
						alert("NOT SELECTED");
						return;
					}

					app.open_applink(applink);
					
	            	$( this ).dialog( "close" );
					app.menu.close();

					resolve("OPENED");
	            },
	            "Cancel": function() {
	            	$( this ).dialog( "close" );
					app.menu.close();

					reject("CANCELED");
	            }
	          }
	        });

			$('#dialog-message-file-url').on('change', (e) => {
				
			});

			$('#dialog-message-file').on('change', (e) => {
				
			});
		});
    }

	return function(plugin_host) {
		//debugger;
		m_plugin_host = plugin_host;
		
		var plugin = {
			init_options : function(options) {
                try{
                    m_permanent_options = JSON.parse(localStorage.getItem('file_open_js_options')) || {};
                }catch (e){
                    m_permanent_options = {};
                }
                Object.assign(options, m_permanent_options);
                m_options = options;

				document.body.addEventListener('drop', function (e) {
					if(e.dataTransfer.files[0].name.endsWith(".pvf") ||
					   e.dataTransfer.files[0].name.endsWith(".psf")){
						
						var pvf = "";
						if(!window.PstCoreLoader){
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
						await prompt("select pvf/psf file", "file open").then((opt) => {
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