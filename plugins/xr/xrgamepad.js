var create_plugin = (function() {
	var m_plugin_host = null;
	var m_is_init = false;

	var PUSH_THRESHOLD = 0.5;
	var m_gamepad_state = null;
	function handleGamepad() {
		if(!app.get_xrsession){
			return;
		}
		var gamepads = {};
		if (app.get_xrsession() && app.get_xrsession().inputSources) {
			for(var source of app.get_xrsession().inputSources){
				gamepads[source.handedness.toUpperCase()] = source.gamepad;
			}
		}
		if(Object.keys(gamepads).length == 0){
			return;
		}

		var new_state = {}
		for(var tag in gamepads){
			var gamepad = gamepads[tag];
			for (var i in gamepad.buttons) {
				var key = i + "_BUTTON";
				key = tag + "_" + key;
				new_state[key + "_PUSHED"] = gamepad.buttons[i].value > PUSH_THRESHOLD;
				new_state[key + "_VALUE"] = gamepad.buttons[i].value;
				new_state[key + "_PERCENT"] = Math.round(gamepad.buttons[i].value * 100);
			}
			for (var i in gamepad.axes) {
				var key = i + "_AXIS";
				key = tag + "_" + key;
				new_state[key + "_FORWARD"] = gamepad.axes[i] > PUSH_THRESHOLD;
				new_state[key + "_BACKWARD"] = gamepad.axes[i] < -PUSH_THRESHOLD;
				new_state[key + "_VALUE"] = gamepad.axes[i];
				new_state[key + "_PERCENT"] = Math.round(gamepad.axes[i] * 100);
			}
		}
		if (!m_gamepad_state) {
			m_gamepad_state = new_state;
		}
		for (var key in new_state) {
			if (new_state[key] != m_gamepad_state[key]) {
				if (m_plugin_host) {
					m_plugin_host.send_event("XRGAMEPAD", key, new_state);
				}
			}
		}
		m_gamepad_state = new_state;
	}

	function init() {
		setInterval(handleGamepad, 100);
	}

	return function(plugin_host) {
		m_plugin_host = plugin_host;
		if (!m_is_init) {
			m_is_init = true;
			init();
		}
		var plugin = {};
		return plugin;
	}
})();