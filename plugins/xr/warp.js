var create_plugin = (function() {
	var PLUGIN_NAME = "warp";
	var m_plugin_host = null;
	var m_options = {};
	var m_pstcore = null;
	var m_pst = 0;
	var m_xrsession = null;
	var m_interval = 0;
	var m_pos = 0;
	var m_warp_tilt = 0;
	var m_rendering_started = false;
	var m_force = false;
	var m_click_timer = 0;
	var m_click_count = 0;
	var m_passthrough_enabled = false;
	var m_query = GetQueryString();
	var m_auto_warp_disabled = parseBoolean(m_query["warp.auto_warp_disabled"]);

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
	function get_overlay_def(pos){
		var scale = 0.1;
		var jobj = {
			"id" : "warp",
			"nodes" : [
				{
					"obj_scale" : scale,
					"obj_pos" : `0,${pos*scale},0`,
					"obj_quat" : "0,0,0,1",
					"use_light" : false,
					"blend" : false,
					"obj_id" : "wall",
				},
				{
					"obj_scale" : scale,
					"obj_pos" : `0,${pos*scale},0`,
					"obj_quat" : "0,0,0,1",
					"use_light" : false,
					"blend" : false,
					"obj_id" : "ring",
				},
			]
		};
		return JSON.stringify(jobj);
	}

	function set_passthrough_enabled(bln){
		m_passthrough_enabled = bln;

		var overlay_def = get_overlay_def(bln ? -20 : m_pos);
		var set_param = (count) => {
            m_pstcore.pstcore_set_param(m_pst, "renderer", "overlay", overlay_def);
            count++;
            if(count < 5){
                setTimeout(() => set_param(count), 100);
            }
        }
        set_param(0);

		console.log("warp.js", "set_passthrough_enabled", bln);
	}

	function stop_animate(){
		if(m_interval){
			clearInterval(m_interval);
			m_interval = 0;
		}
	}
	function start_animate(step, start, end){
		stop_animate();
		
		m_pos = start;

		if(m_rendering_started && m_xrsession){//xr only
			let min, max;
			if(start < end){
				min = start;
				max = end;
				step = Math.abs(step);
			}else{
				min = end;
				max = start;
				step = -Math.abs(step);
			}

			m_interval = setInterval(() => {
				if(!m_passthrough_enabled){
					var overlay_def = get_overlay_def(m_pos);
					m_pstcore.pstcore_set_param(m_pst, "renderer", "overlay", overlay_def);
				}

				m_pos += step;
				m_warp_tilt = Math.atan2(1, m_pos * 0.1) * 180 / Math.PI;
				m_pstcore.pstcore_set_param(m_pst, "warp", "tilt", m_warp_tilt.toString());
				if(m_pos > max || m_pos < min){//considering interrupt
					m_pos = Math.max(min, Math.min(m_pos, max));
					stop_animate();
				}
			}, 1000/60);
		}
	}

	function auto_start_warp(){
		if(m_rendering_started && m_xrsession){
			setTimeout(() => {
				if(m_auto_warp_disabled){
					return;
				}
				start_animate(0.1, -20, 20);
			}, 500);
		}
	}

	return function(plugin_host) {
		m_plugin_host = plugin_host;
		var plugin = {
			init_options : function(options) {
				m_options = options;
				load_objs();
			},
			pst_started : function(pstcore, pst) {
				m_pstcore = pstcore;
				m_pst = pst;
				upload_objs(m_pstcore, m_pst);
				if(m_options["platform"] && m_options["platform"].toUpperCase() == "OCULUS") {
					m_xrsession = "dummy";
				}
				m_pstcore.pstcore_add_set_param_done_callback(m_pst, (pst_name, param, value)=>{
					if(pst_name == "renderer"){
						if(!m_rendering_started && param == "pts"){
							m_rendering_started = true;

							auto_start_warp();
						}
					}else if(pst_name == "warp"){
						if(param == "start_animate"){
							const elms = value.split(",");
							const spd = elms[0] ? parseFloat(elms[0]) : 0.1;
							const start = elms[1] ? parseFloat(elms[1]) : -20
							const end = elms[2] ? parseFloat(elms[2]) : 20;
							start_animate(spd, start, end);
						}
						if(param == "stop_animate"){
							stop_animate();
						}
						if(param == "passthrough_enabled"){
							set_passthrough_enabled(value == "true" || value == "1");
						}
						if(param == "auto_warp_disabled"){
							m_auto_warp_disabled = parseBoolean(value);
						}
					}
				});
			},
			xrsession_started: function (session) {
				m_xrsession = session;

            	m_pstcore.pstcore_set_param(m_pst, "renderer", "overlay", get_overlay_def(-20));//default position
				auto_start_warp();
			},
			event_handler : function(sender, event, state) {
				if(!app.get_xrsession){
					return;
				}
				if(!m_pst || !app.get_xrsession()){
					return;
				}
				function countup(){
					m_click_count++;
					clearTimeout(m_click_timer);
					m_click_timer = setTimeout(() => {
						if(m_click_count >= 3){
							m_force = !m_force;
						}
						m_click_count = 0;
					}, 500);
				}
				try{
					switch(event){
						case "RIGHT_3_AXIS_FORWARD":
							if(state[event]){
								var view_tilt = cal_current_pitch_yaw_deg()[0];
								if(m_force || view_tilt < m_warp_tilt){
									countup();

									start_animate(0.1, -20, 20);
								}
							}else{
								stop_animate();
							}
							break;
						case "RIGHT_3_AXIS_BACKWARD":
							if(state[event]){
								var view_tilt = cal_current_pitch_yaw_deg()[0];
								if(m_force || view_tilt < m_warp_tilt){
									countup();

									start_animate(-0.1, -20, 20);
								}
							}else{
								stop_animate();
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