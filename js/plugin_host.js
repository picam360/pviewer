
// interface for plugin
function PluginHost(core, options) {
	//private members
	var m_options = options || {};
	var m_debug = core.debug;
	var m_plugins = [];
	var m_watches = [];
	var m_cmd2upstream_list = [];
	var m_statuses = [];
	var m_filerequest_list = [];
	var m_view_fov = 120;
	var m_view_offset = new THREE.Quaternion();
	var m_view_offset_lock = false;
	var m_view_quat = new THREE.Quaternion();
	var m_north = 0;
	var m_view_quat_changed_callback = null;

	var query = GetQueryString();
	
	//private functions
	function handle_command(cmd) {
		var split = cmd.split(' ');
		if (split[0] == "set_stereo") {
			self.set_stereo(split[1] == "true" || split[1] == "1");
		}
	}

	//public members / functions
	var self = {
		get_timediff_ms: function() {
			return core.timediff_ms;
		},
		get_plugin: function(name) {
			for (var i = 0; i < m_plugins.length; i++) {
				if (name == m_plugins[i].name) {
					return m_plugins[i];
				}
			}
			return null;
		},
		send_command: function(cmd, update) {
			if (cmd.indexOf(UPSTREAM_DOMAIN) == 0) {
				cmd = cmd.substr(UPSTREAM_DOMAIN.length);
				if(update){
					for (var i = 0; i < m_cmd2upstream_list.length; i++) {
						if(m_cmd2upstream_list[i].update){
							var cmd_s1 = cmd.split(' ')[0];
							var cmd_s2 = m_cmd2upstream_list[i].cmd.split(' ')[0];
							if(cmd_s1 == cmd_s2){
								m_cmd2upstream_list[i] = {cmd, update};
								return;
							}
						}
					}
				}
				m_cmd2upstream_list.push({cmd, update});
				return;
			}
			for (var i = 0; i < m_plugins.length; i++) {
				if (m_plugins[i].command_handler) {
					m_plugins[i].command_handler(cmd, update);
				}
			}
			handle_command(cmd, update);
		},
		send_event: function(sender, event) {
			for (var i = 0; i < m_plugins.length; i++) {
				if (m_plugins[i].event_handler) {
					m_plugins[i].event_handler(sender, event);
				}
			}
		},
		add_watch: function(name, callback) {
			m_watches[name] = callback;
		},
		init_plugins: function(callback) {
			if (!m_options.plugin_paths || m_options.plugin_paths.length == 0) {
				if (callback) {
					callback();
				}
				return;
			}
			function load_plugin(idx) {
				self.getFile(m_options.plugin_paths[idx], function(
						chunk_array) {
						var script_str = (new TextDecoder)
							.decode(chunk_array[0]);
						var script = document
							.createElement('script');
						script.onload = function() {
							console.log("loaded : " +
								m_options.plugin_paths[idx]);
							if (create_plugin) {
								var plugin = create_plugin(self);
								m_plugins.push(plugin);
								create_plugin = null;
							}
							if (idx + 1 < m_options.plugin_paths.length) {
								load_plugin(idx + 1);
							} else {
								for (var i = 0; i < m_plugins.length; i++) {
									if (m_plugins[i].init_options) {
										m_plugins[i]
											.init_options(m_options[m_plugins[i].name] || {});
									}
								}
								if (callback) {
									callback();
								}
							}
						};
						console.log("loding : " +
							m_options.plugin_paths[idx]);
						var blob = new Blob(chunk_array, {
							type: "text/javascript"
						});
						var url = window.URL || window.webkitURL;
						script.src = url.createObjectURL(blob);

						document.head.appendChild(script);
					});
			}
			load_plugin(0);
		},
		get_view_quat: function() {
			return m_view_quat.clone();
		},
		set_view_quat: function(value) {
			m_view_quat = value.clone();
			if(m_view_quat_changed_callback){
				m_view_quat_changed_callback(m_view_quat.clone(), m_view_offset.clone());
			}
		},
		on_view_quat_changed: function(callback) {
			m_view_quat_changed_callback = callback;
		},
		get_view_north: function() {
			return m_north;
		},
		get_fov: function() {
			return m_view_fov;
		},
		set_fov: function(value) {
			m_view_fov = value;
			core.set_param("pgl_renderer", "fov", value.toString());
		},
		set_stereo: function(value) {
			self.send_event("PLUGIN_HOST", value ?
				"STEREO_ENABLED" :
				"STEREO_DISABLED");

			var cmd = UPSTREAM_DOMAIN;
			cmd += "set_vstream_param -p stereo=" + (value ? 1 : 0);
			self.send_command(cmd);
			
			core.set_param("pgl_renderer", "stereo", (value ? "1" : "0"));
		},
		set_audio: function(value) {
			m_audio_handler.setAudioEnabled(value);
			self.send_event("PLUGIN_HOST", value ?
				"AUDIO_ENABLED" :
				"AUDIO_DISABLED");
		},
		set_view_offset: function(value) {
			if (m_view_offset_lock) {
				return;
			}
			m_view_offset = value;
			auto_scroll = false;
			if(m_view_quat_changed_callback){
				m_view_quat_changed_callback(m_view_quat.clone(), m_view_offset.clone());
			}
		},
		get_view_offset: function() {
			return m_view_offset.clone();
		},
		snap: function() {
			var key = uuid();
			self.send_command(SERVER_DOMAIN + "snap " + key);
			m_filerequest_list.push({
				filename: 'picam360.jpeg',
				key: key,
				callback: function(chunk_array) {
					var blob = new Blob(chunk_array, {
						type: "image/jpeg"
					});
					var url = (URL || webkitURL || mozURL)
						.createObjectURL(blob);
					downloadAsFile('picam360.jpeg', url);
				}
			});
		},
		rec: function() {
			if (is_recording) {
				var key = uuid();
				self.send_command(SERVER_DOMAIN + "stop_record " + key);
				m_filerequest_list.push({
					filename: 'picam360.mp4',
					key: key,
					callback: function(chunk_array) {
						var blob = new Blob(chunk_array, {
							type: "video/mp4"
						});
						var url = (URL || webkitURL || mozURL)
							.createObjectURL(blob);
						downloadAsFile('picam360.mp4', url);
					}
				});
			} else {
				self.send_command(SERVER_DOMAIN + "start_record");
			}
		},
		call: function(bln) {
			if (bln) {
				core.start_call();
			} else {
				core.stop_call();
			}
		},
		log: function(str, level) {
			if (level && level <= m_debug) {
				console.log(str);
			}
		},
		set_menu_visible: function(bln) {
			// self.send_command(CAPTURE_DOMAIN + 'set_menu_visible ' +
			// (bln?'1':'0'));
			m_menu_visible = bln;
			if(bln){
				m_overlay.innerHTML = m_menu_str;
			}else{
				m_overlay.innerHTML = m_info_str;
			}
			if(m_overlay.innerHTML) {
				m_overlay.style.visibility = "visible";
			}else{
				m_overlay.style.visibility = "hidden";
			}
		},
		set_menu: function(str) {
			m_menu_str = str;
			m_overlay.innerHTML = str;
			self.set_menu_visible(m_menu_visible);
		},
		set_info: function(str) {
			m_info_str = str;
			m_overlay.innerHTML = str;
			self.set_menu_visible(m_menu_visible);
		},
		getFile: function(path, callback) {
			if (!query['force-local'] && core.connected()) {
				var key = uuid();
				m_filerequest_list.push({
					filename: path,
					key: key,
					callback: callback
				});
				self.send_command(SERVER_DOMAIN + "get_file " + path + " " +
					key);
			} else {
				loadFile(path, callback);
			}
		},
		refresh_app_menu: function() {
			if (p2p_num_of_members >= 2) {
				document.getElementById("uiCall").style.display = "block";
			} else {
				document.getElementById("uiCall").style.display = "none";
			}
			for (var i = 0; i < m_plugins.length; i++) {
				if (m_plugins[i].on_refresh_app_menu) {
					m_plugins[i].on_refresh_app_menu(app.menu);
				}
			}
		},
		restore_app_menu: function() {
			app.menu.setMenuPage("menu.html", {
				callback: function() {
					for (var i = 0; i < m_plugins.length; i++) {
						if (m_plugins[i].on_restore_app_menu) {
							m_plugins[i].on_restore_app_menu(app.menu);
						}
					}
					self.refresh_app_menu();
				}
			});
		},
		add_overlay_object : function(obj) {
			//TODO:m_video_handler.add_overlay_object( obj );
		},
		remove_overlay_object : function(obj) {
			//TODO:m_video_handler.remove_overlay_object( obj );
		},
		load_vpm : function(url) {
//TODO:				m_vpm_loader = VpmLoader(url, query, m_video_handler.get_view_quat, m_image_decoder.decode, (info) => {
//					self.send_event('vpm_loader', info);
//				});
		},
	};
	return self;
};