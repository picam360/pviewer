
function MeetingClient(host) {
	if(!host){
		return null;
	}
	var PacketHeaderLength = 12;
	var pstcore = app.get_pstcore();
	var m_host = host;
	var m_pst_dq;
	var m_pst_eqs = {};
	var m_pst_eq_building_src = -1;
	var m_enqueue_pendings = [];
	var m_in_pt_set_param;

	{//output stream
		var def = "oal_capture name=capture ! opus_encoder";
		pstcore.pstcore_build_pstreamer(def, (pst) => {
			m_pst_dq = pst;
			pstcore.pstcore_set_dequeue_callback(m_pst_dq, (data)=>{
				try{
					if(data == null){//eob
						var pack = m_host.buildpacket(new TextEncoder().encode("<eob/>", 'ascii'), PT_MT_ENQUEUE);
						m_host.sendpacket(pack);
					}else{
						//console.log("dequeue " + data.length);
						var MAX_PAYLOAD = 16*1024;//16k is webrtc max
						var CHUNK_SIZE = MAX_PAYLOAD - PacketHeaderLength;
						for(var cur=0;cur<data.length;cur+=CHUNK_SIZE){
							var chunk = data.slice(cur, cur + CHUNK_SIZE);
							var pack = m_host.buildpacket(chunk, PT_MT_ENQUEUE);
							m_host.sendpacket(pack);
						}
					}
				}catch(err){
					console.log(err);
				}
			});
			pstcore.pstcore_start_pstreamer(m_pst_dq);
		});
	}

	var self = {
		handle_packet : (packet) => {
			if (packet.GetPayloadType() == PT_MT_ENQUEUE) { // enqueue
				var src = packet.GetSsrc();
				var chunk = packet.GetPayload();
				var eob = "<eob/>";

				if(!m_pst_eqs[src]){ //input stream
					if(m_pst_eq_building_src < 0){
						m_pst_eq_building_src = src;
						var def = "opus_decoder ! oal_player realtime=1 buffer=0.2";
						pstcore.pstcore_build_pstreamer(def, (pst) => {
							m_pst_eqs[m_pst_eq_building_src] = pst;
							pstcore.pstcore_start_pstreamer(m_pst_eqs[m_pst_eq_building_src]);
							m_pst_eq_building_src = -1;
						});
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
					if(m_enqueue_pendings.length == 1){
						buff = m_enqueue_pendings[0];
					}else if(m_enqueue_pendings.length > 1){
						var len = 0;
						for (var _chunk of m_enqueue_pendings) {
							len += _chunk.length;
						}
						var buff = new Uint8Array(len);
						var cur = 0;
						for (var _chunk of m_enqueue_pendings) {
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
							m_enqueue_pendings = [];
						}
					}
				}else{
					m_enqueue_pendings.push(chunk);
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
			pstcore.pstcore_stop_pstreamer(m_pst_dq);
			pstcore.pstcore_destroy_pstreamer(m_pst_dq);
			for(var pst of Object.values(m_pst_eqs)){
				pstcore.pstcore_stop_pstreamer(pst);
				pstcore.pstcore_destroy_pstreamer(pst);
			}
		},
	};
	return self;
}

function MeetingHost(selfclient_enable) {
	var PacketHeaderLength = 12;
	var pstcore = app.get_pstcore();
	var m_clients = [];
	var m_packet_pendings = {};
	var m_in_pt_set_param;
	var m_selfclient;
	var m_selfrtp_c;
	var m_selfrtp_h;

	var self = {
		add_client : (rtp) => {
			if(m_clients.length == 0 && selfclient_enable){
				m_selfrtp_c = Rtp();
				m_selfrtp_c.sendpacket = (data) => {
					m_selfclient.handle_packet(PacketHeader(data));
				};
				m_selfrtp_h = Rtp();
				m_selfrtp_h.sendpacket = (data) => {
					self.handle_packet(PacketHeader(data), m_selfrtp_c);
				};
				m_selfclient = MeetingClient(m_selfrtp_h);
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

				for(var src=0;src<m_clients.length;src++){
					var _rtp = m_clients[src];
					if(_rtp == rtp){
						//rewrite src
						var pack = packet.GetPacketData();
						var view = new DataView(pack.buffer);
						view.setUint32(pack.byteOffset + 8, src, false);
						//console.log("handle_packet", src);
						break;
					}
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
							for (var _packet of m_packet_pendings[rtp]) {
								_rtp.sendpacket(_packet.GetPacketData());
							}
							_rtp.sendpacket(packet.GetPacketData());//eob
						}catch(err){
							self.remove_client(_rtp);
						}
					}
					m_packet_pendings[rtp] = [];
				}else{
					if(!m_packet_pendings[rtp]){
						m_packet_pendings[rtp] = [];
					}
					m_packet_pendings[rtp].push(packet);
				}
				
			} else if (packet.GetPayloadType() == PT_MT_SET_PARAM) { // set_param
				var str = (new TextDecoder)
					.decode(packet.GetPayload());
				var list = JSON.parse(str);
				for(var ary of list){
					m_in_pt_set_param = true;
					//pstcore.pstcore_set_param(m_pst, ary[0], ary[1], ary[2]);
					m_in_pt_set_param = false;
				}
			}
		},
	};
	return self;
}