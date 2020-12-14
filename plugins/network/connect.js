var create_plugin = (function() {
	var m_plugin_host = null;
	var m_rtp = null;
	var m_rtcp = null;
	var m_cmd2upstream_list = [];
	var m_timediff_ms = 0;
	var m_watches = [];
	var m_options = {};
		
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
					 + '<td/><td>url:<input type="text" name="dialog-message-wsurl" id="dialog-message-wsurl" size="25" value="" list="wsurls" />'
					 + '<datalist id="wsurls">'
					 + '<option value="ws://localhost:9001">'
					 + '<option value="ws://raspberrypi.local:9001">'
					 + '</datalist></td>'
					 + '</tr>'
					 + '<tr>'
					 + '<td><input type="radio" name="dialog-message-type" id="dialog-message-type" value="wrtc" /></td><td>webrtc</td>'
					 + '</tr>'
					 + '<tr>'
					 + '<td/><td>key:<input type="text" name="dialog-message-wrtckey" id="dialog-message-wrtckey" size="25" value="" /></td>'
					 + '</tr>'
					 + '</table>';
			$( "#dialog-message" ).html(html);
	        $( "#dialog-message" ).dialog({
	          modal: true,
		  	  title: title,
	          buttons: {
	            "Connect": function() {
	            	var opt = {
	            		type:$( "input:radio[name='dialog-message-type']:checked" ).val(),
	            		ws_url:$( "#dialog-message-wsurl" ).val(),
	            		wrtc_key:$( "#dialog-message-wrtckey" ).val(),
	            	};
					resolve(opt);
	            	$( this ).dialog( "close" );
	            },
	            "Cancel": function() {
					reject("CANCELED");
	            	$( this ).dialog( "close" );
	            }
	          }
	        });
		});
    }
    
    
	function start_ws(url, callback, err_callback) {
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
		}catch{
			err_callback();
		}
	}
	
	function start_p2p(p2p_uuid, callback, err_callback) {
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
				var bitrate = 0;
				var lines = offer.payload.sdp.sdp.split('\r\n');
				for(var i=0;i<lines.length;i++){
					// vp9
					if(lines[i].startsWith('b=AS:')){
						bitrate = parseInt(lines[i].replace('b=AS:', ''));
					}
				}
				pc.setRemoteDescription(offer.payload.sdp).then(function() {
					return pc.createAnswer();
				}).then(function(sdp) {
					console.log('Created answer.');
					var lines = sdp.sdp.split('\r\n');
					for(var i=0;i<lines.length;i++){
						// stereo
						if(lines[i].startsWith('a=fmtp:111')){
							lines[i] = lines[i].replace(
								/a=fmtp:111/,
								'a=fmtp:111 stereo=1\r\na=fmtp:111');
						}
						// vp9
						if(lines[i].startsWith('m=video 9')){
							lines[i] = lines[i].replace(
									'm=video 9 UDP/TLS/RTP/SAVPF 96 97 98 99 100 101 127',
									'm=video 9 UDP/TLS/RTP/SAVPF 98 96 97 99 100 101 127');
						}
						// bitrate
						if(lines[i].startsWith('m=video 9')){
							if (bitrate) {
								lines[i] = lines[i] + '\r\n' +
										'b=AS:' + bitrate;
							}
						}
					}
					sdp.sdp = lines.join('\r\n');
					
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
						//for(var receiver of m_pc.getReceivers()){
						//	switch(receiver.track.kind){
						//		case 'audio':
						//			break;
						//		case 'video':
						//			break;
						//	}
						//}
						dc.addEventListener('close', function(data){
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
	function init_connection(conn) {
		var is_init = false;
		var init_con = function() {
			is_init = true;
			m_plugin_host.set_info("waiting image...");
			m_rtp.set_connection(conn);
			m_rtcp.set_connection(conn);
		}
		var timediff_ms = 0;
		var min_rtt = 0;
		var ping_cnt = 0;
		{ // ping
			var cmd = "<picam360:command id=\"0\" value=\"ping " +
				new Date().getTime() + "\" />"
			var pack = m_rtcp.buildpacket(cmd, PT_CMD);
			m_rtcp.sendpacket(conn, pack);
		}
		conn.addEventListener('message', function(data){
			if(data instanceof MessageEvent){
				data = data.data;
			}
			if (!is_init) {
				function handle_data(data){
					var pack = PacketHeader(data);
					if (pack.GetPayloadType() == PT_STATUS) {
						var str = (new TextDecoder)
							.decode(new Uint8Array(pack.GetPayload()));
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
								var cmd = "<picam360:command id=\"0\" value=\"ping " +
									new Date().getTime() + "\" />"
								var pack = m_rtcp.buildpacket(cmd, PT_CMD);
								m_rtcp.sendpacket(conn, pack);
								return;
							} else {
								var cmd = "<picam360:command id=\"0\" value=\"set_timediff_ms " +
									timediff_ms + "\" />";
								var pack = m_rtcp.buildpacket(cmd, PT_CMD);
								m_rtcp.sendpacket(conn, pack);

								console.log("min_rtt=" + min_rtt +
									":timediff_ms:" +
									timediff_ms);
								m_timediff_ms = timediff_ms;
							}
						}
					}
					init_con();
				}
				if(data instanceof Blob) {
				    var fr = new FileReader();
				    fr.onload = function(evt) {
				      handle_data(evt.target.result);
				    };
				    fr.readAsArrayBuffer(data);
				}else{
					if (Array.isArray(data)) {
						for(_data of data){
							handle_data(_data);
						}
					}else{
						handle_data(data);
					}
				}
			}
		});
	};
	
	return function(plugin_host) {
		//debugger;
		m_plugin_host = plugin_host;
		
		var plugin = {
			init_options : function(options) {
				m_plugin_host.loadScript("plugins/network/signaling.js").then(() => {
					return m_plugin_host.loadScript("plugins/network/m_rtp.js");
				}).then(() => {
					return m_plugin_host.loadScript("plugins/network/m_rtcp.js");
				}).then(() => {
					return addMenuButton("swConnect", "Connect");
				}).then(() => {
					m_rtp = Rtp();
					m_rtcp = Rtcp();
					// set rtp callback
					m_rtp.set_callback(function(packet) {
						var sequencenumber = packet.GetSequenceNumber();
						if ((sequencenumber % 100) == 0) {
							var latency = new Date().getTime() /
								1000 -
								(packet.GetTimestamp() + packet.GetSsrc() / 1E6) +
								self.timediff_ms / 1000;
							console.log("packet latency : seq=" + sequencenumber +
								", latency=" + latency + "sec");
						}
						if (packet.GetPayloadType() == PT_AUDIO_BASE) { // audio
							if (opus_decoder) {
								opus_decoder.decode(packet.GetPayload());
								if (audio_first_packet_s == 0) {
									var latency = new Date().getTime() /
										1000 -
										(packet.GetTimestamp() + packet.GetSsrc() / 1E6) +
										self.timediff_ms / 1000;
									console.log("audio_first_packet:latency:" +
										latency);
									audio_first_packet_s = new Date().getTime() / 1000;
								}
							}
						} else if (packet.GetPayloadType() == PT_CAM_BASE) { // image
							m_image_decoder.decode(packet.GetPayload());
						} else if (packet.GetPayloadType() == PT_STATUS) { // status
							var str = (new TextDecoder)
								.decode(new Uint8Array(packet.GetPayload()));
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
							for (var i = 0; i < filerequest_list.length; i++) {
								if (filerequest_list[i].key == key) {
									if (seq == 0) {
										filerequest_list[i].chunk_array = [];
									}
									filerequest_list[i].chunk_array.push(data);
									if (eof) {
										filerequest_list[i]
											.callback(filerequest_list[i].chunk_array);
										filerequest_list.splice(i, 1);
										break;
									}
								}
							}
						}
					});
					// command to upstream
					setInterval(function() {
						if (!m_cmd2upstream_list.length) {
							return;
						}
						var {cmd} = m_cmd2upstream_list.shift();
						var xml = "<picam360:command id=\"" + app.rtcp_command_id +
							"\" value=\"" + cmd + "\" />"
						m_rtcp.sendpacket(m_rtcp.buildpacket(xml, PT_CMD));
						app.rtcp_command_id++;
					}, 33); // 30hz
					swConnect.onclick = async (evt) => {
						await prompt("input connection info", "connect stream via network").then((opt) => {
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
					};
				});
			},
			event_handler : function(sender, event) {
			},
		};
		return plugin;
	}
})();