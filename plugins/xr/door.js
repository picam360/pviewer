var create_plugin = (function() {
	var PLUGIN_NAME = "door";
	var m_plugin_host = null;
	var m_options = {};
	var m_pstcore = null;
	var m_pst = 0;
	var m_xrsession = null;
	var m_pos = 0;
	var m_rendering_started = false;
	var m_click_timer = 0;
	var m_click_count = 0;
	var m_query = GetQueryString();
	var m_auto_door_disabled = parseBoolean(m_query["door.auto_door_disabled"]);
	var m_animate_owner = null;

	function cal_current_pitch_yaw_deg() {
		var view_offset_quat = m_plugin_host.get_view_offset()
			|| new THREE.Quaternion();
		var view_quat = m_plugin_host.get_view_quat()
			|| new THREE.Quaternion();
		var quat = view_offset_quat.multiply(view_quat);
		return calPitchYawDegree(quat);
	}

	var m_objs = [
		{
			url : "/amf/door-wall.amf",
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
	var m_imgs = [
		{
			url : "/img/door-frame.png",
			format : "png",
			tex_id : "frame",
			tex : null,
			prepared : false,
		},
	];
	function load_imgs(idx){
		if(idx === undefined){
			idx = 0;
		}else if(idx >= m_imgs.length){
			return;
		}
		var base_url = "plugins/xr";
		if(m_imgs[idx].url){
			var getFile = m_plugin_host.getFile;
			if(m_plugin_host.getFileFromUpstream){
				getFile = m_plugin_host.getFileFromUpstream;
			}
			getFile(base_url + m_imgs[idx].url, (data) => {
				if(Array.isArray(data)){
					data = data[0];
				}
				m_imgs[idx].tex = base64encode_binary(data);
				m_imgs[idx].prepared = true;
				load_imgs(idx + 1);
			});
		}else{
			m_imgs[idx].prepared = true;
			load_imgs(idx + 1);
		}
	}

	function upload_imgs(pstcore, pst){
		var tex_json = {
			nodes : [],
		};
		for(var node of m_imgs){
			tex_json.nodes.push({
				format : node.format,
				tex_id : node.tex_id,
				tex : node.tex,
			});
		}
		var tex_json_str = JSON.stringify(tex_json);
		pstcore.pstcore_set_param(pst, "renderer", "overlay_tex", tex_json_str);
	}
	function get_overlay_def(pos){
		var scale = 1;
		var jobj = {
			"id" : "door",
			"nodes" : [
				{
					"obj_scale" : scale,
					"obj_pos" : pos,
					"obj_quat" : "0,0,0,1",
					"use_light" : false,
					"blend" : false,
					"obj_id" : "wall",
					"direct": true,
				},
				{
					"obj_scale" : scale,
					"obj_pos" : pos,
					"tex_id" : "frame",
					"obj_quat" : "0,0,0,1",
					"obj_id" : "board",
					//"direct": true,
				},
			]
		};
		return JSON.stringify(jobj);
	}

	return function(plugin_host) {
		m_plugin_host = plugin_host;
		var plugin = {
			init_options : function(options) {
				m_options = options;
				load_objs();
				load_imgs();
			},
			pst_started : function(pstcore, pst) {
				m_pstcore = pstcore;
				m_pst = pst;
				upload_objs(m_pstcore, m_pst);
				upload_imgs(m_pstcore, m_pst);
				if(m_options["platform"] && m_options["platform"].toUpperCase() == "OCULUS") {
					m_xrsession = "dummy";
				}
				m_pstcore.pstcore_add_set_param_done_callback(m_pst, (pst_name, param, value)=>{
					if(pst_name == "renderer"){
						if(!m_rendering_started && param == "pts"){
							m_rendering_started = true;
						}
					}else if(pst_name == "door"){
						if(param == "disable"){
							m_pstcore.pstcore_set_param(m_pst, "renderer", "overlay", "");
						}
						if(param == "set_pos"){
							m_pos = value;
							var overlay_def = get_overlay_def(m_pos);
							m_pstcore.pstcore_set_param(m_pst, "renderer", "overlay", overlay_def);
						}
					}
				});
			},
			xrsession_started: function (session) {
				m_xrsession = session;
			},
			event_handler : function(sender, event, state) {
				if(!app.get_xrsession){
					return;
				}
				if(!m_pst || !app.get_xrsession()){
					return;
				}
				try{
					switch(event){
						case "RIGHT_3_AXIS_FORWARD":
							if(state[event]){
							}else{
							}
							break;
						case "RIGHT_3_AXIS_BACKWARD":
							if(state[event]){
							}else{
							}
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