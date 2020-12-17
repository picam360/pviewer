function PacketHeader(pack) {
	var view = new DataView(pack);
	var packetlength = view.byteLength;
	var payloadtype = view.getUint8(1, false) & 0x7F;
	var sequencenumber = view.getUint16(2, false);
	var timestamp = view.getUint32(4, false);
	var ssrc = view.getUint32(8, false);
	var self = {
		GetSequenceNumber : function() {
			return sequencenumber;
		},
		GetTimestamp : function() {
			return timestamp;
		},
		GetSsrc : function() {
			return ssrc;
		},
		GetPacketData : function() {
			return new Uint8Array(pack, 0, packetlength);
		},
		GetPacketLength : function() {
			return packetlength;
		},
		GetHeaderLength : function() {
			return 12;
		},
		GetPayloadType : function() {
			return payloadtype;
		},
		GetPayloadLength : function() {
			return packetlength - self.GetHeaderLength();
		},
		GetPayload : function() {
			return new Uint8Array(pack, self.GetHeaderLength(), self
				.GetPayloadLength()); //buff, offset, length
		}
	};
	return self;
}

function Rtp(conn) {
	if(!conn){
		return null;
	}

	var m_bitrate = 0;
	var m_last_packet_time = Date.now();
	var m_conn = conn;
	var m_callback = null;
	var m_sequencenumber = 0;
	var m_timestamp = 0;
	var m_src = 0;
	// copy ArrayBuffer
	function copy(dst, dst_offset, src, src_offset, len) {
		new Uint8Array(dst, dst_offset)
			.set(new Uint8Array(src, src_offset, len));
	}
	function string_to_buffer(src) {
		return (new Uint8Array([].map.call(src, function(c) {
			return c.charCodeAt(0)
		}))).buffer;
	}
	
	m_conn.addEventListener('message', function(data){
		if(data instanceof MessageEvent){
			data = data.data;
		}
		if(data instanceof Blob) {
			var fr = new FileReader();
			fr.onload = function(evt) {
				self.packet_handler(evt.target.result);
			};
			fr.readAsArrayBuffer(data);
		}else{
			self.packet_handler(data);
		}
	});
	
	var self = {
		get_info : function() {
			var info = {
				bitrate : m_bitrate,
			};
			return info;
		},
		packet_handler : function(packets) {
			var packet_time = Date.now();
			var sum_packet = 0;
			// console.log("packets : " + packets.length);
			if (m_callback) {
				if (!Array.isArray(packets)) {
					packets = [packets];
				}
				// packets.sort(function(a, b) {
				// return PacketHeader(a).GetSequenceNumber()
				// - PacketHeader(b).GetSequenceNumber();
				// });
				for (var i = 0; i < packets.length; i++) {
					sum_packet += packets[i].byteLength;
					m_callback(PacketHeader(packets[i]));
				}
			}

			{ // bitrate
				var diff_usec = (packet_time - m_last_packet_time) * 1000;
				var tmp = 8.0 * sum_packet / Math.max(diff_usec, 1); // Mbps
				var w = diff_usec / 1000000 / 10;
				m_bitrate = m_bitrate * (1.0 - w) + tmp * w;
			}
			m_last_packet_time = packet_time;
		},
		set_callback : function(callback) {
			m_callback = callback;
		},
		sendpacket : function(pack) {
			if (!m_conn) {
				return;
			}
			m_conn.send(pack);
		},
		// @data : ArrayBuffer
		buildpacket : function(data, pt) {
			if (typeof data == 'string') {
				data = string_to_buffer(data);
			}
			var pack = new ArrayBuffer(12 + data.byteLength);
			copy(pack, 12, data, 0, data.byteLength);
			var view = new DataView(pack);
			view.setUint8(0, 0, false);
			view.setUint8(1, pt & 0x7F, false);
			view.setUint16(2, m_sequencenumber, false);
			view.setUint32(4, m_timestamp, false);
			view.setUint32(8, m_src, false);

			m_sequencenumber++;

			return pack;
		},
	};
	return self;
}