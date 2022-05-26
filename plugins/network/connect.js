var create_plugin = (function() {
	var m_plugin_host = null;
	var m_plugin = null;
	var m_cmd2upstream_list = [];
	var m_filerequest_list = [];
	var m_timediff_ms = 0;
	var m_watches = [];
	var m_options = {};
	var m_permanent_options = {};
	var m_query = GetQueryString();
		
	function addMenuButton(name, txt) {
			return new Promise((resolve, reject) => {
			var onsListItem = document.createElement("ons-list-item");
			onsListItem.id = name;
			onsListItem.innerHTML = txt;
			menu_list.insertBefore(onsListItem, menu_list_about);
			ons.compile(onsListItem);
			resolve();
		});
	}
	function prompt(msg, title) {
		return new Promise((resolve, reject) => {
			var html = '<p>' + msg + '</p>'
					 + '<table>'
					 + '<tr>'
					 + '<td><input type="radio" name="dialog-message-type" id="dialog-message-type" value="ws" checked /></td><td>websocket</td>'
					 + '</tr>'
					 + '<tr>'
					 + '<td/><td>url:<input type="text" name="dialog-message-wsurl" id="dialog-message-wsurl" size="25" value="ws://' + window.location.host + '" />'
					 + '</tr>'
					 + '<tr>'
					 + '<td><input type="radio" name="dialog-message-type" id="dialog-message-type" value="wrtc" /></td><td>webrtc</td>'
					 + '</tr>'
					 + '<tr>'
					 + '<td/><td>key:<input type="text" name="dialog-message-wrtckey" id="dialog-message-wrtckey" size="25" value="" disabled /></td>'
					 + '</tr>'
					 + '</table>';
			$( "#dialog-message" ).html(html);
	        $( "#dialog-message" ).dialog({
	          modal: true,
		  	  title: title,
	          buttons: {
	            "Connect": function() {
	            	var opt = {
	            		type:$( "input[name='dialog-message-type']:checked" ).val(),
	            		ws_url:$( "#dialog-message-wsurl" ).val(),
	            		wrtc_key:$( "#dialog-message-wrtckey" ).val(),
	            	};
					resolve(opt);
	            	$( this ).dialog( "close" );
					app.menu.close();
	            },
	            "Cancel": function() {
					reject("CANCELED");
	            	$( this ).dialog( "close" );
					app.menu.close();
	            }
	          }
	        });
			$( "input[name='dialog-message-type']" ).change(() => {
				switch($( "input[name='dialog-message-type']:checked" ).val()){
				case "ws":
					$( "#dialog-message-wsurl" ).prop('disabled', false);
					$( "#dialog-message-wrtckey" ).prop('disabled', true);
					break;
				case "wrtc":
					$( "#dialog-message-wsurl" ).prop('disabled', true);
					$( "#dialog-message-wrtckey" ).prop('disabled', false);
					break;
				}
			});
			if(m_query['wrtc-key']){
				$( "#dialog-message-wrtckey" ).val(m_query['wrtc-key']);
			}
			if(m_query['ws-url']){
				$( "#dialog-message-wsurl" ).val(m_query['ws-url']);
			}
			if(m_permanent_options['default-interface'] == 'wrtc'){
				$( "input[name='dialog-message-type']" ).val(['wrtc']).trigger("change");
			}else if(m_permanent_options['default-interface'] == 'ws'){
				$( "input[name='dialog-message-type']" ).val(['ws']).trigger("change");
			}
		});
    }
    
    
	function start_ws(url, callback, err_callback) {
		m_permanent_options['ws-url'] = url;
		m_permanent_options['default-interface'] = 'ws';
		localStorage.setItem('connect_js_options', JSON.stringify(m_permanent_options));

		try{
			// websocket
			var ws_url = "ws://" + url.slice(url.indexOf("://")+3);
			var socket = new WebSocket(ws_url);
			socket.binaryType = 'arraybuffer';// blob or arraybuffer
			socket.addEventListener('open', function (event) {
				callback(socket);
			});
			socket.addEventListener('error', function (event) {
				m_plugin_host.set_info("error : Could not connect : " + event);
				err_callback();
			});
		}catch(e){
			err_callback();
		}
	}
	
	function start_p2p(p2p_uuid, callback, err_callback) {
		m_permanent_options['wrtc-key'] = p2p_uuid;
		m_permanent_options['default-interface'] = 'wrtc';
		localStorage.setItem('connect_js_options', JSON.stringify(m_permanent_options));

		var options = {
			host: SIGNALING_HOST,
			port: SIGNALING_PORT,
			secure: SIGNALING_SECURE,
			key: P2P_API_KEY,
			iceServers : [
                         	{"urls": "stun:stun.l.google.com:19302"},
                        	{"urls": "stun:stun1.l.google.com:19302"},
                        	{"urls": "stun:stun2.l.google.com:19302"},
                        ],
        	debug: m_options['debug'] || 0,
		};
		if (m_options['turn-server']) {
			options.iceServers.push({
				urls: 'turn:turn.picam360.com:3478',
				username: "picam360",
				credential: "picam360"
			});
		}
		var sig = new Signaling(options);
		sig.connect(function() {
			var pc = new RTCPeerConnection({
				sdpSemantics: 'unified-plan',
				iceServers: options.iceServers
			});
			m_pc = pc;

			sig.onoffer = function(offer) {
				pc.setRemoteDescription(offer.payload.sdp).then(function() {
					return pc.createAnswer();
				}).then(function(sdp) {
					console.log('Created answer.');
					
					pc.setLocalDescription(sdp);
					sig.answer(offer.src, sdp);
				}).catch(function(err) {
					console.log('Failed answering:' + err);
				});
				pc.onicecandidate = function(event) {
					if (event.candidate) {
						sig.candidate(offer.src, event.candidate);
					} else {
						// All ICE candidates have been sent
					}
				};
				pc.ondatachannel = function(ev) {
					console.log('Data channel is created!');
					var dc = ev.channel;
					dc.onopen = function() {
						console.log("p2p connection established as downstream.");
						dc.addEventListener('close', function(){
							pc.close();
						});
						callback(dc);
					};
					dc.onclose = function() {
						m_plugin_host.set_info("p2p connection closed");
						m_frame_active = false;
					};
				};
				pc.onerror = function(err) {
					if (err.type == "peer-unavailable") {
						m_plugin_host.set_info("error : Could not connect " +
							p2p_uuid);
						m_pc = null;
						err_callback();
					}
				};
			};
			sig.oncandidate = function(candidate) {
				pc.addIceCandidate(candidate.payload.ice);
			};
			sig.request_offer(p2p_uuid);
		});
	}
	function deinit_connection(conn) {
		var pstcore = app.get_pstcore();
		clearInterval(conn.attr.timer);
		conn.rtp.set_callback(null);
		conn.close();
		if(conn.attr.pst){
			pstcore.pstcore_remove_set_param_done_callback(conn.attr.pst, "connect_on_set_param_done_callback");
			pstcore.pstcore_destroy_pstreamer(conn.attr.pst);
			conn.attr.pst = 0;
		}
	}
	function init_connection(conn) {
		var pstcore = app.get_pstcore();
		conn.rtp = Rtp(conn);
		
		new Promise((resolve, reject) => {
			conn.attr = {
				timer: 0,
				param_pendings: [],
				enqueue_pendings: [],
			};
			var pst;
            if(!window.PstCoreLoader && window.cordova){
                var platform = cordova.platformId;
                if(platform == 'electron'){
                    platform = process.platform;
                }
                var decoder = "libde265_decoder";
                switch(platform){
                case "ios":
                    decoder = "vt_decoder";
                    break;
                case "android":
                    decoder = "mc_decoder";
                    break;
                case "darwin":
                    decoder = "vt_decoder";
                    break;
                case "win32":
                    break;
                case "linux":
                    break;
                }
                var def = decoder +  " name=decoder ! pgl_renderer name=renderer format=p2s w=640 h=480 fps=30 mode=speed";
                //var def = decoder +  " name=decoder ! pgl_renderer name=renderer format=p2s w=640 h=480 fps=30 dual_window=1 swap_window=1 mode=speed";
                pst = pstcore.pstcore_build_pstreamer(def);
            }else if (window.cordova) {
				var def = "cordova_binder";
				pst = pstcore.pstcore_build_pstreamer(def);
				
				var platform = cordova.platformId;
				if(platform == 'electron'){
					platform = process.platform;
				}
				
				var decoder = "libde265_decoder";
				switch(platform){
				case "ios":
					decoder = "vt_decoder";
					break;
				case "android":
					decoder = "mc_decoder";
					break;
				case "darwin":
					decoder = "vt_decoder";
					break;
				case "win32":
					break;
				case "linux":
					break;
				}
				var binder_def = decoder + " name=decoder ! pgl_renderer name=renderer format=p2s w=640 h=480 fps=30";
				pstcore.pstcore_set_param(pst, "cordova_binder", "def", binder_def);//call native pstcore_build_pstreamer
			} else {
				var def = "libde265_decoder name=decoder ! pgl_renderer name=renderer format=p2s w=640 h=480 fps=30";
				pst = pstcore.pstcore_build_pstreamer(def);
			}
			conn.attr.pst = pst;
			
			//main.html
			app.start_pst(conn.attr.pst, () => {
				//start
				//connection establish sequence
				var timediff_ms = 0;
				var min_rtt = 0;
				var ping_cnt = 0;
				{ // ping
					if(m_query['stream-def']){
						var cmd = "<picam360:command id=\"0\" value=\"stream_def " + m_query['stream-def'] + "\" />";
						var pack = conn.rtp.buildpacket(cmd, PT_CMD);
						conn.rtp.sendpacket(pack);
					}
					var cmd = "<picam360:command id=\"0\" value=\"ping " + new Date().getTime() + "\" />";
					var pack = conn.rtp.buildpacket(cmd, PT_CMD);
					conn.rtp.sendpacket(pack);
					
					console.log("establish sequence started");
				}
				conn.rtp.set_callback(function(packet) {
					if (packet.GetPayloadType() == PT_STATUS) {
						var str = (new TextDecoder)
							.decode(packet.GetPayload());
						var split = str.split('"');
						var name = split[1];
						var value = split[3].split(' ');
						if (name == "pong") {
							ping_cnt++;
							var now = new Date().getTime();
							var rtt = now - parseInt(value[0]);
							var _timediff_ms = value[1] - (now - rtt / 2);
							if (min_rtt == 0 || rtt < min_rtt) {
								min_rtt = rtt;
								timediff_ms = _timediff_ms;
							}
							console.log(name + ":" + value + ":rtt=" +
								rtt);
							if (ping_cnt < 10) {
								var cmd = "<picam360:command id=\"0\" value=\"ping " +　new Date().getTime() + "\" />";
								var pack = conn.rtp.buildpacket(cmd, PT_CMD);
								conn.rtp.sendpacket(pack);
								return;
							} else {
								var cmd = "<picam360:command id=\"0\" value=\"set_timediff_ms " + timediff_ms + "\" />";
								var pack = conn.rtp.buildpacket(cmd, PT_CMD);
								conn.rtp.sendpacket(pack);
		
								console.log("min_rtt=" + min_rtt +
									":timediff_ms:" +
									timediff_ms);
								m_timediff_ms = timediff_ms;
								pstcore.pstcore_set_param(conn.attr.pst, 
									"network", "timediff", (timediff_ms/1000).toString());
								resolve();
							}
						}
					}
				});
			}, () =>{
				//stop
				deinit_connection(conn);
			});
		}).then(() => {
			m_plugin_host.set_info("waiting image...");
			
			window.connect_on_set_param_done_callback = (msg) => {
				if(conn.attr.in_pt_set_param){//prevent loop back
					return;
				}
				conn.attr.param_pendings.push(msg);
			};
			pstcore.pstcore_add_set_param_done_callback(conn.attr.pst, "connect_on_set_param_done_callback");
			
			conn.attr.timer = setInterval(function() {
				try{
					if(conn.attr.param_pendings.length > 0) {
						var msg = "[" + conn.attr.param_pendings.join(',') + "]";
						var pack = conn.rtp.buildpacket(msg, PT_SET_PARAM);
						conn.rtp.sendpacket(pack);
						conn.attr.param_pendings = [];
					}
					if (m_cmd2upstream_list.length > 0) {
						var {cmd} = m_cmd2upstream_list.shift();
						var xml = "<picam360:command id=\"" + app.rtcp_command_id +
							"\" value=\"" + cmd + "\" />"
						var pack = conn.rtp.buildpacket(xml, PT_CMD);
						conn.rtp.sendpacket(pack);
					}
				}catch(err){
					clearInterval(conn.attr.timer);
					conn.close();
				}
			}, 33);
			// command to upstream
			setInterval(function() {
				app.rtcp_command_id++;
			}, 33); // 30hz
			// set rtp callback
			conn.rtp.set_callback(function(packet) {
				var sequencenumber = packet.GetSequenceNumber();
				if ((sequencenumber % 100) == 0) {
					var latency = new Date().getTime() /
						1000 -
						(packet.GetTimestamp() + packet.GetSsrc() / 1E6) +
						m_timediff_ms / 1000;
					console.log("packet latency : seq=" + sequencenumber +
						", latency=" + latency + "sec");
				}
				if (packet.GetPayloadType() == PT_ENQUEUE) { // enqueue
					var chunk = packet.GetPayload();
					var eob = "<eob/>";
					
					if(chunk[0] == eob.charCodeAt(0) &&
					   chunk[1] == eob.charCodeAt(1) &&
					   chunk[2] == eob.charCodeAt(2) &&
					   chunk[3] == eob.charCodeAt(3) &&
					   chunk[chunk.length - 2] == eob.charCodeAt(4) &&
					   chunk[chunk.length - 1] == eob.charCodeAt(5)){
						
						var buff = null;
						if(conn.attr.enqueue_pendings.length == 1){
							buff = conn.attr.enqueue_pendings[0];
						}else if(conn.attr.enqueue_pendings.length > 1){
							var len = 0;
							for (var _chunk of conn.attr.enqueue_pendings) {
								len += _chunk.length;
							}
							var buff = new Uint8Array(len);
							var cur = 0;
							for (var _chunk of conn.attr.enqueue_pendings) {
								buff.set(_chunk, cur);
								cur += _chunk.length;
							}
						}
						if(buff){
//							var size = 0;
//							size += buff[3] << 24;
//							size += buff[2] << 16;
//							size += buff[1] << 8;
//							size += buff[0] << 0;
//							console.log("enqueue:", buff.length, size, buff[4]);

							pstcore.pstcore_enqueue(conn.attr.pst, buff);
							conn.attr.enqueue_pendings = [];
						}
					}else{
						conn.attr.enqueue_pendings.push(chunk);
					}
					
				} else if (packet.GetPayloadType() == PT_SET_PARAM) { // set_param
					var str = (new TextDecoder)
						.decode(packet.GetPayload());
					var list = JSON.parse(str);
					for(var ary of list){
						if(ary[0] == "network"){
							if(ary[1] == "pviewer_config_ext"){
								var config_ext = JSON.parse(ary[2]);
								if(config_ext && config_ext["plugin_paths"]){
									for(var path of config_ext["plugin_paths"]){
										var key = uuid();
										m_filerequest_list.push({
											filename: path,
											key: key,
											callback: (path, key, data) => {
												m_plugin_host.add_plugin_from_script(path, config_ext, data);
											}
										});
										m_plugin.command_handler(UPSTREAM_DOMAIN + "get_file " + path + " " +
											key);
									}
								}
							}

						}else{
							conn.attr.in_pt_set_param = true;
							pstcore.pstcore_set_param(conn.attr.pst, ary[0], ary[1], ary[2]);
							conn.attr.in_pt_set_param = false;
						}
					}
				} else if (packet.GetPayloadType() == PT_STATUS) { // status
					var str = (new TextDecoder)
						.decode(packet.GetPayload());
					var split = str.split('"');
					var name = UPSTREAM_DOMAIN + split[1];
					var value = decodeURIComponent(split[3]);
					if (m_watches[name]) {
						m_watches[name](value);
					}
				} else if (packet.GetPayloadType() == PT_FILE) { // file
					var array = packet.GetPayload();
					var view = new DataView(array.buffer, array.byteOffset);
					var header_size = view.getUint16(0, false);
					var header = array.slice(2, 2 + header_size);
					var header_str = (new TextDecoder).decode(header);
					var data = array.slice(2 + header_size);
					var key = "dummy";
					var seq = 0;
					var eof = false;
					var split = header_str.split(" ");
					for (var i = 0; i < split.length; i++) {
						var separator = (/[=,\"]/);
						var _split = split[i].split(separator);
						if (_split[0] == "key") {
							key = _split[2];
						} else if (_split[0] == "seq") {
							seq = parseInt(_split[2]);
						} else if (_split[0] == "eof") {
							eof = _split[2] == "true";
						}
					}
					for (var i = 0; i < m_filerequest_list.length; i++) {
						if (m_filerequest_list[i].key == key) {
							if (seq == 0) {
								m_filerequest_list[i].chunk_array = [];
							}
							m_filerequest_list[i].chunk_array.push(data);
							if (eof) {
								m_filerequest_list[i]
									.callback(m_filerequest_list[i].filename, m_filerequest_list[i].key, m_filerequest_list[i].chunk_array);
								m_filerequest_list.splice(i, 1);
								break;
							}
						}
					}
				}
			});
		});
	};
	
	function open_dialog(){
		prompt("input connection info", "connect stream via network").then((opt) => {
			if(opt.type == "ws"){
				start_ws(opt.ws_url, (socket) => {
					init_connection(socket);
				}, () => {
					//error
				});
			}else{
				start_p2p(opt.wrtc_key, (dc) => {
					init_connection(dc);
				}, () => {
					//error
				});
			}
		}).catch((err) => {
			throw "CONNECT_CANCELLED";
		});
	}
	
	return function(plugin_host) {
		//debugger;
		m_plugin_host = plugin_host;
		
		m_plugin = {
			init_options : function(options) {
				m_plugin_host.loadScript("plugins/network/signaling.js").then(() => {
					return m_plugin_host.loadScript("plugins/network/rtp.js");
				});
				try{
					m_permanent_options = JSON.parse(localStorage.getItem('connect_js_options')) || {};
				}catch (e){
					m_permanent_options = {};
				}
				var bln_open_dialog = false;
				Object.assign(options, m_permanent_options);
				if(m_query['wrtc-key'] == undefined){
					if(options['wrtc-key']){
						m_query['wrtc-key'] = options['wrtc-key'];
					}
				}else{
					m_permanent_options['default-interface'] = 'wrtc';
					bln_open_dialog = true;
				}
				if(m_query['ws-url'] == undefined){
					if(options['ws-url']){
						m_query['ws-url'] = options['ws-url'];
					}
				}else{
					m_permanent_options['default-interface'] = 'ws';
					bln_open_dialog = true;
				}
				if(bln_open_dialog){
					open_dialog();
				}
			},
			on_restore_app_menu : function(callback) {
				addMenuButton("swConnect", "Connect").then(() => {
					swConnect.onclick = (evt) => {
						open_dialog();
					};
				});
			},
			event_handler : function(sender, event) {
			},
			command_handler : function(cmd, update) {
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
			},
		};
		return m_plugin;
	}
})();