var create_plugin = (function() {
	var m_plugin_host = null;
	var m_is_init = false;
	var m_pst = null;
	var m_pstcore = null;

	function init() {
		var slider = document.createElement("input");
		slider.type = "range";
		slider.min = "0";
		slider.max = "100";
		slider.value = "50";
		slider.addEventListener("change", (e) => {
			var pts = slider.value;
			m_pstcore.pstcore_set_param(m_pst, "pvf_loader", "pts", pts.toString());
		});
		slider.setAttribute("style", "position:absolute; bottom:10%; right:50%;");
		document.body.appendChild(slider);

		window.addEventListener('keydown', (e) => {
			switch(e.code){
			case "ArrowLeft":
				if(m_pst){
					m_pstcore.pstcore_set_param(m_pst, "pvf_loader", "skip", "-30");
				}
				break;
			case "ArrowRight":
				if(m_pst){
					m_pstcore.pstcore_set_param(m_pst, "pvf_loader", "skip", "30");
				}
				break;
			}
		});
	}
	return function(plugin_host) {
		m_plugin_host = plugin_host;
		if (!m_is_init) {
			m_is_init = true;
			init();
		}
		var plugin = {
			pst_started : function(pstcore, pst) {
				m_pst = pst;
				m_pstcore = pstcore;
			},
			pst_stopped : function(pstcore, pst) {
				m_pst = null;
				m_pstcore = null;
			},
			on_restore_app_menu : function(callback) {
				console.log("play control");
			},
		};
		return plugin;
	}
})();