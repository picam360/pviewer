
var is_nodejs = (typeof process !== 'undefined' && process.versions && process.versions.node);
var util;
if(is_nodejs){
	util = require('util');
}else{
	util = {
		TextDecoder,
		TextEncoder,
	};
}


var create_plugin = (function() {
    var PERMANENT_KEY = "meeting_host_js_options";
	var PacketHeaderLength = 12;
    var m_plugin_host = null;
    var m_plugin = null;
    var m_filerequest_list = [];
    var m_timediff_ms = 0;
	var m_pstcore = null;
    var m_options = {};
    var m_permanent_options = {};
    var m_query = GetQueryString();
    var m_rtp_mod;
    var m_rtp_rx_conns = [];
    var m_mt_host;
    var m_pst;
        
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
                     + '<td><input type="radio" name="dialog-message-type" id="dialog-message-type" value="wrtc" checked /></td><td>webrtc</td>'
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
                case "wrtc":
                    $( "#dialog-message-wsurl" ).prop('disabled', true);
                    $( "#dialog-message-wrtckey" ).prop('disabled', false);
                    break;
                }
            });
            if(m_query['host-wrtc-key']){
                $( "#dialog-message-wrtckey" ).val(m_query['host-wrtc-key']);
            }
            if(m_permanent_options['default-interface'] == 'wrtc'){
                $( "input[name='dialog-message-type']" ).val(['wrtc']).trigger("change");
            }
        });
    }

    function uuidgen() {
        return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
            (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
        );
    }
      

    function init_p2p(){
        m_rtp_mod = {};
		m_rtp_mod.send_error = function(conn, err) {
			setTimeout(function() {
				var name = "error";
				var value = err;
				var status = "<picam360:status name=\"" + name +
					"\" value=\"" + value + "\" />";
//				var pack = rtp
//					.build_packet(status, PT_STATUS);
//				rtp.send_packet(pack);
			}, 1000);
		}

		m_rtp_mod.remove_conn = function(conn) {
			for (var i = m_rtp_rx_conns.length - 1; i >= 0; i--) {
				if (m_rtp_rx_conns[i] === conn) {
					console.log("connection closed : " +
						m_rtp_rx_conns[i].attr.ip);
					m_rtp_rx_conns.splice(i, 1);

					clearInterval(conn.attr.timer);
					clearInterval(conn.attr.timer2);
					conn.close();
                    m_mt_host.remove_client(conn.rtp);
					if(conn.attr.pst){

						//let plugins know pst destroyed
						for (var i = 0; i < plugins.length; i++) {
							if (plugins[i].pst_stopped) {
								plugins[i].pst_stopped(m_pstcore, conn.attr.pst);
								break;
							}
						}

						//m_pstcore.pstcore_destroy_pstreamer(conn.attr.pst);
						conn.attr.pst = 0;
					}
					return;
				}
			}
		};
		
		m_rtp_mod.add_conn = function(conn) {
			var ip = " via webrtc";
			if (m_rtp_rx_conns.length >= 2) { // exceed client
				console.log("exceeded_num_of_clients : " + ip);
				m_rtp_mod.send_error(conn, "exceeded_num_of_clients");
				return;
			} else {
				console.log("connection opend : " + ip);
			}
			
			conn.frame_info = {
				stream_uuid: uuidgen(),
				renderer_uuid: uuidgen(),
				snapper_uuid: uuidgen(),
				recorder_uuid: uuidgen(),
				stream_mode: "vid+mt",
				// mode: options.frame_mode || "WINDOW",
				// width: options.frame_width || 512,
				// height: options.frame_height || 512,
				// stream_def: options.stream_def || "h264",
				// fps: options.frame_fps || 5,
				// bitrate: options.frame_bitrate,
			};

			conn.attr = {
				ip: ip,
				frame_queue: [],
				fps: 5,
				latency: 1.0,
				min_latency: 1.0,
				frame_num: 0,
				tmp_num: 0,
				tmp_latency: 0,
				tmp_time: 0,
				timeout: false,
				param_pendings: [],
			};
			var rtp = Rtp(conn);
			conn.rtp = rtp;
			new Promise((resolve, reject) => {
				rtp.set_callback(function(packet) {
					conn.attr.timeout = new Date().getTime();
					if (packet.GetPayloadType() == PT_CMD) {
                        var cmd = new util.TextDecoder().decode(packet.GetPayload());
						var split = cmd.split('\"');
						var id = split[1];
						var value = split[3].split(' ');
						if (value[0] == "frame_mode") {
							conn.frame_info.mode = value[1];
							return;
						} else if (value[0] == "frame_width") {
							conn.frame_info.width = value[1];
							return;
						} else if (value[0] == "frame_height") {
							conn.frame_info.height = value[1];
							return;
						} else if (value[0] == "frame_fps") {
							conn.frame_info.fps = value[1];
							return;
						} else if (value[0] == "stream_def") {
							conn.frame_info.stream_def = value[1];
							return;
						} else if (value[0] == "stream_mode") {
							conn.frame_info.stream_mode = value[1];
							return;
						} else if (value[0] == "frame_bitrate") {
							conn.frame_info.bitrate = value[1];
							return;
						} else if (value[0] == "ping") {
							var status = "<picam360:status name=\"pong\" value=\"" +
								value[1] +
								" " +
								new Date().getTime() +
								"\" />";
							var pack = rtp
								.build_packet(status, PT_STATUS);
							rtp.send_packet(pack);
							return;
						} else if (value[0] == "set_timediff_ms") {
							resolve();
						}
					}
				});
			}).then(() => {
                if(!m_pstcore){
                    m_pstcore = app.get_pstcore();
                }
                if((conn.frame_info.stream_mode == "vid" || conn.frame_info.stream_mode == "vid+mt") && !m_pst){
                    var def = "ms_capture ! pgl_remapper s=1024x1024 edge_r=0.1 ho=1 deg_offset=-90,0,0 ! wc_encoder br=4000000";
                    m_pstcore.pstcore_build_pstreamer(def, (pst) => {
                        m_pst = pst;
                        m_pstcore.pstcore_set_dequeue_callback(pst, (data)=>{
                            try{
                                if(data == null){//eob
                                    var pack = rtp.build_packet(new util.TextEncoder().encode("<eob/>", 'ascii'), PT_ENQUEUE);
                                    rtp.send_packet(pack);
                                }else{
                                    //console.log("dequeue " + data.length);
                                    var MAX_PAYLOAD = 16*1024;//16k is webrtc max
                                    var CHUNK_SIZE = MAX_PAYLOAD - PacketHeaderLength;
                                    for(var cur=0;cur<data.length;cur+=CHUNK_SIZE){
                                        var chunk = data.slice(cur, cur + CHUNK_SIZE);
                                        var pack = rtp.build_packet(chunk, PT_ENQUEUE);
                                        rtp.send_packet(pack);
                                    }
                                }
                            }catch(err){
                                console.log(err);
                            }
                        });
                        // m_pstcore.pstcore_add_set_param_done_callback(pst, (msg)=>{
                        // 	//console.log("set_param " + msg);
                        // 	if(m_in_pt_set_param){//prevent loop back
                        // 		return;
                        // 	}
                        // 	m_param_pendings.push(msg);
                        // });
                        m_pstcore.pstcore_start_pstreamer(pst);
                    });
                }
                if(!m_mt_host){
                    m_mt_host = MeetingHost(m_pstcore, true);
                }
                if((conn.frame_info.stream_mode == "mt" || conn.frame_info.stream_mode == "vid+mt")){
                    m_mt_host.add_client(rtp);
                }

				m_rtp_rx_conns.push(conn);

				conn.attr.timer = setInterval(function() {
					try{
                        //TODO : need to timeout
						//var now = new Date().getTime();
						// if (now - conn.attr.timeout > 60000) {
						// 	console.log("timeout");
						// 	throw "TIMEOUT";
						// }
						if(conn.attr.param_pendings.length > 0) {
							var msg = "[" + conn.attr.param_pendings.join(',') + "]";
							var pack = rtp.build_packet(msg, PT_SET_PARAM);
							rtp.send_packet(pack);
							conn.attr.param_pendings = [];
						}
					}catch(err){
						m_rtp_mod.remove_conn(conn);
					}
				}, 33);
				
				conn.attr.transmitbytes = 0;
				conn.attr.timer2 = setInterval(()=>{
					if(conn.attr.transmitbytes == 0){
						return;
					}
					console.log(8*conn.attr.transmitbytes/1000);
					conn.attr.transmitbytes=0;
				},1000);
				
				rtp.set_callback(function(packet, _rtp) {
					conn.attr.timeout = new Date().getTime();
					if (packet.GetPayloadType() == PT_SET_PARAM) { // set_param
						var str = new TextDecoder().decode(packet.GetPayload());
						try{
							var list = JSON.parse(str);
							for(var ary of list){
								conn.attr.in_pt_set_param = true;
								m_pstcore.pstcore_set_param(conn.attr.pst, ary[0], ary[1], ary[2]);
								conn.attr.in_pt_set_param = false;
							}
						}catch{
							console.log("fail parse json", str);
						}
					// }else if (packet.GetPayloadType() == PT_CMD) {
					// 	var cmd = packet.GetPacketData().toString('ascii', packet
					// 		.GetHeaderLength());
					// 	var split = cmd.split('\"');
					// 	var id = split[1];
					// 	var value = split[3];
					// 	//plugin_host.send_command(value, conn);
					// 	if (options.debug >= 5) {
					// 		console.log("cmd got :" + cmd);
					// 	}
					}else{
                        if((conn.frame_info.stream_mode == "mt" || conn.frame_info.stream_mode == "vid+mt")){
                            m_mt_host.handle_packet(packet, _rtp);
                        }
                    }
				}, rtp);
			});
		}
    }
    
    function start_p2p(p2p_uuid, callback, err_callback) {
        m_permanent_options['host-wrtc-key'] = p2p_uuid;
        m_permanent_options['default-interface'] = 'wrtc';
        localStorage.setItem(PERMANENT_KEY, JSON.stringify(m_permanent_options));

        var key = p2p_uuid || uuidgen();
        console.log("\n\n\n");
        console.log("webrtc key : " + key);
        console.log("https://picam360.github.io/pviewer/?wrtc-key=" + key);
        console.log("\n\n\n");
        var sig_options = {
            host: SIGNALING_HOST,
            port: SIGNALING_PORT,
            secure: SIGNALING_SECURE,
            key: P2P_API_KEY,
            local_peer_id: key,
            iceServers : [
                             {"urls": "stun:stun.l.google.com:19302"},
                            {"urls": "stun:stun1.l.google.com:19302"},
                            {"urls": "stun:stun2.l.google.com:19302"},
                        ],
            debug: m_options['debug'] || 0,
        };
        var connect = function() {
            var pc_map = {};
            var sig = new Signaling(sig_options);
            sig.connect(function() {
                sig.start_ping();
            });
            sig.onrequestoffer = function(request) {
                var pc = new RTCPeerConnection({
                    sdpSemantics: 'unified-plan',
                    iceServers: sig_options.iceServers,
                });
                pc_map[request.src] = pc;

                var dc = pc.createDataChannel('data');
                dc.onopen = function() {
                    console.log('Data channel connection success');
                    class DataChannel extends EventEmitter {
                        constructor() {
                            super();
                            var self = this;
                            this.peerConnection = pc;
                            dc.addEventListener('message', function(data) {
                                self.emit('data', new Uint8Array(data.data));
                            });
                        }
                        getMaxPayload() {
                            return dc.maxRetransmits;
                        }
                        send(data) {
                            if (dc.readyState != 'open') {
                                return;
                            }
                            if (!Array.isArray(data)) {
                                data = [data];
                            }
                            try {
                                for (var i = 0; i < data.length; i++) {
                                    dc.send(data[i]);
                                }
                            } catch (e) {
                                console.log('error on dc.send');
                                this.close();
                            }
                        }
                        close() {
                            dc.close();
                            pc.close();
                            console.log('Data channel closed');
                        }
                    }
                    dc.DataChannel = new DataChannel();
                    m_rtp_mod.add_conn(dc.DataChannel);
                }

                pc.createOffer().then(function(sdp) {
                    console.log('setLocalDescription');
                    pc.setLocalDescription(sdp);
                    sig.offer(request.src, sdp);
                }).catch(function(err) {
                    console.log('failed offering:' +
                        err);
                });
                pc.onicecandidate = function(event) {
                    if (event.candidate) {
                        sig.candidate(request.src, event.candidate);
                    } else {
                        // All ICE candidates have been sent
                    }
                };
                pc.onconnectionstatechange = function(event) {
                    console.log('peer connection state changed : ' + pc.connectionState);
                    switch (pc.connectionState) {
                        case "connected":
                            // The connection has become fully connected
                            break;
                        case "disconnected":
                        case "failed":
                        case "closed":
                            console.log('peer connection closed');
                            pc.close();
                            dc.close();
                            if (dc.DataChannel) {
                                m_rtp_mod.remove_conn(dc.DataChannel);
                            }
                            break;
                    }
                }
            };
            sig.onanswer = function(answer) {
                if (pc_map[answer.src]) {
                    pc_map[answer.src].setRemoteDescription(answer.payload.sdp);
                }
            };
            sig.oncandidate = function(candidate) {
                if (pc_map[candidate.src] && candidate.payload.ice.candidate) {
                    pc_map[candidate.src].addIceCandidate(candidate.payload.ice);
                }
            };
            sig.onclose = function(e) {
                // console.log('Socket closed : dump error object below');
                // console.dir(e);
                setTimeout(() => {
                    console.log('Try to reconnect');
                    connect();
                }, 1000);
            };
        };
        connect();
    }
    
    function open_dialog(){
        prompt("input connection info", "start host service via network").then((opt) => {
            if(opt.type == "wrtc"){
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
                }).then(() => {
                    return m_plugin_host.loadScript("plugins/network/meeting.js");
                }).then(() => {
                    init_p2p();
                    //debug
                    // setTimeout(()=>{
                    //     MeetingClient({});
                    // }, 2000);
                });
                try{
                    m_permanent_options = JSON.parse(localStorage.getItem(PERMANENT_KEY)) || {};
                }catch (e){
                    m_permanent_options = {};
                }
                var bln_open_dialog = false;
                Object.assign(options, m_permanent_options);
                if(m_query['host-wrtc-key'] == undefined){
                    if(options['host-wrtc-key']){
                        m_query['host-wrtc-key'] = options['host-wrtc-key'];
                    }
                }else{
                    m_permanent_options['default-interface'] = 'wrtc';
                    bln_open_dialog = true;
                }
                if(bln_open_dialog){
                    open_dialog();
                }
            },
            on_restore_app_menu : function(callback) {
                addMenuButton("swHost", "Host").then(() => {
                    swHost.onclick = (evt) => {
                        open_dialog();
                    };
                });
            },
            event_handler : function(sender, event) {
            },
            command_handler : function(cmd, update) {
            },
        };
        return m_plugin;
    }
})();