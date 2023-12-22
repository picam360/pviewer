var create_plugin = (function() {
	var PLUGIN_NAME = "teleport";
	var m_plugin_host = null;
	var m_pstcore = null;
	var m_pst = 0;
	var m_xrsession = null;
	var m_animate = false;
	var m_interval = 0;
	var m_pos = 0;

	var m_objs = [
		{
			url : "/amf/ring.amf",
			obj_id : "ring",
			obj : null,
			default_color : "1.0,1.0,0.0,1.0",
			prepared : false,
		},
		{
			url : "/amf/wall.amf",
			obj_id : "wall",
			obj : null,
			default_color : "0.0,0.0,0.0,0.001",
			prepared : false,
		},
	];

	function base64encode_binary(data){
		return btoa([...data].map(n => String.fromCharCode(n)).join(""));
	}

	function load_objs(idx){
		if(idx === undefined){
			idx = 0;
		}else if(idx >= m_objs.length){
			return;
		}
		var base_url = "plugins/xr";
		if(m_objs[idx].url){
			var getFile = m_plugin_host.getFile;
			if(m_plugin_host.getFileFromUpstream){
				getFile = m_plugin_host.getFileFromUpstream;
			}
			getFile(base_url + m_objs[idx].url, (data) => {
				if(Array.isArray(data)){
					data = data[0];
				}
				m_objs[idx].obj = base64encode_binary(data);
				m_objs[idx].prepared = true;
				load_objs(idx + 1);
			});
		}else{
			m_objs[idx].prepared = true;
			load_objs(idx + 1);
		}
	}

	function upload_objs(pstcore, pst){
		var json = {
			nodes : [],
		};
		for(var node of m_objs){
			json.nodes.push({
				obj : node.obj,
				default_color : node.default_color,
				smooth_shading : false,
				obj_id : node.obj_id,
			});
		}
		var json_str = JSON.stringify(json);
		pstcore.pstcore_set_param(pst, "renderer", "overlay_obj", json_str);
	}

	function start_animate(step, min, max){
		var scale = 0.1;
		m_interval = setInterval(() => {
			var jobj = {
				"id" : "teleport",
				"nodes" : [
					{
						"obj_scale" : scale,
						"obj_pos" : `0,${m_pos*scale},0`,
						"obj_quat" : "0,0,0,1",
						"use_light" : false,
						"blend" : false,
						"obj_id" : "wall",
					},
					{
						"obj_scale" : scale,
						"obj_pos" : `0,${m_pos*scale},0`,
						"obj_quat" : "0,0,0,1",
						"use_light" : false,
						"blend" : false,
						"obj_id" : "ring",
					},
				]
			};
			m_pstcore.pstcore_set_param(m_pst, "renderer", "overlay", JSON.stringify(jobj));

			m_pos += step;
			if(m_pos > max || m_pos < min){
				m_pos = Math.max(min, Math.min(m_pos, max));
				clearInterval(m_interval);
			}
		}, 1000/60);
	}

	return function(plugin_host) {
		m_plugin_host = plugin_host;
		var plugin = {
			init_options : function(options) {
				if(navigator.xr){
					load_objs();
				}
			},
			pst_started : function(pstcore, pst) {
				m_pstcore = pstcore;
				m_pst = pst;
			},
			xrsession_started: function (session) {
				m_xrsession = session;

				upload_objs(m_pstcore, m_pst);
				m_animate = true;
				m_pos = -20;
				start_animate(0.1, -20, 20);
			},
			event_handler : function(sender, event) {
				if(!app.get_xrsession){
					return;
				}
				if(!m_pst || !app.get_xrsession()){
					return;
				}
				try{
					var step = 1;
					if(event.startsWith("RIGHT_")){
						event = event.substr(event.indexOf("_") + 1);
					}else{
						return;
					}
					switch(event){
						case "2_AXIS_FORWARD_DOWN":
							break;
						case "2_AXIS_BACKWARD_DOWN":
							break;
						case "3_AXIS_FORWARD_UP":
						case "3_AXIS_BACKWARD_UP":
							clearInterval(m_interval);
							break;
						case "3_AXIS_FORWARD_DOWN":
							clearInterval(m_interval);
							start_animate(0.1, -20, 20);
							break;
						case "3_AXIS_BACKWARD_DOWN":
							clearInterval(m_interval);
							start_animate(-0.1, -20, 20);
							break;
						case "4_BUTTON_DOWN":
							break;
						case "5_BUTTON_DOWN":
							break;
						case "3_BUTTON_DOWN":
							break;
					}
				}catch(err){
					console.log(err);
				}
			},
		};
		return plugin;
	}
})();