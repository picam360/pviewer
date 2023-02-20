var create_plugin = (function() {
	var m_plugin_host = null;
	var m_is_init = false;
	var m_pst = null;
	var m_pstcore = null;
	var m_slider = null;

	var startTimer = function() {
		if(m_slider.timer) {
			clearTimeout(m_slider.timer);
		}
		m_slider.timer = setTimeout(() => {
			if(app.navi && app.navi.getCurrentPage().name == 'main.html'){
				m_slider.style.visibility = 'hidden';
			}
			m_slider.timer = null;
		}, 3000);
	}
	var mousedownFunc = function(ev) {
		if(app.navi && app.navi.getCurrentPage().name == 'main.html'){
			m_slider.style.visibility = 'visible';
		}
		startTimer();
	};
	var mousemoveFunc = function(ev) {
		if (ev.clientY > m_slider.offsetTop) { // title bar
			mousedownFunc(ev);
		}
	};
	var keydownFun = function (ev) {
		switch(ev.code){
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
	};

	function on_pst_started() {

		m_slider = document.createElement("input");
		m_slider.type = "range";
		m_slider.min = "0";
		m_slider.max = "1000";//permil
		m_slider.value = "0";
		m_slider.addEventListener("change", (e) => {
			m_pstcore.pstcore_get_param(m_pst, "pvf_loader", "src_st_pts", (value) => {
				var st_pts = parseFloat(value);
				m_pstcore.pstcore_get_param(m_pst, "pvf_loader", "src_et_pts", (value) => {
					var et_pts = parseFloat(value);
					var pts = (et_pts - st_pts) * m_slider.value / 1000;
					m_pstcore.pstcore_set_param(m_pst, "pvf_loader", "pts", pts.toString());
				});
			});
		});
		m_slider.update_interval = setInterval(() => {
			m_pstcore.pstcore_get_param(m_pst, "pvf_loader", "src_st_pts", (value) => {
				var st_pts = parseFloat(value);
				m_pstcore.pstcore_get_param(m_pst, "pvf_loader", "src_et_pts", (value) => {
					var et_pts = parseFloat(value);
					m_pstcore.pstcore_get_param(m_pst, "pvf_loader", "cur_pts", (value) => {
						var cur_pts = parseFloat(value);
						if(!isNaN(st_pts) && !isNaN(et_pts) && !isNaN(cur_pts)){
							m_slider.value = (cur_pts - st_pts) / (et_pts - st_pts) * 1000;
						}
					});
				});
			});
		}, 1000);
		m_slider.setAttribute("style", "position:absolute; bottom:75px; right:10%; width:80%;");
		document.body.appendChild(m_slider);

		startTimer();
		document.addEventListener('keydown', keydownFun);
		document.addEventListener("touchstart", mousedownFunc);
		document.addEventListener("mousedown", mousedownFunc);
		document.addEventListener("mousemove", mousemoveFunc);
	}
	function on_pst_stopped() {
		clearInterval(m_slider.update_interval);
		document.body.removechild(m_slider);

		document.removeEventListener("keydown", mousedownFunc);
		document.removeEventListener("touchstart", mousedownFunc);
		document.removeEventListener("mousedown", mousedownFunc);
		document.removeEventListener("mousemove", mousemoveFunc);
	}
	return function(plugin_host) {
		m_plugin_host = plugin_host;
		if (!m_is_init) {
			m_is_init = true;
			//init();
		}
		var plugin = {
			pst_started : function(pstcore, pst) {
				m_pst = pst;
				m_pstcore = pstcore;
				on_pst_started();
			},
			pst_stopped : function(pstcore, pst) {
				m_pst = null;
				m_pstcore = null;
				on_pst_stopped();
			},
			on_restore_app_menu : function(callback) {
				console.log("play control");
			},
		};
		return plugin;
	}
})();