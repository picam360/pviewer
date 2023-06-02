var create_plugin = (function() {
	var m_plugin_host = null;
	var m_is_init = false;

	var push_threshold = 0.5;
	var active_gamepad = "";
	var gamepads = [];
	var gamepad_state = null;
	function handleGamepad() {
		// Iterate over all the gamepads and show their values.
		if (app.get_xrsession() && app.get_xrsession().inputSources) {
			gamepads = [];
			for(var source of app.get_xrsession().inputSources){
				gamepads.push(source.gamepad);
			}
		}
		if(gamepads.length == 0){
			return;
		}
		var gamepad = gamepads[0];

		var new_state = {}
		for ( var i = 0 in gamepad.buttons) {
			var key = i + "_BUTTON";
			new_state[key] = gamepad.buttons[i].value > push_threshold;
		}
		for ( var i = 0 in gamepad.axes) {
			var key = i + "_AXIS";
			new_state[key + "_FORWARD"] = gamepad.axes[i] > push_threshold;
			new_state[key + "_BACKWARD"] = gamepad.axes[i] < -push_threshold;
		}
		if (gamepad_state) {
			var eventList = {};
			for ( var key in new_state) {
				if (new_state[key] != gamepad_state[key]) {
					var event = key + "_" + (new_state[key] ? "DOWN" : "UP");
					if (m_plugin_host) {
						m_plugin_host.send_event("XRGAMEPAD", event);
					}
				}
			}
		}
		gamepad_state = new_state;
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
	return self;
})();