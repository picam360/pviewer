
var is_nodejs = (typeof process !== 'undefined' && process.versions && process.versions.node);
var rtp_mod;
var util;
if(is_nodejs){
	rtp_mod = require("./rtp.js");
	util = require('util');
}else{
	rtp_mod = {
		Rtp,
		PacketHeader,
	};
	util = {
		TextDecoder,
		TextEncoder,
	};
}

var PT_STATUS = 100;
var PT_CMD = 101;
var PT_FILE = 102;
var PT_ENQUEUE = 110;
var PT_SET_PARAM = 111;
var PT_MT_ENQUEUE = 120;
var PT_MT_SET_PARAM = 121;

function MeetingClient(pstcore, host, _options) {
	if(!host){
		return null;
	}
	var PacketHeaderLength = 12;
	var m_host = host;
	var m_pst_dq;
	var m_pst_eqs = {};
	var m_pst_eq_building_src = -1;
	var m_enqueue_pendings = {};
	var m_in_pt_set_param;

	var options = _options || {};
	
	{//output stream
	    var dequeue_callback = (data) => {
            try{
                if(data == null){//eob
					var pack = m_host.build_packet(new util.TextEncoder().encode("<eob/>", 'ascii'), PT_MT_ENQUEUE);
                    m_host.send_packet(pack);
                }else{
                    //console.log("dequeue " + data.length);
                    var MAX_PAYLOAD = 16*1024;//16k is webrtc max
                    var CHUNK_SIZE = MAX_PAYLOAD - PacketHeaderLength;
                    for(var cur=0;cur<data.length;cur+=CHUNK_SIZE){
                        var chunk = data.slice(cur, cur + CHUNK_SIZE);
                        var pack = m_host.build_packet(chunk, PT_MT_ENQUEUE);
                        m_host.send_packet(pack);
                    }
                }
            }catch(err){
                console.log(err);
            }
        };
		var def = "oal_capture name=capture ! opus_encoder";
        if (window.cordova && window.PstCoreLoader) {
            pstcore.pstcore_build_pstreamer("cordova_binder", (pst) => {
                m_pst_dq = pst;
                pstcore.pstcore_set_param(m_pst_dq, "cordova_binder", "def", def);
				if(options.audio_input_devicename){
					pstcore.pstcore_set_param(m_pst_dq, "capture", "devicename", options.audio_input_devicename);
				}
                pstcore.pstcore_set_dequeue_callback(m_pst_dq, dequeue_callback);
                pstcore.pstcore_start_pstreamer(m_pst_dq);
            });
        } else {
            pstcore.pstcore_build_pstreamer(def, (pst) => {
                m_pst_dq = pst;
				if(options.audio_input_devicename){
					pstcore.pstcore_set_param(m_pst_dq, "capture", "devicename", options.audio_input_devicename);
				}
                pstcore.pstcore_set_dequeue_callback(m_pst_dq, dequeue_callback);
                pstcore.pstcore_start_pstreamer(m_pst_dq);
            });
        }
	}

	var self = {
		handle_packet : (packet) => {
			if (packet.GetPayloadType() == PT_MT_ENQUEUE) { // enqueue
				var src = packet.GetSsrc();
				var chunk = packet.GetPayload();
				var eob = "<eob/>";

				if(!m_enqueue_pendings[src]){
					m_enqueue_pendings[src] = [];
				}

				if(!m_pst_eqs[src]){ //input stream
					if(m_pst_eq_building_src < 0){
						m_pst_eq_building_src = src;
						var def = "opus_decoder ! oal_player name=player realtime=1 buffer=0.25";
                        if (window.cordova && window.PstCoreLoader) {
                            pstcore.pstcore_build_pstreamer("cordova_binder", (pst) => {
                                m_pst_eqs[m_pst_eq_building_src] = pst;
                                pstcore.pstcore_set_param(m_pst_eqs[m_pst_eq_building_src], "cordova_binder", "def", def);
								if(options.audio_output_devicename){
									console.log("player.devicename", options.audio_output_devicename);
									pstcore.pstcore_set_param(m_pst_dq, "player", "devicename", options.audio_output_devicename);
								}
								pstcore.pstcore_start_pstreamer(m_pst_eqs[m_pst_eq_building_src]);
								m_pst_eq_building_src = -1;
                            });
                        } else {
                            pstcore.pstcore_build_pstreamer(def, (pst) => {
                                m_pst_eqs[m_pst_eq_building_src] = pst;
								if(options.audio_output_devicename){
									console.log("player.devicename", options.audio_output_devicename);
									pstcore.pstcore_set_param(m_pst_dq, "player", "devicename", options.audio_output_devicename);
								}
                                pstcore.pstcore_start_pstreamer(m_pst_eqs[m_pst_eq_building_src]);
                                m_pst_eq_building_src = -1;
                            });
                        }
					}else{
						//just wait
					}
				}
				
				if(chunk[0] == eob.charCodeAt(0) &&
				   chunk[1] == eob.charCodeAt(1) &&
				   chunk[2] == eob.charCodeAt(2) &&
				   chunk[3] == eob.charCodeAt(3) &&
				   chunk[chunk.length - 2] == eob.charCodeAt(4) &&
				   chunk[chunk.length - 1] == eob.charCodeAt(5)){
					
					var buff = null;
					if(m_enqueue_pendings[src].length == 1){
						buff = m_enqueue_pendings[src][0];
					}else if(m_enqueue_pendings[src].length > 1){
						var len = 0;
						for (var _chunk of m_enqueue_pendings[src]) {
							len += _chunk.length;
						}
						buff = new Uint8Array(len);
						var cur = 0;
						for (var _chunk of m_enqueue_pendings[src]) {
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

						if(m_pst_eqs[src]){
							pstcore.pstcore_enqueue(m_pst_eqs[src], buff);
							pstcore.pstcore_enqueue(m_pst_eqs[src], null);//eob
							m_enqueue_pendings[src] = null;
						}
					}
				}else{
					m_enqueue_pendings[src].push(chunk);
				}
				
			} else if (packet.GetPayloadType() == PT_MT_SET_PARAM) { // set_param
				var str = (new TextDecoder)
					.decode(packet.GetPayload());
				var list = JSON.parse(str);
				for(var ary of list){
					m_in_pt_set_param = true;
					//pstcore.pstcore_set_param(m_pst_in, ary[0], ary[1], ary[2]);
					m_in_pt_set_param = false;
				}
			}
		},
		close : () => {
			//pstcore.pstcore_stop_pstreamer(m_pst_dq);
			pstcore.pstcore_destroy_pstreamer(m_pst_dq);
			for(var pst of Object.values(m_pst_eqs)){
				//pstcore.pstcore_stop_pstreamer(pst);
				pstcore.pstcore_destroy_pstreamer(pst);
			}
		},
	};
	return self;
}

function MeetingHost(pstcore, selfclient_enable, _options) {
	var options = _options || {};

	var PacketHeaderLength = 12;
	var m_clients = [];
	var m_packet_pendings = {};
	var m_in_pt_set_param;
	var m_param_pendings = [];
	var m_selfclient;
	var m_selfrtp_c;
	var m_selfrtp_h;

	var options = _options || {};

	var self = {
		add_client : (rtp) => {
			if(m_clients.length == 0 && selfclient_enable){
				//m_selfclient{capture} -> m_selfrtp_h.send_packet -> self.handle_packet -> m_clients.send_packet
				//m_selfrtp_c{in m_clients}.send_packet -> m_selfclient.handle_packet{player}

				m_selfrtp_c = rtp_mod.Rtp();
				m_selfrtp_c.send_packet = (data) => {
					m_selfclient.handle_packet(rtp_mod.PacketHeader(data));
				};
				m_selfrtp_h = rtp_mod.Rtp();
				m_selfrtp_h.send_packet = (data) => {
					self.handle_packet(rtp_mod.PacketHeader(data), m_selfrtp_c);
				};
				m_selfclient = MeetingClient(pstcore, m_selfrtp_h, options);
				m_clients.push(m_selfrtp_c);
			}
			m_clients.push(rtp);
		},
		remove_client : (rtp) => {
			m_clients = m_clients.filter(n => n !== rtp);
			if(m_clients.length == 1 && selfclient_enable){
				m_selfclient.close();
				m_selfclient = null;
				m_selfrtp_h = null;
				m_selfrtp_c = null;
				m_clients = [];
			}
		},
		handle_packet : (packet, rtp) => {
			if (packet.GetPayloadType() == PT_MT_ENQUEUE) { // enqueue
				var chunk = packet.GetPayload();
				var eob = "<eob/>";
				var src = -1;

				for(var s=0;s<m_clients.length;s++){
					var _rtp = m_clients[s];
					if(_rtp == rtp){
						//rewrite src
						var pack = packet.GetPacketData();
						var view = new DataView(pack.buffer);
						view.setUint32(pack.byteOffset + 8, s, false);
						src = s;
						break;
					}
				}
				
				if(src < 0){
					return;
				}
				
				if(chunk[0] == eob.charCodeAt(0) &&
				   chunk[1] == eob.charCodeAt(1) &&
				   chunk[2] == eob.charCodeAt(2) &&
				   chunk[3] == eob.charCodeAt(3) &&
				   chunk[chunk.length - 2] == eob.charCodeAt(4) &&
				   chunk[chunk.length - 1] == eob.charCodeAt(5)){
					
					for(var _rtp of m_clients){
						try{
							if(_rtp == rtp){
								continue;
							}
							for (var _packet of m_packet_pendings[src]) {
								_rtp.send_packet(_packet.GetPacketData());
							}
							_rtp.send_packet(packet.GetPacketData());//eob
						}catch(err){
							self.remove_client(_rtp);
						}
					}
					m_packet_pendings[src] = [];
				}else{
					if(!m_packet_pendings[src]){
						m_packet_pendings[src] = [];
					}
					m_packet_pendings[src].push(packet);
				}
				
			} else if (packet.GetPayloadType() == PT_MT_SET_PARAM) { // set_param

			}
		},
	};
	return self;
}
if (typeof exports !== 'undefined') {
	exports.MeetingClient = MeetingClient;
	exports.MeetingHost = MeetingHost;
}