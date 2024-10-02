var create_plugin = (function() {
	var m_plugin_host = null;
	var m_is_init = false;
	var m_gamepad_state = {};

	var SERVER_DOMAIN = UPSTREAM_DOMAIN;
	var CAPTURE_DOMAIN = SERVER_DOMAIN + UPSTREAM_DOMAIN;
	var VEHICLE_DOMAIN = SERVER_DOMAIN + "wheel.";

	function init() {
		setInterval(() => {
			var cmd = "";
			let foward_gain = 0.0;
			{
				let gamepad = m_gamepad_state["3_AXIS_PERCENT"] || 0;
				let quest = m_gamepad_state["3_AXIS_PERCENT"] || 0;
				if(Math.abs(gamepad) > Math.abs(quest)){
					foward_gain = gamepad;
				}else{
					foward_gain = quest;
				}
			}
			let turn_gain = 0.0;
			{
				let gamepad = m_gamepad_state["2_AXIS_PERCENT"] || 0;
				let quest = m_gamepad_state["2_AXIS_PERCENT"] || 0;
				if(Math.abs(gamepad) > Math.abs(quest)){
					turn_gain = gamepad;
				}else{
					turn_gain = quest;
				}
			}
			if(Math.abs(foward_gain) > Math.abs(turn_gain)){
				if(foward_gain < -50){
					cmd = "move_forward";
				}else if(foward_gain > 50){
					cmd = "move_backward";
				}else{
					cmd = "stop";
				}
			}else{
				if(turn_gain < -50){
					cmd = "turn_left";
				}else if(turn_gain > 50){
					cmd = "turn_right";
				}else{
					cmd = "stop";
				}
			}
			m_plugin_host.send_command(cmd);
		}, 100);
	}
	return function(plugin_host) {
		m_plugin_host = plugin_host;
		if (!m_is_init) {
			m_is_init = true;
			init();
		}
		var plugin = {
			event_handler : (sender, key, new_state) => {
				if(!new_state){//fail safe
					return;
				}
				if(!new_state[key]){//only push
					return;
				}
				m_gamepad_state = new_state;
			},
		};
		return plugin;
	}
})();