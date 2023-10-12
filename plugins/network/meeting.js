
var is_nodejs = (typeof cordova === 'undefined' && typeof process !== 'undefined' && process.versions && process.versions.node);
var rtp_mod;
var util;
var use_cordova_binder = false;
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
	if (window && window.cordova && window.PstCoreLoader) {
		use_cordova_binder = true;
	}
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
	var m_src_data = {};

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
		var post_build = (pst, src) => {
			m_pst_dq = pst;
			if (use_cordova_binder) {
				pstcore.pstcore_set_param(m_pst_dq, "cordova_binder", "def", def);
			}
			if(options.audio_input_devicename){
				pstcore.pstcore_set_param(m_pst_dq, "capture", "devicename", options.audio_input_devicename);
			}
			pstcore.pstcore_set_dequeue_callback(m_pst_dq, dequeue_callback);
			pstcore.pstcore_start_pstreamer(m_pst_dq);
		};
        if (use_cordova_binder) {
            pstcore.pstcore_build_pstreamer("cordova_binder", post_build);
        } else {
            pstcore.pstcore_build_pstreamer(def, post_build);
        }
	}

	var self = {
		handle_packet : (packet) => {
			var src = packet.GetSsrc();
			if(!m_src_data[src]){
				m_src_data[src] = {
					pst : 0,
					enqueue_pendings : [],
					param_pendings : [],
					in_pt_set_param : false,
				};
			}

			if (packet.GetPayloadType() == PT_MT_ENQUEUE) { // enqueue
				var chunk = packet.GetPayload();
				var eob = "<eob/>";

				if(!m_src_data[src].pst){ //input stream
					var def = "opus_decoder ! oal_player name=player realtime=1 buffer=0.2";
					var post_build = (pst, src) => {
						m_src_data[src].pst = pst;
						if (use_cordova_binder) {
							pstcore.pstcore_set_param(m_src_data[src].pst, "cordova_binder", "def", def);
						}
						for (var ary of m_src_data[src].param_pendings) {
							pstcore.pstcore_set_param(m_src_data[src].pst, ary[0], ary[1], ary[2]);
							if(ary[0] == "network" && ary[1] == "timediff_ms"){
								var timediff = parseFloat(ary[2])/1e3;
								pstcore.pstcore_set_param(m_src_data[src].pst, "player", "timediff", timediff.toString());
							}
						}
						if(options.audio_output_devicename){
							console.log("player.devicename", options.audio_output_devicename);
							pstcore.pstcore_set_param(m_src_data[src].pst, "player", "devicename", options.audio_output_devicename);
						}
						pstcore.pstcore_start_pstreamer(m_src_data[src].pst);
					};
					if (use_cordova_binder) {
						pstcore.pstcore_build_pstreamer("cordova_binder", post_build, src);
					} else {
						pstcore.pstcore_build_pstreamer(def, post_build, src);
					}
				}
				
				if(chunk[0] == eob.charCodeAt(0) &&
				   chunk[1] == eob.charCodeAt(1) &&
				   chunk[2] == eob.charCodeAt(2) &&
				   chunk[3] == eob.charCodeAt(3) &&
				   chunk[chunk.length - 2] == eob.charCodeAt(4) &&
				   chunk[chunk.length - 1] == eob.charCodeAt(5)){
					
					if(m_src_data[src].pst){
						var buff = null;
						if(m_src_data[src].enqueue_pendings.length == 1){
							buff = m_src_data[src].enqueue_pendings[0];
						}else if(m_src_data[src].enqueue_pendings.length > 1){
							var len = 0;
							for (var _chunk of m_src_data[src].enqueue_pendings) {
								len += _chunk.length;
							}
							buff = new Uint8Array(len);
							var cur = 0;
							for (var _chunk of m_src_data[src].enqueue_pendings) {
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

							pstcore.pstcore_enqueue(m_src_data[src].pst, buff);
							pstcore.pstcore_enqueue(m_src_data[src].pst, null);//eob
						}
					}
					m_src_data[src].enqueue_pendings = [];
				}else{
					m_src_data[src].enqueue_pendings.push(chunk);
				}
				
			} else if (packet.GetPayloadType() == PT_MT_SET_PARAM) { // set_param
				var str = (new TextDecoder)
					.decode(packet.GetPayload());
				var list = JSON.parse(str);
				for(var ary of list){
					m_src_data[src].in_pt_set_param = true;
					if(!m_src_data[src].pst){
						m_src_data[src].param_pendings.push(ary);
					}else{
						pstcore.pstcore_set_param(m_src_data[src].pst, ary[0], ary[1], ary[2]);
					}
					m_src_data[src].in_pt_set_param = false;
				}
			}
		},
		close : () => {
			pstcore.pstcore_destroy_pstreamer(m_pst_dq);
			m_pst_dq = 0;
			for(var data of Object.values(m_src_data)){
				pstcore.pstcore_destroy_pstreamer(data.pst);
			}
			m_src_data = {};
		},
	};
	return self;
}

