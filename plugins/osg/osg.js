var create_plugin = (function() {
	var m_plugin_host = null;
	var m_is_init = false;
	var m_joydiv = [null, null];
	var m_joy = [null, null];
	var m_enabled = false;
	var m_pst = 0;
	var m_pstcore = null;

	function init() {
		var script = document.createElement("script");
		script.src = "plugins/osg/joystick.js";
		script.onload = () => {
			console.log("loaded");
		};
		document.body.appendChild(script);
		setInterval(handleGamepad, 100);
	}

	var PUSH_THRESHOLD = 0.5;
	var m_gamepad_state = null;
	function handleGamepad() {
		var new_state = {}
		for(var idx=0;idx<2;idx++){
			var joy = m_joy[idx];
			if(!joy){
				continue;
			}
			var axes = [joy.GetX() / 100, -joy.GetY() / 100];
			for(var i=0;i<2;i++){
				var key = (idx * 2 + i) + "_AXIS";
				new_state[key + "_FORWARD"] = axes[i] > PUSH_THRESHOLD;
				new_state[key + "_BACKWARD"] = axes[i] < -PUSH_THRESHOLD;
				new_state[key + "_VALUE"] = axes[i];
				new_state[key + "_PERCENT"] = Math.round(axes[i] * 100);
			}
		}
		if (!m_gamepad_state) {
			m_gamepad_state = new_state;
		}
		for (var key in new_state) {
			if (new_state[key] != m_gamepad_state[key]) {
				if (m_plugin_host) {
					m_plugin_host.send_event("OSG", key, new_state);
				}
			}
		}
		m_gamepad_state = new_state;
	}

	function enable_osg(){
		for(var i=0;i<2;i++){
			m_joydiv[i] = document.createElement("div");
			m_joydiv[i].id = "joydiv_" + i;
			m_joydiv[i].ext = {index : i};
			if(i == 0){
				m_joydiv[i].setAttribute("style", "position:absolute; bottom:25px; left:25px; width:150px; height:150px");
			}else{
				m_joydiv[i].setAttribute("style", "position:absolute; bottom:25px; right:25px; width:150px; height:150px");
			}
			document.body.appendChild(m_joydiv[i]);
			m_joy[i] = new JoyStick("joydiv_" + i, {});
			var onmousedown = (event) => {
				event.currentTarget.last_down = new Date().getTime();
				m_pstcore.pstcore_set_param(m_pst, "mouse", "enabled", "0");
			};
			var onmouseup = (event) => {
				var now = new Date().getTime();
				if(now - event.currentTarget.last_down < 300){//button
					var key = event.currentTarget.ext.index + "_BUTTON_PUSHED";
					m_gamepad_state[key] = true;
					m_plugin_host.send_event("OSG", key, m_gamepad_state);
					m_gamepad_state[key] = false;
				}
				m_pstcore.pstcore_set_param(m_pst, "mouse", "enabled", "1");
			};
			m_joydiv[i].addEventListener("touchstart", onmousedown, false);
			m_joydiv[i].addEventListener("mousedown", onmousedown, false);
			m_joydiv[i].addEventListener("touchend", onmouseup, false);
			m_joydiv[i].addEventListener("mouseup", onmouseup, false);
		}
	}

	function disable_osg(){
		for(var i=0;i<2;i++){
			document.body.removeChild(m_joydiv[i]);
			m_joydiv[i] = null;
		}
	}

	return function(plugin_host) {
		m_plugin_host = plugin_host;
		if (!m_is_init) {
			m_is_init = true;
			init();
		}
		var plugin = {
			pst_started : function(pstcore, pst) {
				m_pstcore = pstcore;
				m_pst = pst;
				m_pstcore.pstcore_add_set_param_done_callback(m_pst, (pst_name, param, value)=>{
					if(pst_name == "osg" && param == "enabled"){
						var enabled = parseBoolean(value);
						if(m_enabled != enabled){
							m_enabled = enabled;
							if(m_enabled){
								enable_osg();
							}else{
								disable_osg();
							}
						}
					}
				});
			},
			on_restore_app_menu : function(callback) {
			},
		};
		return plugin;
	}
})();