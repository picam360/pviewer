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
	var m_glctx;
	// toolbar
	var m_toolbar;
	// backbutton
	var m_backbutton_visible = true;
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
	var m_options = {
		"fov" : 120,
		"fov_stereo" : 95,
		"stereo" : false,
		"sao" : false,
		"deblock" : false,
		"simd" : false,
		"boost" : false,
		"margin" : "0,0,0,0",
		"screen_offset" : [[0, 0], [0, 0]],
		"lens_params" : {
			c : [ 0.500, 0.500 ],
			f : [ 1.000, 1.000 ],
			k : [ 0.000, 0.000, 0.000, 0.000 ],
			p : [ 0.000, 0.000 ],
			s : [ 0.000, 0.000, 0.000, 0.000 ],
		},
	};
	var m_permanent_options = {};
	var is_recording = false;
	var p2p_num_of_members = 0;
	var peer_call = null;
	var p2p_uuid_call = "";
	var default_image_url = null;

	var m_frame_active = false;
	var m_menu_visible = false;
	var m_upstream_info = "";
	var m_upstream_menu = "";

	var m_pvf_url = "";
	var m_applink = "";
	var m_applink_ready = false;
	
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
		base_path: (function() {
			try{
				var path = document.currentScript.src.split('?')[0];
				var mydir = path.split('/').slice(0, -1).join('/') + '/';
				if(mydir.startsWith('file://')){
					mydir = mydir.substr('file://'.length);
				}
				return mydir;
			}catch(e){
				return '';
			}
		})(),
		initialize_callback: null,
		// Application Constructor
		initialize: function(callback) {
			self.initialize_callback = callback;
			self.receivedEvent('initialize');
			
			//localStrage config
			try{
				m_permanent_options = JSON.parse(localStorage.getItem('options')) || {};
			}catch (e){
				m_permanent_options = {};
			}
			Object.assign(m_options, m_permanent_options);

			// window.addEventListener("orientationchange", function() {
			// alert(window.orientation);
			// });

			window.addEventListener('message', function(event) {
				if (!event.data || !event.data.charAt || event.data.charAt(0) != '{') {
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
			
			if(window.cordova){
				self.bindEvents();
			}else{
				if(self.initialize_callback){
					self.initialize_callback();
				}
			}
		},
		
		save_permanent_options: function() {
			localStorage.setItem('options', JSON.stringify(m_permanent_options));
		},
		
		aply_permanent_options: function(name) {
			m_permanent_options[name] = m_options[name];
			self.save_permanent_options();
		},

		// Bind Event Listeners
		//
		// Bind any events that are required on startup. Common events are:
		// 'load', 'deviceready', 'offline', and 'online'.
		bindEvents: function() {
			document.addEventListener('deviceready', self.onDeviceReady, false);
		},
		// deviceready Event Handler
		//
		// The scope of 'this' is the event. In order to call the
		// 'receivedEvent'
		// function, we must explicitly call 'self.receivedEvent(...);'
		onDeviceReady: function() {
			self.receivedEvent('deviceready');
			self.isDeviceReady = true;
			
			if(window.universalLinks){
				window.universalLinks.subscribe("picam360.github.io", self.applink_handler);
				window.universalLinks.subscribe("vpm.picam360.com", self.applink_handler);
				window.universalLinks.subscribe("park.picam360.com", self.applink_handler);
				window.universalLinks.subscribe("s.360pi.cam", self.applink_handler);
			}
			if(self.initialize_callback){
				self.initialize_callback();
				self.initialize_callback = null;
			}
		},

		// Update DOM on a Received Event
		receivedEvent: function(id) {
			console.log('Received Event: ' + id);
		},
		
		//applink
		applink_handler: function(eventData) {
			console.log("app link : " + eventData.url);
			self.open_applink(eventData.url);
		},
		
		connected:function(){
			return false;
		},

		init_common_options_done: false,
		init_common_options: function(callback) {
			return new Promise((fullfill,reject) => {
				if (this.init_common_options_done) {
					fullfill();
					return;
				} else {
					this.init_common_options_done = true;
				}
				loadFile("common_config.json", function(chunk_array) {
					var _options = {};
					try{
						var txt = (new TextDecoder).decode(chunk_array[0]);
						if (txt) {
							var lines = txt.split('\n')
							for(var i=0;i<lines.length;i++){
								if(lines[i][0] == '#'){
									lines[i] = "";
								}
							}
							var json_str = lines.join("\n");
							_options = JSON.parse(json_str);
						}
					}catch(e){
						_options = {};
					}
					Object.assign(m_options, _options);
					if(!m_options.plugin_paths){
						m_options.plugin_paths = [];
					}
					fullfill();
				});
			});
		},
		init_options_done: false,
		init_options: function() {
			return new Promise((fullfill,reject) => {
				if (self.init_options_done) {
					fullfill();
					return;
				} else {
					self.init_options_done = true;
				}
				{//parse query
					if (m_query["margin"]) {
						m_options.margin = m_query["margin"];
					}
					if (m_query["screen-offset"]) {
						var nodes = m_query["screen-offset"].split(',');
						m_options.screen_offset[0][0] = parseFloat(nodes[0]);
						m_options.screen_offset[0][1] = parseFloat(nodes[1]);
						m_options.screen_offset[1][0] = parseFloat(nodes[2]);
						m_options.screen_offset[1][1] = parseFloat(nodes[3]);
					}
				}
				// @data : uint8array
				loadFile("config.json", function(chunk_array) {
						var _options = {};
						try{
							var txt = (new TextDecoder).decode(chunk_array[0]);
							if (txt) {
								var lines = txt.split('\n')
								for(var i=0;i<lines.length;i++){
									if(lines[i][0] == '#'){
										lines[i] = "";
									}
								}
								var json_str = lines.join("\n");
								_options = JSON.parse(json_str);
							}
						}catch(e){
							_options = {};
						}
						if(_options.plugin_paths){
							_options.plugin_paths = m_options.plugin_paths.concat(_options.plugin_paths);
						}else{
							_options.plugin_paths = m_options.plugin_paths;
						}
						if(m_query['plugin_paths']){
							try{
								var plugin_paths = JSON.parse(m_query['plugin_paths']);
								_options.plugin_paths = _options.plugin_paths.concat(plugin_paths);
							}catch{
								console.log("json parse failed", m_query['plugin_paths']);
							}
						}
						Object.assign(m_options, _options);
						fullfill();
					});
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
					var pixelrate_mpps = m_pstcore.pstcore_get_param(m_pst, "decoder", "pixelrate_mpps");
					var gof_queue_size = m_pstcore.pstcore_get_param(m_pst, "decoder", "gof_queue_size");
					var boost_pixelrate_mpps = parseFloat(pixelrate_mpps) * parseFloat(gof_queue_size);
					var n_in_bq_l = m_pstcore.pstcore_get_param(m_pst, "pvf_loader", "n_in_bq");
					var n_in_bq_d = m_pstcore.pstcore_get_param(m_pst, "decoder", "n_in_bq");
					var n_in_bq_r = m_pstcore.pstcore_get_param(m_pst, "renderer", "n_in_bq");
					var n_pending = m_pstcore.pstcore_get_param(m_pst, "renderer", "n_pending");
					var latency = m_pstcore.pstcore_get_param(m_pst, "renderer", "latency");
					status += "texture<br/>";
					status += "fps:" + fps + "<br/>";
					status += "preload:" + preload + "<br/>";
					status += "bitrate:" + bitrate_mbps + "mbps<br/>";
					status += "pixelrate:" + boost_pixelrate_mpps.toFixed(3) + "mpps(" + pixelrate_mpps + ")<br/>";
					status += "n_in_bq:" + n_in_bq_l + "+" + n_in_bq_d + "+" + n_in_bq_r + "<br/>";
					status += "n_pending:" + n_pending + "<br/>";
					if(latency){
						latency = parseFloat(latency);
						var timediff = m_pstcore.pstcore_get_param(m_pst, "network", "timediff");
						if(timediff){
							latency += parseFloat(timediff);
						}
						status += "latency:" + latency.toFixed(3) + "sec<br/>";
					}
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
			
			function redraw() {
				if(self.get_xrsession && self.get_xrsession()){
					return;
				}
				m_pstcore.pstcore_poll_events();
				requestAnimationFrame(redraw);
			}
			requestAnimationFrame(redraw);
		},
		
		set_param: function(pst_name, param, value) {
			if(m_pstcore && m_pst) {
				if(m_options["platform"] && m_options["platform"].toUpperCase() == "OCULUS"){
				}else{
					m_pstcore.pstcore_set_param(m_pst, pst_name, param, value);
				}
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
			m_canvas.width = window.innerWidth * window.devicePixelRatio;
			m_canvas.height = window.innerHeight * window.devicePixelRatio;
			m_canvas.style.width = window.innerWidth + "px";
			m_canvas.style.height = window.innerHeight + "px";
			
			self.set_stereo(m_options.stereo);
		},

		set_lens_params: function(value) {
			var cur = JSON.stringify(m_options.lens_params);
			var next = JSON.stringify(value);
			if(cur != next){
				m_options.lens_params = JSON.parse(next);
				self.aply_permanent_options("lens_params");
			}
			
			if(!m_options.stereo || (m_options["platform"] && m_options["platform"].toUpperCase() == "OCULUS")) {
				var lens_params = {
					k : [ 0.000, 0.000 ],
					f : [ 1.000, 1.000 ],
				};
				self.set_param("renderer", "lens_params", JSON.stringify(lens_params));
			}else{
				var lens_params = {
					k : [ 0.000, 0.000 ],
					f : [ 1.000, 1.000 ],
				};
				if(m_options.lens_params){
					lens_params = m_options.lens_params;
				}
				self.set_param("renderer", "lens_params", JSON.stringify(lens_params));
			}
		},

		set_fov_stereo: function(value) {
			if(m_options.fov_stereo != value){
				m_options.fov_stereo = value;
				self.aply_permanent_options("fov_stereo");
			}
			if(m_options.stereo){
				self.plugin_host.set_fov(m_options.fov_stereo);
			}
		},
		
		set_stereo: function(value) {
			if(m_options.stereo != value){
				m_options.stereo = value;
				self.aply_permanent_options("stereo");
			}

			if(swStereoView){
				swStereoView.setChecked(m_options.stereo);
			}
			
			if(m_canvas.width < m_canvas.height){//vertical
				value = false;
			}
			
			self.plugin_host.send_event("PLUGIN_HOST", value ?
				"STEREO_ENABLED" :
				"STEREO_DISABLED");
			
			self.set_lens_params(m_options.lens_params);

			if(value){
				self.set_param("renderer", "stereo", "1");
				self.plugin_host.set_fov(m_options.fov_stereo);
				self.set_param("renderer", "screen_offset_left", `${m_options.screen_offset[0][0]},${m_options.screen_offset[0][1]}`);
				self.set_param("renderer", "screen_offset_right", `${m_options.screen_offset[1][0]},${m_options.screen_offset[1][1]}`);
				self.set_param("renderer", "margin", m_options.margin);
				self.set_param("renderer", "mode", "speed");
			}else{
				self.set_param("renderer", "stereo", "0");
				self.plugin_host.set_fov(m_options.fov);
				self.set_param("renderer", "screen_offset_left", "0,0");
				self.set_param("renderer", "screen_offset_right", "0,0");
				self.set_param("renderer", "margin", "0");
				self.set_param("renderer", "mode", "quality");
			}
		},
		
		set_deblock: function(value) {
			m_options.deblock = value;
			m_permanent_options.deblock = value;
			self.save_permanent_options();

			if(window.swDeblock){
				window.swDeblock.setChecked(value);
			}
		},
		
		set_simd: function(value) {
			m_options.simd = value;
			m_permanent_options.simd = value;
			self.save_permanent_options();

			if(window.swSimd){
				window.swSimd.setChecked(value);
			}
		},
		
		set_boost: function(value) {
			m_options.boost = value;
			m_permanent_options.boost = value;
			self.save_permanent_options();

			if(window.swBoost){
				window.swBoost.setChecked(value);
			}
		},

		set_backbutton_visible: function(value) {
			m_backbutton_visible = value;
			if(m_backbutton_visible){
				$("#btnBack").css("visibility", "visible");
			}else{
				$("#btnBack").css("visibility", "hidden");
			}
		},

		alert: function(msg, title) {
			var html = '<p>'
	    			 + '<span class="ui-icon ui-icon-circle-check" style="float:left; margin:0 7px 50px 0;"></span>'
	    			 + '<p>'+ msg + '</p>'
	  				 + '</p>';
			$( "#dialog-message" ).html(html);
	        $( "#dialog-message" ).dialog({
	          modal: true,
			  title: title,
	          buttons: {
	            "OK": function() {
	              $( this ).dialog( "close" );
	            }
	          }
	        });
	    },
		
		prompt: function(msg, title) {
			return new Promise((resolve, reject) => {
				var html = '<p>' + msg + '</p>'
						 + '<input type="text" name="dialog-message-inputtxt" id="dialog-message-inputtxt" value="" />';
				$( "#dialog-message" ).html(html);
		        $( "#dialog-message" ).dialog({
		          modal: true,
			  	  title: title,
		          buttons: {
		            "OK": function() {
						resolve($( "#dialog-message-inputtxt" ).val());
		            	$( this ).dialog( "close" );
		            },
		            "Cancel": function() {
						reject("CANCELED");
		            	$( this ).dialog( "close" );
		            }
		          }
		        });
			});
	    },
		
		get_pst: function() {
			return m_pst;
		},
		
		get_applink: function(){
			return m_applink;
		},
		
		open_applink: function(url){
			if(url.indexOf('applink=') >= 0){
				m_query = Object.assign(GetQueryString(), GetQueryString(url));
			}else{
				m_query = {'applink' : url};
			}
			if(!m_applink_ready){ //pending
				return;
			}
			new Promise((fullfill,reject) => {
				var need_trans = false;
				if(m_query['applink']){
					if (m_query['applink'].startsWith("https://park.picam360.com/watch")
							|| m_query['applink'].startsWith("https://s.360pi.cam"))
					{
						need_trans = true;
					}
				}
				if(need_trans){//get pvf url
					var req = new XMLHttpRequest();
					req.open("get", m_query['applink'], true);
					req.onload = function() {
						var html = req.response;
						var iframe_sp = html.indexOf("<iframe");
						var iframe_ep = html.indexOf(">", iframe_sp) + 1;
						var iframe_str = html.substring(iframe_sp, iframe_ep);
						var src_sp = iframe_str.indexOf("src='") + 5;
						var src_ep = iframe_str.indexOf("'", src_sp);
						var src_str = iframe_str.substring(src_sp, src_ep);
						m_query['applink'] = src_str;
						console.log("app link from park : " + m_query['applink']);
						fullfill();
					};
					req.send(null);
				}else{
					fullfill();
				}
			})
			.then(() => {
				return new Promise((fullfill,reject) => {
					if(m_query['applink'] && m_query['applink'].indexOf('?') >= 0){
						var query_str = m_query['applink'].split('?')[1];
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
						Object.assign(m_query, query);
					}
					fullfill();
				});
			})
			.then(() => {
				return new Promise((fullfill,reject) => {
					
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
						m_options.fov = parseFloat(m_query['fov']);
					}
					if (m_query['stereo']) {
						m_options.stereo = parseBoolean(m_query['stereo']);
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
					
					if (m_query['boost']) {
						m_options.boost = parseBoolean(m_query['boost']);
					}
					if (m_query['deblock']) {
						m_options.deblock = parseBoolean(m_query['deblock']);
					}
					if (m_query['simd']) {
						m_options.simd = parseBoolean(m_query['simd']);
					}
					
					if (m_query['pvf']) {
						m_pvf_url = m_query['pvf'];
						m_applink = url;
					} else if (m_query['applink'].endsWith('pvf')){
						m_pvf_url = m_query['applink'];
						m_applink = url;
					} else {
						m_pvf_url = "";
						m_applink = "";
					}
					
					fullfill();
				});
			})
			.then(() => {
				if(m_pvf_url){
					if(!m_query['head-query']){
						m_query['head-query'] = "";
					}
					if(!m_query['get-query']){
						m_query['get-query'] = "";
					}

					var loader = "loader";
					var loader_def = "pvf2_loader name=loader adec0=opus_decoder";
					var splitter_def = "splitter aout0='oal_player'";
					if(m_query['pvf_loader']){//legacy
						loader_def = "pvf_loader name=loader";
						splitter_def = "splitter vthrough=1 aout0='opus_decoder ! oal_player sync=renderer'";
					}
					var base_url = m_pvf_url.split('?')[0];
					var is_psf = base_url.endsWith(".psf");
					var DATA_PROTOCOL = "data:application/json;base64,";
					if(base_url.startsWith(DATA_PROTOCOL)){
						var config_json_txt = atob(base_url.substring(DATA_PROTOCOL.length));
						var config_json = JSON.parse(config_json_txt);
						if(config_json.format == "psf"){
							is_psf = true;
						}
					}
					if(is_psf){
						loader = "psf_loader";
						loader_def = `psf_loader pvfldr='${loader_def}'`;
					}
					
					self.build_pst(loader_def, splitter_def, (pst) => {
						m_pstcore.pstcore_set_param(pst, loader, "url", m_pvf_url);
						m_pstcore.pstcore_set_param(pst, loader, "head_query",//legacy
								(m_query['head-query'] ? m_query['head-query'] : ""));
						m_pstcore.pstcore_set_param(pst, loader, "get_query",//legacy
								(m_query['get-query'] ? m_query['get-query'] : ""));
						if (m_query['loop']) {
							m_pstcore.pstcore_set_param(pst, loader, "loop", m_query['loop']);
						}
						if (m_query['force_fps']) {
							m_pstcore.pstcore_set_param(pst, loader, "force_fps", m_query['force_fps']);
						}
								
						self.start_pst(pst);
					});
				}
			});
		},
		get_decorder_def: (callback) => {
			if (window.electron) {
				var decoder = "libde265_decoder name=decoder";
				if(m_pstcore.supported_streams["vt_decoder"]){
					decoder = "vt_decoder name=decoder";
					//at moment, vtbf has texture size bug on mac, 2048x1024 seems 2048x2048 in shader
					//decoder = "vt_decoder name=decoder vtbf=1";
				}else if(m_pstcore.supported_streams["v4l2_tegra_decoder"]){
					decoder = "v4l2_tegra_decoder name=decoder";
				}
				callback(decoder);
			}else if (window.cordova) {
				var decoder = "libde265_decoder name=decoder";
				switch(cordova.platformId){
				case "ios":
				case "darwin":
					decoder = "vt_decoder name=decoder vtbf=1";
					break;
				case "android":
					decoder = "mc_decoder name=decoder mcbf=1";
					break;
				}
				callback(decoder);
			}else{// web decoder
				{
					const mediaConfig = {
						type: 'file',
						video: {
							contentType : 'video/webm;codecs="av01.0.01M.08"',
							width: 2048,
							height: 2048,
							bitrate: 10000, 
							framerate: 30,
						},
					};
					navigator.mediaCapabilities.decodingInfo(mediaConfig).then((info) =>{
						if(info.supported){
							console.log("av1 supported");
						}else{
							console.log("av1 not supported");
						}	
					});
				}
				{
					const mediaConfig = {
						type: 'file',
						video: {
							contentType : 'video/mp4;codecs="hev1.1.6.L93.B0"',
							width: 2048,
							height: 2048,
							bitrate: 10000, 
							framerate: 30,
						},
					};
					navigator.mediaCapabilities.decodingInfo(mediaConfig).then((info) =>{
						if(info.supported){
							var decoder = "wc_decoder name=decoder";
							callback(decoder);
						}else{
							var h264_decoder = ('VideoDecoder' in window) ? "wc_decoder" : "h264bsd_decoder";
							var decoder = "composite_decoder name=decoder h265=libde265_decoder h264=" + h264_decoder;
							callback(decoder);
						}	
					});
				}
			}
		},

		build_pst: (loader, splitter, callback) => {
			var renderer;
			if(loader.includes("pvf2_loader")){
				renderer = "pgl_renderer2 name=renderer w=640 h=480 fps=30";
				renderer += " mode=speed";
			}else{//legacy
				renderer = "pgl_renderer name=renderer w=640 h=480 fps=30";
				if(m_options["platform"] && m_options["platform"].toUpperCase() == "OCULUS") {
					renderer += " mode=speed";
				}
			}
			if(m_query['chromakey-color']){
				renderer += " chromakey_color=" + m_query['chromakey-color'];
			}
			self.get_decorder_def((decoder) => {
				if (window.cordova && m_pstcore.supported_streams["cordova_binder"]) {
					var def = (loader ? loader + " ! " : "") + "cordova_binder";
					m_pstcore.pstcore_build_pstreamer(def, (pst) => {
						var def = (splitter ? splitter + " ! " : "") + decoder + " ! " + renderer;
						m_pstcore.pstcore_set_param(pst, "cordova_binder", "def", def);
						callback(pst);
					});
				} else {
					if(loader.includes("pvf2_loader")){
						var def = (loader ? loader + " ! " : "") + (splitter ? splitter + " ! " : "") + renderer;
						m_pstcore.pstcore_build_pstreamer(def, (pst) => {
							var pvfldr = "loader";
							if(loader.startsWith("psf_loader")){
								pvfldr = "psf_loader.pvfldr." + pvfldr;
							}
							var n_vdecs = parseInt(m_query["n_vdecs"] || 1) + 1;
							for(var vidx=0;vidx<n_vdecs;vidx++){
								m_pstcore.pstcore_set_param(pst, pvfldr, `vdec${vidx}`, decoder);
							}
							
							callback(pst);
						});
					}else{//legacy
						var def = (loader ? loader + " ! " : "") + (splitter ? splitter + " ! " : "") + decoder + " ! " + renderer;
						m_pstcore.pstcore_build_pstreamer(def, (pst) => {
							callback(pst);
						});
					}
				}
			});
		},

		start_xr : null,
		stop_pst : null,
		
		start_pst: (pst, start_callback, end_callback) => {
			m_toolbar = null;
			var startTimer = function() {
				var container = document.getElementById('container');
				if(container.timer) {
					clearTimeout(container.timer);
				}
				container.timer = setTimeout(() => {
					if(app.navi && app.navi.getCurrentPage().name == 'main.html'){
						if(!m_toolbar) {
							m_toolbar = $('#toolbar').detach();
						}
					}
					container.timer = null;
				}, 3000);
			}
			var mousedownFunc = function(ev) {
				if(app.navi && app.navi.getCurrentPage().name == 'main.html'){
					if(m_toolbar) {
						$('#container').before(m_toolbar);
						self.set_backbutton_visible(m_backbutton_visible);
						m_toolbar = null;
					}
				}
				startTimer();
			};
			var mousemoveFunc = function(ev) {
				if (ev.clientY < 50) { // title bar
					mousedownFunc(ev);
				}
			};
			function _stop_pst(){
				if(m_pst == null){
					return;
				}
				document.removeEventListener("touchstart", mousedownFunc);
				document.removeEventListener("mousedown", mousedownFunc);
				document.removeEventListener("mousemove", mousemoveFunc);
				
				self.plugin_host.fire_pst_stopped(m_pstcore, m_pst);

				m_pstcore.pstcore_destroy_pstreamer(m_pst);
				m_pst = null;
				self.stop_pst = null;
				
				if(end_callback){
					end_callback();
				}
			}
			function _start_pst(){
				_stop_pst();
				m_pst = pst;
				{//pre params
					self.set_param("renderer", "win_titlebar", "0");
					self.set_param("renderer", "win_size", window.outerWidth + "," + window.outerHeight);
					self.set_param("renderer", "win_pos", window.screenX + "," + window.screenY);
					self.set_param("decoder", "sao", m_options.sao ? "1" : "0");
					self.set_param("decoder", "deblocking", m_options.deblock ? "1" : "0");
					self.set_param("decoder", "simd", m_options.simd ? "1" : "0");
					self.set_param("decoder", "n_threads", m_options.boost ? "2" : "1");
				}
				setTimeout(() => {
					self.set_stereo(m_options.stereo);
				
					if (m_options.view_offset) {
						var euler = new THREE.Euler(THREE.Math
							.degToRad(m_options.view_offset[0]), THREE.Math
							.degToRad(m_options.view_offset[1]), THREE.Math
							.degToRad(m_options.view_offset[2]), "YXZ");
		
						var quat = new THREE.Quaternion()
							.setFromEuler(euler);
						self.plugin_host.set_view_offset(quat);
					}
				}, 250);//post params
				
				if(!window.cordova && m_pstcore.Module && m_pstcore.Module.DGLFWView){
					m_pstcore.Module.DGLFWView.setCreateWindowCallback((dglfw_win) => {
						self.resetContextCurrent = () => {
							m_pstcore.GL.makeContextCurrent(dglfw_win.handle);
						}
						m_glctx = dglfw_win.ctx.GLctx;
						m_canvas = dglfw_win.canvas;
						$('#container').append(m_canvas);
						self.update_canvas_size();
						self.plugin_host.fire_pst_started(m_pstcore, m_pst);
						if(start_callback){
							start_callback();
						}
					});
				}else{
					m_canvas = document.createElement("canvas");//dummy
					$('#container').append(m_canvas);
					setTimeout(() => { //delay
						self.update_canvas_size();
						self.plugin_host.fire_pst_started(m_pstcore, m_pst);
						if(start_callback){
							start_callback();
						}
					}, 0);
				}

				m_pstcore.pstcore_start_pstreamer(m_pst);
				self.plugin_host.send_event("app", "open_applink");
				
				startTimer();
				document.addEventListener("touchstart", mousedownFunc);
				document.addEventListener("mousedown", mousedownFunc);
				document.addEventListener("mousemove", mousemoveFunc);

				self.stop_pst = _stop_pst;
			}
			if(app.navi){
				var page = app.navi.getCurrentPage();
				if(page.name == 'main.html'){
					app.navi.popPage();
				}
				app.navi.pushPage('main.html', {
					onTransitionEnd : () => {
						_start_pst();
						app.navi.on('postpop', function(e) {
							if(e.leavePage.name == 'main.html') {
								app.navi.off('postpop', arguments.callee);
								_stop_pst();
							}
						});
					}
				});
			}else{
				app.menu.setMainPage('main.html', {
					callback : _start_pst
				});
			}
		},

		main: function() {
			self.receivedEvent('main');

			navigator.getUserMedia = navigator.getUserMedia ||
				navigator.webkitGetUserMedia || navigator.mozGetUserMedia;


			new Promise((fullfill,reject) => {
				fullfill();
			})
			.then(self.init_common_options)
			.then(self.init_options)
			.then(() => {
				self.plugin_host = PluginHost(self, m_options);
				return self.plugin_host.init_plugins();
			})
			.then(() => {
				self.plugin_host.restore_app_menu();
				
				if(m_options["platform"] && m_options["platform"].toUpperCase() == "OCULUS") {
				}else{
					self.plugin_host.on_view_quat_changed((view_quat, view_offset_quat) => {
						var quat = view_offset_quat.multiply(view_quat);
						var value = sprintf("%f,%f,%f,%f", quat.x, quat.y, quat.z, quat.w);
						self.set_param("", "view_quat", value);
					});
				
					m_mpu = MPU();
					m_mpu.init((quat) => {
						if(!m_pstcore || !m_pst || (self.get_xrsession && self.get_xrsession())){
							return;
						}
						self.plugin_host.set_view_quat(quat);
					});
				}
				
				
				m_canvas = document.createElement("canvas");//dummy
				//m_canvas = document.getElementById('panorama');
				//m_overlay = document.getElementById('overlay');

				const config = {
					"plugin_paths" : [
						"plugins/splitter_st.so",
						"plugins/selector_st.so",
						"plugins/composite_decoder_st.so",
						"plugins/opus_decoder_st.so",
						"plugins/opus_encoder_st.so",
						"plugins/oal_player_st.so",
						"plugins/oal_capture_st.so",
						"plugins/pvf_loader_st.so",
						"plugins/pvf2_loader_st.so",
						"plugins/psf_loader_st.so",
						"plugins/libde265_decoder_st.so",
						"plugins/h264bsd_decoder_st.so",
						"plugins/wsclient_st.so",
						"plugins/wc_decoder_st.so",
						"plugins/wc_encoder_st.so",
						"plugins/ms_capture_st.so",
						"plugins/pgl_renderer_st.so",
						"plugins/pgl_renderer2_st.so",
						"plugins/pgl_remapper_st.so",
						//platform dependents
						"plugins/vt_decoder_st.so",
						"plugins/mc_decoder_st.so",
						"plugins/v4l2_tegra_decoder_st.so",
					],
					"window_size" : {
						"width" : window.innerWidth,
						"height" : window.innerHeight
					}
				}
				if(m_query['pstcore_plugin_paths']){
					try{
						var plugin_paths = JSON.parse(m_query['pstcore_plugin_paths']);
						config.plugin_paths.concat(plugin_paths);
					}catch{
						console.log("json parse failed", m_query['plugin_paths']);
					}
				}
				if(m_options.pstcore_plugins_ext){
					for(var path of m_options.pstcore_plugins_ext){
						config.plugin_paths.push(path);
					}
				}

				function call_pstcore_init(config){
					console.log("pstcore initialized");
					if(m_query['debug']){
						m_pstcore.pstcore_add_log_callback((level, tag, msg) => {
							console.log(level, tag, msg);
						});
					}
					const config_json = JSON.stringify(config);
					m_pstcore.pstcore_init(config_json);

					m_pstcore.supported_streams = {};
					var streams = [
						"vt_decoder",
						"v4l2_tegra_decoder",
						"cordova_binder",
					];
					var check_fnc = (idx, callback) => {
						if(idx == streams.length){
							callback();
							return;
						}
						m_pstcore.pstcore_build_pstreamer(streams[idx], (pst) => {
							if(pst){
								m_pstcore.supported_streams[streams[idx]] = true;
								m_pstcore.pstcore_destroy_pstreamer(pst);
							}else{
								m_pstcore.supported_streams[streams[idx]] = false;
							}
							check_fnc(idx + 1, callback);
						});
					};
					check_fnc(0, () => {
						setTimeout(() => {
							self.plugin_host.fire_pstcore_initialized(m_pstcore);
						}, 100);
					});

					if (window.cordova && m_pstcore.supported_streams["cordova_binder"]) {
						cordova.exec((msg) => {
							console.log(msg);
						}, (msg) => {
							console.log(msg);
						}, "CDVPstCore", "init_internal", [JSON.stringify(config)]); // init is reserved

						setInterval(() => {
							cordova.exec((msg) => {
								//console.log(msg);
							}, (msg) => {
								console.log(msg);
							}, "CDVPstCore", "poll", []);
						}, 33);
					}

					m_applink_ready = true;
					if(!m_query['applink']){
						m_query['applink'] = window.location.href;
					}
					self.open_applink(m_query['applink']);
					
					self.start_animate();
			
					setInterval(() => {
						self.update_status_str();
					}, 1000);
					
					window.addEventListener('resize', () => {
						self.update_canvas_size();
					}, false);
					
					document.ondragover = document.ondrop = function (e) {
					  e.preventDefault()
					}
					document.body.addEventListener('drop', function (e) {
						if(e.dataTransfer.files.length == 0){
							var url = e.dataTransfer.getData("URL");
							self.open_applink(url);
						}
					});
					window.addEventListener('beforeunload', function (e) {
						if(self.stop_pst){
							self.stop_pst();
						}
					});
				}
				
				
				if (window.electron){

					m_pstcore = window.electron.pstcore;

					call_pstcore_init(config);

					window.PstCoreLoader = undefined;

				}else if(window.cordova && (m_options['use_cordova_pstcore'] || !window.PstCoreLoader)){

					m_pstcore = window.cordova.pstcore;

					call_pstcore_init(config);

					window.PstCoreLoader = undefined;
					
				}else{
					m_pstcore = window.PstCoreLoader({
						preRun: [(Module) => {
							console.log("cp plugins");
							if(m_options.pstcore_plugins_ext){
								for(var path of m_options.pstcore_plugins_ext){
									var file_name = path.split('/').pop();
									var file_dir = path.split('/').slice(0, -1).join('/');
									try{
										Module["FS"].mkdirTree('/' + file_dir);
										Module["FS"].createPreloadedFile(
											'/' + file_dir,
											file_name,
											self.base_path + "../" + path,
											true,//readable
											false//writable
										);
									}catch(e){
										console.log(e);
									}
								}
							}
						}],
						postRun: [],
						print: function(msg) {
							if(m_query['debug']){
								console.log(msg);
							}
						},
						printErr: function(e) {
							console.error(e);
						},
						onRuntimeInitialized : function() {
							console.log("pstcore initialized");

							call_pstcore_init(config);
							
						},
						locateFile : function(path, prefix) {
							return self.base_path + "../lib/pstcore/" + path;
						},
					});
				}
			});
		},
		restore_app_menu: () => {
			setTimeout(() => {
				if(swStereoView){
					swStereoView.setChecked(m_options.stereo);
				}
			}, 0);
		},
		get_canvas: () => {return m_canvas;},
		get_pstcore: () => {return m_pstcore;},
		set_pst: (pst) => {m_pst = pst;},
		get_glctx: () => {return m_glctx},
		set_screen_offset: (so) => {
			m_options["screen_offset"][0][0] = so[0]
			m_options["screen_offset"][1][0] = -so[0];
			m_options["screen_offset"][0][1] = so[1]
			m_options["screen_offset"][1][1] = so[1];
			self.set_param("renderer", "screen_offset_left", `${m_options.screen_offset[0][0]},${m_options.screen_offset[0][1]}`);
			self.set_param("renderer", "screen_offset_right", `${m_options.screen_offset[1][0]},${m_options.screen_offset[1][1]}`);
		},
	};
	return self;
})();

app.receivedEvent('load index.js');