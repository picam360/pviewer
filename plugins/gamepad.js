var create_plugin = (function() {
	var m_plugin_host = null;
	var m_is_init = false;

	var PUSH_THRESHOLD = 0.5;
	var m_gamepad_id = "";//need to call navigator.getGamepads() dynamically to get live values
	var m_gamepad_state = null;
	var m_vibration_requested = null;

	function get_last_gamepad_id(){
		if (navigator.getGamepads) {
			var gamepads = navigator.getGamepads();
			for (var i=gamepads.length-1;i>=0;i--) {
				if (gamepads[i]) {
					return gamepads[i].id;
				}
			}
		}
		return "";
	}

	window.addEventListener('gamepadconnected', function (e) {
		console.log("gamepadconnected : ", e.gamepad.id);
		m_gamepad_id = e.gamepad.id;
		console.log("active gamepad id : ", m_gamepad_id);
	}, false);
	window.addEventListener('gamepaddisconnected', function (e) {
		console.log("gamepaddisconnected : ", e.gamepad.id);
		if(e.gamepad.id == m_gamepad_id){
			m_gamepad_id = get_last_gamepad_id();
			console.log("active gamepad id : ", m_gamepad_id);
		}
	}, false);

	function handleGamepad(callback) {
		if(!m_gamepad_id){
			var id = get_last_gamepad_id();
			if(id){
				m_gamepad_id = id;
				console.log("active gamepad id : ", m_gamepad_id);
			}
		}
		var gamepads = [];
		if (navigator.getGamepads) {
			gamepads = navigator.getGamepads();
		}
		var gamepad = null;
		for (var i in gamepads) {
			if (gamepads[i] && gamepads[i].id == m_gamepad_id) {
				gamepad = gamepads[i];
				break;
			}
		}
		if (!gamepad) {
			return;
		}

		var new_state = {}
		for (var i in gamepad.buttons) {
			var key = i + "_BUTTON";
			new_state[key + "_PUSHED"] = gamepad.buttons[i].value > PUSH_THRESHOLD;
			new_state[key + "_VALUE"] = gamepad.buttons[i].value;
			new_state[key + "_PERCENT"] = Math.round(gamepad.buttons[i].value * 100);
		}
		for (var i in gamepad.axes) {
			var key = i + "_AXIS";
			new_state[key + "_FORWARD"] = gamepad.axes[i] > PUSH_THRESHOLD;
			new_state[key + "_BACKWARD"] = gamepad.axes[i] < -PUSH_THRESHOLD;
			new_state[key + "_VALUE"] = gamepad.axes[i];
			new_state[key + "_PERCENT"] = Math.round(gamepad.axes[i] * 100);
		}
		if (!m_gamepad_state) {
			m_gamepad_state = new_state;
		}
		for (var key in new_state) {
			if (new_state[key] != m_gamepad_state[key]) {
				if (m_plugin_host) {
					m_plugin_host.send_event("GAMEPAD", key, new_state);
				}
			}
		}
		m_gamepad_state = new_state;


		if(m_vibration_requested){
			if (gamepad.vibrationActuator) {
				gamepad.vibrationActuator.playEffect("dual-rumble", {
					startDelay: m_vibration_requested.startDelay || 0,
					duration: m_vibration_requested.duration || 1000,         // ミリ秒
					weakMagnitude: m_vibration_requested.weakMagnitude || 0.5,     // 低周波振動（左）
					strongMagnitude: m_vibration_requested.strongMagnitude || 1.0    // 高周波振動（右）
				});
			} else {
				console.log("振動対応していないか、見つかりません");
			}
			m_vibration_requested = null;
		}
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
		var plugin = {
			name: "gamepad",
			vibration: (options) => {
				m_vibration_requested = options || {};
			}
		};
		return plugin;
	}
	return self;
})();