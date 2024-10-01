var create_plugin = (function() {
	var m_plugin_host = null;
	var m_is_init = false;

	var SERVER_DOMAIN = UPSTREAM_DOMAIN;
	var CAPTURE_DOMAIN = SERVER_DOMAIN + UPSTREAM_DOMAIN;
	var VEHICLE_DOMAIN = SERVER_DOMAIN + "wheel.";

	function init() {
	}
	return function(plugin_host) {
		m_plugin_host = plugin_host;
		if (!m_is_init) {
			m_is_init = true;
			init();
		}
		var menu_visible = false;
		var stereo_enabled = false;
		var plugin = {
			event_handler : (sender, key, new_state) => {
				if(!new_state){//fail safe
					return;
				}
				if(!new_state[key]){//only push
					return;
				}
				var cmd = "";
				switch(key){
					case "10_BUTTON_PUSHED":
						break;
					case "11_BUTTON_PUSHED":
						break;
					case "3_AXIS_PERCENT":
						if(new_state[key] < -50){
							cmd = "MOVE_FORWARD";
						}else if(new_state[key] > 50){
							cmd = "MOVE_BACKWARD";
						}else{
							cmd = "STOP";
						}
						break;
					case "2_AXIS_PERCENT":
						if(new_state[key] < -50){
							cmd = "TURN_LEFT";
						}else if(new_state[key] > 50){
							cmd = "TURN_RIGHT";
						}else{
							cmd = "STOP";
						}
						break;
					//quest touch : 3_BUTTON stick, 4_BUTTON A, 5_BUTTON B
					case "LEFT_3_BUTTON_PUSHED":
						if(new_state[key]){
						}
						break;
					case "RIGHT_3_BUTTON_PUSHED":
						if(new_state[key]){
						}
						break;
					case "RIGHT_3_AXIS_PERCENT":
						if(new_state[key] < -50){
							cmd = "MOVE_FORWARD";
						}else if(new_state[key] > 50){
							cmd = "MOVE_BACKWARD";
						}else{
							cmd = "STOP";
						}
						break;
					case "RIGHT_2_AXIS_PERCENT":
						if(new_state[key] < -50){
							cmd = "TURN_LEFT";
						}else if(new_state[key] > 50){
							cmd = "TURN_RIGHT";
						}else{
							cmd = "STOP";
						}
						break;
				}
				switch (cmd) {
				case "MOVE_FORWARD":
					var cmd = VEHICLE_DOMAIN + "move_forward";
					m_plugin_host.send_command(cmd);
					break;
				case "MOVE_BACKWARD":
					var cmd = VEHICLE_DOMAIN + "move_backward";
					m_plugin_host.send_command(cmd);
					break;
				case "TURN_LEFT":
					var cmd = VEHICLE_DOMAIN + "turn_left";
					m_plugin_host.send_command(cmd);
					break;
				case "TURN_RIGHT":
					var cmd = VEHICLE_DOMAIN + "turn_right";
					m_plugin_host.send_command(cmd);
					break;
				case "STOP":
					var cmd = VEHICLE_DOMAIN + "stop";
					m_plugin_host.send_command(cmd);
					break;
				}
			},
		};
		return plugin;
	}
})();