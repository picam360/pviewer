//include constants.js
//include tools.js
//include plugin_host.js

//include lib/pstcore/pstcore.js

var app = (function() {
	//private members
	var tilt = 0;
	var socket;
	var auto_scroll = false;
	var m_afov = false;
	var m_fpp = false;
	var m_vertex_type = "";

	var m_pstcore = null;
	var m_pst = null;
	
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
	var m_mpu;

	var server_url = window.location.href.split('?')[0];
	var m_options = {};
	var is_recording = false;
	var p2p_num_of_members = 0;
	var peer_call = null;
	var p2p_uuid_call = "";
	var default_image_url = null;

	var m_frame_active = false;
	var m_menu_visible = false;
	var m_upstream_info = "";
	var m_upstream_menu = "";

	var m_pvf_url =
			"https://vpm.picam360.com/wat_1000kbps.pvf";
			//"https://vpm.picam360.com/wat_1000kbps/";
			//"https://storage.granbosque.net/picam360_vpm/biwako_191213";
	
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
	var m_query = GetQueryString();

	var self = {
		debug: 0,
		plugin_host: null,
		isDeviceReady: false,
		base_path: "",
		initialize_callback: null,
		// Application Constructor
		initialize: function(callback) {
			self.initialize_callback = callback;
			self.receivedEvent('initialize');

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
			
			if(window.cordova){
				self.bindEvents();
			}else{
				if(self.initialize_callback){
					self.initialize_callback();
				}
			}
		},

		// Bind Event Listeners
		//
		// Bind any events that are required on startup. Common events are:
		// 'load', 'deviceready', 'offline', and 'online'.
		bindEvents: function() {
			document.addEventListener('deviceready', self.onDeviceReady, false);

			//debug
			//self.applink_vpm({url:"https://vpm.picam360.com/pviewer/?pvf=https%3A%2F%2Fpcdn-akm0.picam360.com%2F201%2Fvideos%2Fmain%2Fhelicopter-5760x2880-30fps%25281%2529.pvf"});
			//self.applink_park({url:"https://park.picam360.com/watch?v=741"});
		},
		// deviceready Event Handler
		//
		// The scope of 'this' is the event. In order to call the
		// 'receivedEvent'
		// function, we must explicitly call 'self.receivedEvent(...);'
		onDeviceReady: function() {
			self.receivedEvent('deviceready');
			self.isDeviceReady = true;
			
			if(universalLinks){
				universalLinks.subscribe("vpm.picam360.com", self.applink_vpm);
				universalLinks.subscribe("park.picam360.com", self.applink_park);
			}
			if(self.initialize_callback){
				setTimeout(() => {
					if(self.initialize_callback){
						self.initialize_callback();
						self.initialize_callback = null;
					}
				}, 1000);//timeout of applink
			}
		},

		// Update DOM on a Received Event
		receivedEvent: function(id) {
			console.log('Received Event: ' + id);
		},
		
		//applink
		applink_vpm: function(eventData) {
			console.log("app link : " + eventData.url);
			//alert(eventData.url);
			
			var query_str = eventData.url.split('?')[1];
			query_str = decodeHTML(query_str);
			var parameters = query_str.split('&');

			var query = {};
			for (var i = 0; i < parameters.length; i++) {
				var pos = parameters[i].indexOf('=');

				var paramName = parameters[i].substring(0, pos);
				var paramValue = parameters[i].substring(pos + 1);
				
				paramName = decodeURIComponent(paramName);
				paramValue = decodeURIComponent(paramValue);

				if(paramName == "vpm"){
					paramName = "pvf";
				}
				query[paramName] = paramValue;
			}
			m_query = query;
			if(self.initialize_callback){
				self.initialize_callback();
				self.initialize_callback = null;
			}
		},
		applink_park: function(eventData) {
			console.log("app link : " + eventData.url);
			//alert(eventData.url);
			if(eventData.url.startsWith("https://park.picam360.com/watch")){
				var req = new XMLHttpRequest();
				req.open("get", eventData.url, false);//sync
				req.send(null);
				var html = req.response;
				var iframe_sp = html.indexOf("<iframe");
				var iframe_ep = html.indexOf(">", iframe_sp) + 1;
				var iframe_str = html.substring(iframe_sp, iframe_ep);
				var src_sp = iframe_str.indexOf("src='") + 5;
				var src_ep = iframe_str.indexOf("'", src_sp);
				var src_str = iframe_str.substring(src_sp, src_ep);
				eventData.url = src_str;
				console.log("app link from park : " + eventData.url);
			}
			
			var query_str = eventData.url.split('?')[1];
			query_str = decodeHTML(query_str);
			var parameters = query_str.split('&');

			var query = {};
			for (var i = 0; i < parameters.length; i++) {
				var pos = parameters[i].indexOf('=');

				var paramName = parameters[i].substring(0, pos);
				var paramValue = parameters[i].substring(pos + 1);

				paramName = decodeURIComponent(paramName);
				paramValue = decodeURIComponent(paramValue);

				if(paramName == "vpm"){
					paramName = "pvf";
				}
				query[paramName] = paramValue;
			}
			m_query = query;
			if(self.initialize_callback){
				self.initialize_callback();
				self.initialize_callback = null;
			}
		},
		
		connected:function(){
			return false;
		},

		init_common_options_done: false,
		init_common_options: function(callback) {
			if (this.init_common_options_done) {
				return;
			} else {
				this.init_common_options_done = true;
			}
			loadFile("common_config.json", function(chunk_array) {
				var _options = {};
				try{
					var txt = (new TextDecoder).decode(chunk_array[0]);
					if (txt) {
						_options = JSON.parse(txt);
					}
				}catch{
					_options = {};
				}
				Object.assign(m_options, _options);
				if(!m_options.plugin_paths){
					m_options.plugin_paths = [];
				}
				if(callback){
					callback();
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
					if(_options.plugin_paths){
						_options.plugin_paths = m_options.plugin_paths.concat(_options.plugin_paths);
					}
					Object.assign(m_options, _options);
					if (m_query['plugin_paths']) {
						var plugin_paths = JSON.parse(m_query['plugin_paths']);
						m_options.plugin_paths = m_options.plugin_paths.concat(plugin_paths);
					}
					self.init_plugins(callback);
				});
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
							debug: self.debug
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
		update_status_str: function() {
			var divStatus = document.getElementById("divStatus");
			if (divStatus) {
				var status = "";
				if(m_pstcore && m_pst) {
					var fps = m_pstcore.pstcore_get_param(m_pst, "pvf_loader", "src_fps");
					var preload = m_pstcore.pstcore_get_param(m_pst, "pvf_loader", "preload");
					var bitrate_mbps = m_pstcore.pstcore_get_param(m_pst, "pvf_loader", "bitrate_mbps");
					var pixelrate_mpps = m_pstcore.pstcore_get_param(m_pst, "libde265_decoder", "pixelrate_mpps");
					var n_in_bq_d = m_pstcore.pstcore_get_param(m_pst, "libde265_decoder", "n_in_bq");
					var n_in_bq_r = m_pstcore.pstcore_get_param(m_pst, "pgl_renderer", "n_in_bq");
					var n_pending = m_pstcore.pstcore_get_param(m_pst, "pgl_renderer", "n_pending");
					status += "texture<br/>";
					status += "fps:" + fps + "<br/>";
					status += "preload:" + preload + "<br/>";
					status += "bitrate:" + bitrate_mbps + "mbps<br/>";
					status += "pixelrate:" + pixelrate_mpps + "mpps<br/>";
					status += "n_in_bq:" + n_in_bq_d + "+" + n_in_bq_r + "<br/>";
					status += "n_pending:" + n_pending + "<br/>";
				}
//				var texture_info = m_video_handler.get_info(); {
//					status += "texture<br/>";
//					status += "v-fps:" + texture_info.video_fps.toFixed(3) +
//						"<br/>";
//					if(texture_info.offscreen){
//						status += "o";
//					}
//					status += "r-fps:" + texture_info.animate_fps.toFixed(3) +
//						"<br/>";
//					if(m_vpm_loader){
//						//not realtime
//					}else{
//						status += "latency:" +
//							texture_info.latency_msec.toFixed(0) +
//							"ms<br/>";
//					}
//					status += "codec:" + texture_info.codec + "<br/>";
//					status += "<br/>";
//				}
//
//				if(m_upstream_info)
//				{
//					status += "upstream<br/>";
//					status += m_upstream_info.replace(/\n/gm, "<br/>");
//					status += "<br/>";
//				}

				divStatus.innerHTML = status;
			}
		},
		
		start_animate: function() {
			if (m_options.fov) {
				self.plugin_host.set_fov(m_options.fov);
			}
			if (m_options.view_offset) {
				var euler = new THREE.Euler(THREE.Math
					.degToRad(m_options.view_offset[0]), THREE.Math
					.degToRad(m_options.view_offset[1]), THREE.Math
					.degToRad(m_options.view_offset[2]), "YXZ");

				var quat = new THREE.Quaternion()
					.setFromEuler(euler);
				self.plugin_host.set_view_offset(quat);
			}
			
			function redraw() {
				m_pstcore._pstcore_poll_events();
				requestAnimationFrame(redraw);
			}
			requestAnimationFrame(redraw);
			
			setInterval(() => {
				self.update_status_str();
			}, 1000);
		},
		
		set_param: function(pst_name, param, value) {
			if(m_pstcore && m_pst) {
				m_pstcore.pstcore_set_param(m_pst, pst_name, param, value);
			}
		},
		
		get_param: function(pst_name, param) {
			if(m_pstcore && m_pst) {
				return m_pstcore.pstcore_get_param(m_pst, pst_name, param);
			}else{
				return null;
			}
		},
		
		update_canvas_size: function() {
			if(m_pstcore) {
				m_pstcore.Browser.setCanvasSize(
						window.innerWidth * window.devicePixelRatio,
						window.innerHeight * window.devicePixelRatio);
			}
			m_canvas.width = window.innerWidth * window.devicePixelRatio;
			m_canvas.height = window.innerHeight * window.devicePixelRatio;
			m_canvas.style.width = window.innerWidth + "px";
			m_canvas.style.height = window.innerHeight + "px";
		},

		main: function() {
			self.receivedEvent('main');

			navigator.getUserMedia = navigator.getUserMedia ||
				navigator.webkitGetUserMedia || navigator.mozGetUserMedia;

			if (m_query['server-url']) {
				server_url = m_query['server-url'];
			}
			if (m_query['default-image-url']) {
				default_image_url = m_query['default-image-url'];
			}
			if (m_query['view-offset']) {
				var split = m_query['view-offset'].split(',');
				m_options.view_offset = [split[0], split[1], split[2]];
			}
			if (m_query['fov']) {
				m_view_fov = parseFloat(m_query['fov']);
			}
			if (m_query['vertex-type']) {
				m_vertex_type = m_query['vertex-type'];
			}

			if (m_query['auto-scroll']) {
				auto_scroll = parseBoolean(m_query['auto-scroll']);
			}
			if (m_query['debug']) {
				self.debug = parseFloat(m_query['debug']);
			}
			if (m_query['view-offset-lock']) {
				view_offset_lock = parseBoolean(m_query['view-offset-lock']);
			}
			if (m_query['afov']) {
				m_afov = parseBoolean(m_query['afov']);
			}
			if (m_query['fpp']) {
				m_fpp = parseBoolean(m_query['fpp']);
			}
			if (m_query['pvf']) {
				m_pvf_url = m_query['pvf'];
			}

			m_canvas = document.getElementById('panorama');
			m_overlay = document.getElementById('overlay');

			self.init_common_options(() => {
				self.plugin_host = PluginHost(self, m_options);
				self.plugin_host.init_plugins();
				self.plugin_host.on_view_quat_changed((view_quat, view_offset_quat) => {
					var quat = view_offset_quat.multiply(view_quat);
					m_pstcore._pstcore_set_view_quat(m_pst, quat.x, quat.y, quat.z, quat.w);
				});
				
				m_mpu = MPU();
				m_mpu.init((quat) => {
					if(!m_pstcore || !m_pst){
						return;
					}
					self.plugin_host.set_view_quat(quat);
				});

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
									//"plugins/timer_st.so",
									"plugins/pgl_renderer_st.so",
								],
								"window_size" : {
									"width" : window.innerWidth,
									"height" : window.innerHeight
								}
						}
						if(window.cordova){
							config.plugin_paths.push("plugins/cordova_binder_st.so");
						}
						const config_json = JSON.stringify(config);
						m_pstcore.pstcore_init(config_json);
						
						m_pst = m_pstcore.pstcore_start_pvf_loader(m_pvf_url, m_query['head-query'], m_query['get-query']);

						self.start_animate();
						
						window.addEventListener('resize', () => {
							self.update_canvas_size();
						}, false);
						self.update_canvas_size();
					},
					locateFile : function(path, prefix) {
						return self.base_path + "../lib/pstcore/" + path;
					},
				});
			});
		},
	};
	return self;
})();

app.receivedEvent('load index.js');