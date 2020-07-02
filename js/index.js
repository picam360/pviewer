//include constants.js
//include tools.js
//include plugin_host.js

//include lib/pstcore/pstcore.js

var app = (function() {
	//private members
	var tilt = 0;
	var socket;
	var m_view_fov = 120;
	var auto_scroll = false;
	var view_offset_lock = false;
	var m_afov = false;
	var m_fpp = false;
	var m_vertex_type = "";
	var debug = 0;

	var m_pstcore = null;
	// main canvas
	var m_canvas;
	// overlay
	var m_overlay;
	var m_menu_str;
	var m_info_str;
	// webgl handling
	//TODO:var m_video_handler;
	// audio handling
	var m_audio_handler = null;
	// data stream handling
	var rtp;
	var rtcp;
	//TODO:var m_vpm_loader = null;
	// video decoder
	//TODO:var m_image_decoder = null;
	var opus_decoder;
	var audio_first_packet_s = 0;
	// motion processer unit
	var mpu;

	var server_url = window.location.href.split('?')[0];
	var m_options = {};
	var plugins = [];
	var watches = [];
	var statuses = [];
	var is_recording = false;
	var view_offset = new THREE.Quaternion();
	var p2p_num_of_members = 0;
	var peer_call = null;
	var p2p_uuid_call = "";
	var default_image_url = null;

	var cmd2upstream_list = [];
	var filerequest_list = [];

	var m_frame_active = false;
	var m_menu_visible = false;
	var m_upstream_info = "";
	var m_upstream_menu = "";
	
	var m_pc = null;

	function set_is_recording(value) {
		if (is_recording != value) {
			is_recording = value;
			if (is_recording) {
				document.getElementById('imgRec').src = "img/stop_record_icon.png";
			} else {
				document.getElementById('imgRec').src = "img/start_record_icon.png";
			}
		}
	}
	var query = GetQueryString();

	var self = {
		plugin_host: null,
		isDeviceReady: false,
		base_path: "",
		// Application Constructor
		initialize: function() {
			app.receivedEvent('initialize');
			this.bindEvents();

			// window.addEventListener("orientationchange", function() {
			// alert(window.orientation);
			// });

			window.addEventListener('message', function(event) {
				if (!event.data || event.data.charAt(0) != '{') {
					return;
				}
				var args = JSON.parse(event.data);
				if (!args['function']) {
					alert("no handler : null");
					return;
				}
				switch (args['function']) {
					case 'dispatchEvent':
						var event = new CustomEvent(args['event_name'], {
							'detail': JSON.parse(args['event_data'])
						});
						window.dispatchEvent(event);
						break;
					default:
						alert("no handler : " + args['function']);
				}
			});
			
			self.base_path = (function() {
				try{
					var path = document.currentScript.src.split('?')[0];
					var mydir = path.split('/').slice(0, -1).join('/') + '/';
					return mydir;
				}
				catch{
					return '';
				}
			})();
		},

		// Bind Event Listeners
		//
		// Bind any events that are required on startup. Common events are:
		// 'load', 'deviceready', 'offline', and 'online'.
		bindEvents: function() {
			document.addEventListener('deviceready', this.onDeviceReady, false);
		},
		// deviceready Event Handler
		//
		// The scope of 'this' is the event. In order to call the
		// 'receivedEvent'
		// function, we must explicitly call 'app.receivedEvent(...);'
		onDeviceReady: function() {
			app.receivedEvent('deviceready');
			app.isDeviceReady = true;
		},

		// Update DOM on a Received Event
		receivedEvent: function(id) {
			console.log('Received Event: ' + id);
		},

		init_common_options_done: false,
		init_common_options: function(callback) {
			if (this.init_common_options_done) {
				return;
			} else {
				this.init_common_options_done = true;
			}
			loadFile("common_config.json", function(chunk_array) {
				try{
					var txt = (new TextDecoder).decode(chunk_array[0]);
					if (txt) {
						m_options = JSON.parse(txt);
					}
				}catch{
					m_options = {};
				}
				if(!m_options.plugin_paths){
					m_options.plugin_paths = [];
				}
			});
		},
		init_options_done: false,
		init_options: function(callback) {
			if (this.init_options_done) {
				return;
			} else {
				this.init_options_done = true;
			}
			// @data : uint8array
			self.plugin_host
				.getFile("config.json", function(chunk_array) {
					var _options = {};
					try{
						var txt = (new TextDecoder).decode(chunk_array[0]);
						if (txt) {
							_options = JSON.parse(txt);
						}
					}catch{
						_options = {};
					}
					if (_options.fov && !query.fov) {
						self.plugin_host.set_fov(_options.fov);
					}
					if(_options.plugin_paths){
						_options.plugin_paths = m_options.plugin_paths.concat(_options.plugin_paths);
					}
					Object.assign(m_options, _options);
					if (m_options.view_offset && !query['view-offset']) {
						var euler = new THREE.Euler(THREE.Math
							.degToRad(m_options.view_offset[0]), THREE.Math
							.degToRad(m_options.view_offset[1]), THREE.Math
							.degToRad(m_options.view_offset[2]), "YXZ");

						view_offset = new THREE.Quaternion()
							.setFromEuler(euler);
					}
					if (query['plugin_paths']) {
						var plugin_paths = JSON.parse(query['plugin_paths']);
						m_options.plugin_paths = m_options.plugin_paths.concat(plugin_paths);
					}
					self.init_plugins(callback);
				});
		},
		
		init_plugins: function(callback) {
			if (!m_options.plugin_paths || m_options.plugin_paths.length == 0) {
				if (callback) {
					callback();
				}
				return;
			}
			function load_plugin(idx) {
				self.plugin_host
					.getFile(m_options.plugin_paths[idx], function(
						chunk_array) {
						var script_str = (new TextDecoder)
							.decode(chunk_array[0]);
						var script = document
							.createElement('script');
						script.onload = function() {
							console.log("loaded : " +
								m_options.plugin_paths[idx]);
							if (create_plugin) {
								var plugin = create_plugin(self.plugin_host);
								plugins.push(plugin);
								create_plugin = null;
							}
							if (idx + 1 < m_options.plugin_paths.length) {
								load_plugin(idx + 1);
							} else {
								for (var i = 0; i < plugins.length; i++) {
									if (plugins[i].init_options) {
										plugins[i]
											.init_options(m_options[plugins[i].name] || {});
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

		init_watch: function() {
			self.plugin_host.add_watch("upstream.error", function(value) {
				switch (value.toLowerCase()) {
					case "exceeded_num_of_clients":
						self.plugin_host
							.set_info("error : Exceeded num of clients");
						break;
				}
			});
			self.plugin_host
				.add_watch("upstream.is_recording", function(value) {
					set_is_recording(value.toLowerCase() == 'true');
				});
			self.plugin_host.add_watch("upstream.p2p_num_of_members", function(
				value) {
				if (value != p2p_num_of_members) {
					p2p_num_of_members = value;
					try{
						self.plugin_host.restore_app_menu();
					}catch(e){
						// do nothing
					}
				}
			});
			self.plugin_host.add_watch("upstream.info", function(value) {
				m_upstream_info = value;
			});
			self.plugin_host.add_watch("upstream.menu", function(value) {
				m_upstream_menu = value;
			});

			self.plugin_host
				.add_watch("upstream.request_call", function(value) {
					if (p2p_uuid_call == value) {
						return;
					}
					p2p_uuid_call = value;
					if (!window.confirm('An incoming call')) {
						return;
					}
					navigator.getUserMedia({
						video: false,
						audio: true
					}, function(stream) {
						peer_call = new Peer({
							host: SIGNALING_HOST,
							port: SIGNALING_PORT,
							secure: SIGNALING_SECURE,
							key: P2P_API_KEY,
							debug: debug
						});
						var call = peer_call.call(p2p_uuid_call, stream);
						call.on('stream', function(remoteStream) {
							var audio = new Audio();
							if (navigator.userAgent.indexOf("Safari") > -1) {
								audio.srcObject = remoteStream;
							} else {
								audio.src = (URL || webkitURL || mozURL)
									.createObjectURL(remoteStream);
							}
							console.log("stream");
							audio.load();
							setTimeout(function() {
								audio.play();
							}, 2000);
						});
					}, function(err) {
						console.log('Failed to get local stream', err);
					});
				});
		},
		start_animate: function() {
			function redraw() {
				m_pstcore._pstcore_poll_events();
				requestAnimationFrame(redraw);
			}
			requestAnimationFrame(redraw);
			
		},

		main: function() {
			app.receivedEvent('main');

			navigator.getUserMedia = navigator.getUserMedia ||
				navigator.webkitGetUserMedia || navigator.mozGetUserMedia;

			if (query['server-url']) {
				server_url = query['server-url'];
			}
			if (query['default-image-url']) {
				default_image_url = query['default-image-url'];
			}
			if (query['view-offset']) {
				var split = query['view-offset'].split(',');
				var euler = new THREE.Euler(THREE.Math
					.degToRad(parseFloat(split[0])), THREE.Math
					.degToRad(parseFloat(split[1])), THREE.Math
					.degToRad(parseFloat(split[2])), "YXZ");

				view_offset = new THREE.Quaternion().setFromEuler(euler);
			}
			if (query['fov']) {
				m_view_fov = parseFloat(query['fov']);
			}
			if (query['vertex-type']) {
				m_vertex_type = query['vertex-type'];
			}

			if (query['auto-scroll']) {
				auto_scroll = parseBoolean(query['auto-scroll']);
			}
			if (query['debug']) {
				debug = parseFloat(query['debug']);
			}
			if (query['view-offset-lock']) {
				view_offset_lock = parseBoolean(query['view-offset-lock']);
			}
			if (query['afov']) {
				m_afov = parseBoolean(query['afov']);
			}
			if (query['fpp']) {
				m_fpp = parseBoolean(query['fpp']);
			}

			m_canvas = document.getElementById('panorama');
			m_overlay = document.getElementById('overlay');

			self.plugin_host = PluginHost(self);
			self.init_common_options();

			m_pstcore = window.PstCoreLoader({
				preRun: [],
				postRun: [],
				print: function(msg) {
					console.log(msg);
				},
				printErr: function(e) {
					console.error(e);
				},
				canvas: function() {
					var e = m_canvas;
					return e;
				}(),
				onRuntimeInitialized : function() {
					console.log("pstcore initialized");
					const config = {
							"plugin_paths" : [
								"plugins/pvf_loader_st.so",
								"plugins/libde265_decoder_st.so",
								"plugins/pgl_renderer_st.so",
							],
					}
					if(window.cordova){
						config.plugins.push("plugins/cordova_binder_st.so");
					}
					const config_json = JSON.stringify(config);
					m_pstcore.pstcore_init(config_json);
					
					const url =
						"https://storage.granbosque.net/picam360_vpm/biwako_191213";
					m_pstcore.pstcore_start_pvf_loader(url);

					self.start_animate();
				},
				locateFile : function(path, prefix) {
					return self.base_path + "../lib/pstcore/" + path;
				},
			});
		},
	};
	return self;
})();

app.receivedEvent('load index.js');
app.initialize();