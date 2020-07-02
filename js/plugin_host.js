
// interface for plugin
function PluginHost(core) {

	//private members
	
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
			for (var i = 0; i < plugins.length; i++) {
				if (name == plugins[i].name) {
					return plugins[i];
				}
			}
			return null;
		},
		send_command: function(cmd, update) {
			if (cmd.indexOf(UPSTREAM_DOMAIN) == 0) {
				cmd = cmd.substr(UPSTREAM_DOMAIN.length);
				if(update){
					for (var i = 0; i < cmd2upstream_list.length; i++) {
						if(cmd2upstream_list[i].update){
							var cmd_s1 = cmd.split(' ')[0];
							var cmd_s2 = cmd2upstream_list[i].cmd.split(' ')[0];
							if(cmd_s1 == cmd_s2){
								cmd2upstream_list[i] = {cmd, update};
								return;
							}
						}
					}
				}
				cmd2upstream_list.push({cmd, update});
				return;
			}
			for (var i = 0; i < plugins.length; i++) {
				if (plugins[i].command_handler) {
					plugins[i].command_handler(cmd, update);
				}
			}
			handle_command(cmd, update);
		},
		send_event: function(sender, event) {
			for (var i = 0; i < plugins.length; i++) {
				if (plugins[i].event_handler) {
					plugins[i].event_handler(sender, event);
				}
			}
		},
		add_watch: function(name, callback) {
			watches[name] = callback;
		},
		get_view_quaternion: function() {
			if (mpu) {
				return mpu.get_quaternion();
			} else {
				return new THREE.Quaternion();
			}
		},
		get_view_north: function() {
			if (mpu) {
				return mpu.get_north();
			} else {
				return 0;
			}
		},
		get_fov: function() {
			return m_view_fov;
		},
		set_fov: function(value) {
			m_view_fov = value;
		},
		set_stereo: function(value) {

			try{
				if (DeviceMotionEvent 
						&& DeviceMotionEvent.requestPermission
						&& typeof DeviceMotionEvent.requestPermission === 'function') {
					DeviceMotionEvent.requestPermission().then(response => {
						if (response === 'granted') {
							console.log("ok");
						}
					}).catch(console.error);
				}
			} catch {}
			
//TODO:				
//				m_video_handler.setStereoEnabled(value);
//				if(m_video_handler.vr_supported()){
//					self.set_audio(value);
//				}
			self.send_event("PLUGIN_HOST", value ?
				"STEREO_ENABLED" :
				"STEREO_DISABLED");

			var cmd = UPSTREAM_DOMAIN;
			cmd += "set_vstream_param -p stereo=" + (value ? 1 : 0);
			self.send_command(cmd);
		},
		set_audio: function(value) {
			m_audio_handler.setAudioEnabled(value);
			self.send_event("PLUGIN_HOST", value ?
				"AUDIO_ENABLED" :
				"AUDIO_DISABLED");
		},
		set_view_offset: function(value) {
			if (view_offset_lock) {
				return;
			}
			view_offset = value;
			auto_scroll = false;
		},
		get_view_offset: function() {
			return view_offset.clone();
		},
		snap: function() {
			var key = uuid();
			self.send_command(SERVER_DOMAIN + "snap " + key);
			filerequest_list.push({
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
				filerequest_list.push({
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
			if (level && level <= debug) {
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
				filerequest_list.push({
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
			for (var i = 0; i < plugins.length; i++) {
				if (plugins[i].on_refresh_app_menu) {
					plugins[i].on_refresh_app_menu(app.menu);
				}
			}
		},
		restore_app_menu: function() {
			app.menu.setMenuPage("menu.html", {
				callback: function() {
					for (var i = 0; i < plugins.length; i++) {
						if (plugins[i].on_restore_app_menu) {
							plugins[i].on_restore_app_menu(app.menu);
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
//TODO:				m_vpm_loader = VpmLoader(url, query, m_video_handler.get_view_quaternion, m_image_decoder.decode, (info) => {
//					self.send_event('vpm_loader', info);
//				});
		},
	};
	return self;
};