var SELF_RTP_CLIENT = (1 << 30) + 1;
var SELF_RTP_HOST = (1 << 30) + 2;

function MeetingHost(pstcore, selfclient_enable, _options) {
	var options = _options || {};

	var PacketHeaderLength = 12;
	var m_clients = {};
	var m_presentor = 0;
	var m_selfclient = null;
	var m_selfrtp_c = null;
	var m_selfrtp_h = null;
	var m_param_pendings = [];

	var options = _options || {};

	var m_timer = setInterval(function() {
		if(m_param_pendings.length > 0) {
			var param_pendings = m_param_pendings;
			m_param_pendings = [];
			for(var [param_str, rtp] of param_pendings){
				var msg = "[" + param_str + "]";
				for(var src in m_clients){
					if(rtp && rtp.src != src){
						continue;
					}
					try{
						var pack = m_clients[src].build_packet(msg, PT_MT_SET_PARAM);
						m_clients[src].send_packet(pack);
					}catch(err){
						self.remove_client(m_clients[src]);
					}
				}
			}
		}
	}, 33);

	function rewite_src(pack, src){
		if(!pack){
			return;
		}
		if(pack.GetPacketData){
			pack = pack.GetPacketData();
		}else if(pack instanceof ArrayBuffer){
			pack = new Uint8Array(pack);
		}
		var view = new DataView(pack.buffer);
		view.setUint32(pack.byteOffset + 8, src, false);//rewrite src
	}

	var self = {
		add_client : (rtp) => {
			var push_client = (rtp) =>{
				rtp.src_data = {
					packet_pendings : [],
					param_pendings : [],
					in_pt_set_param : false,
				};
				m_clients[rtp.src] = rtp;
				self.send_mt_param("mt_host", "n_clients", Object.keys(m_clients).length.toString());

				for(var src in m_clients){
					if(src == rtp.src){//prevent loop back
						continue;
					}
					try{
						var timediff_ms = (m_clients[src].timediff_ms || 0) - (rtp.timediff_ms || 0);
						{
							var msg = `[["network","timediff_ms","${timediff_ms}"]]`;
							var pack = m_clients[src].build_packet(msg, PT_MT_SET_PARAM);
							rewite_src(pack, rtp.src);
							m_clients[src].send_packet(pack);
						}
						{
							var msg = `[["network","timediff_ms","${-timediff_ms}"]]`;
							var pack = m_clients[src].build_packet(msg, PT_MT_SET_PARAM);
							rewite_src(pack, src);
							m_clients[rtp.src].send_packet(pack);
						}
					}catch(err){
						self.remove_client(m_clients[src]);
					}
				}
			};
			if(Object.keys(m_clients).length == 0 && selfclient_enable){
				//m_selfclient{capture} -> m_selfrtp_h.send_packet -> self.handle_packet -> m_clients.send_packet
				//m_selfrtp_c{in m_clients}.send_packet -> m_selfclient.handle_packet{player}

				m_selfrtp_c = rtp_mod.Rtp();
				m_selfrtp_c.src = SELF_RTP_CLIENT;
				m_selfrtp_c.send_packet = (data) => {
					m_selfclient.handle_packet(rtp_mod.PacketHeader(data));
				};
				m_selfrtp_h = rtp_mod.Rtp();
				m_selfrtp_h.src = SELF_RTP_HOST;
				m_selfrtp_h.send_packet = (data) => {
					self.handle_packet(rtp_mod.PacketHeader(data), m_selfrtp_c);
				};

				m_selfclient = MeetingClient(pstcore, m_selfrtp_h, options);
				push_client(m_selfrtp_c);
			}
			push_client(rtp);
		},
		remove_client : (rtp) => {
			if(m_presentor == rtp.src){
				m_presentor = 0;
			}
			delete m_clients[rtp.src];
			if(Object.keys(m_clients).length == 1 && selfclient_enable){
				m_selfclient.close();
				m_selfclient = null;
				m_selfrtp_h = null;
				m_selfrtp_c = null;
				m_clients = {};
			}
			self.send_mt_param("mt_host", "n_clients", Object.keys(m_clients).length.toString());
		},
		send_mt_param : (pst_name, param, value, rtp) => {
			var param_str = "[\"" + pst_name + "\",\"" + param + "\",\"" + value + "\"]";
			m_param_pendings.push([param_str, rtp]);
		},
		handle_packet : (packet, rtp) => {
			if(!rtp || !m_clients[rtp.src]){//fail safe
				return;
			}
			rewite_src(packet, rtp.src);
			
			if (packet.GetPayloadType() == PT_MT_ENQUEUE) { // enqueue
				var chunk = packet.GetPayload();
				var eob = "<eob/>";
				
				if(chunk[0] == eob.charCodeAt(0) &&
				   chunk[1] == eob.charCodeAt(1) &&
				   chunk[2] == eob.charCodeAt(2) &&
				   chunk[3] == eob.charCodeAt(3) &&
				   chunk[chunk.length - 2] == eob.charCodeAt(4) &&
				   chunk[chunk.length - 1] == eob.charCodeAt(5)){
					
					for(var src in m_clients){
						if(src == rtp.src){//prevent loop back
							continue;
						}
						if(m_presentor != 0){
							//(presentor to others) or (others to presentor)
							if(rtp.src == m_presentor || src == m_presentor){
								//pass through
							}else{
								continue;
							}
						}
						try{
							for (var _packet of m_clients[rtp.src].src_data.packet_pendings) {
								m_clients[src].send_packet(_packet.GetPacketData());
							}
							m_clients[src].send_packet(packet.GetPacketData());//eob
						}catch(err){
							self.remove_client(m_clients[src]);
						}
					}
					m_clients[rtp.src].src_data.packet_pendings = [];
				}else{
					m_clients[rtp.src].src_data.packet_pendings.push(packet);
				}
				
			} else if (packet.GetPayloadType() == PT_MT_SET_PARAM) { // set_param
				var str = new TextDecoder().decode(packet.GetPayload());
				try{
					var list = JSON.parse(str);
					for(var ary of list){
						if(ary[0] == "mt_host"){
							if(ary[1] == "offer_presentor"){
								if(ary[2] == "1"){
									m_presentor = rtp.src;
								}
								self.send_mt_param("mt_host", "presentor", m_presentor.toString());
							}
							if(ary[1] == "resign_presentor"){
								if(ary[2] == "1" && m_presentor == rtp.src){
									m_presentor = 0;
								}
								self.send_mt_param("mt_host", "presentor", m_presentor.toString());
							}
						}
					}
				}catch{
					console.log("fail parse json", str);
				}
			}
		},
	};
	return self;
}
if (typeof exports !== 'undefined') {
	exports.MeetingClient = MeetingClient;
	exports.MeetingHost = MeetingHost;
}