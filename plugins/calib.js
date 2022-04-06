var create_plugin = (function() {
	var m_plugin_host = null;
	var m_is_init = false;
	var m_pstcore = null;
	var m_pst = null;

	function init() {
		var map = {
			"A" : "add",
			"R" : "remove",
			"C" : "center",
			"D" : "distortion",
			"E" : "execute",
			"G" : "chromatic_aberration",
			"0" : "cam0",
			"1" : "cam1",
		};
		window.onkeydown = function(e) {
			var key = String.fromCharCode(e.keyCode);
			if (map[key]) {
				if (m_pst) {
					m_pstcore.pstcore_set_param(m_pst, "calibrator", "cmd", map[key]);
				}
				// console.log("event : " + map[key]);
			} else {
				console.log("unknown : " + key);
			}
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
				m_pstcore = app.get_pstcore();
				m_pst = pst;
			},
			pst_stopped : function(pstcore, pst) {
				m_pst = null;
			},
		};
		return plugin;
	}
})();