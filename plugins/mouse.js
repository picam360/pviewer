var create_plugin = (function() {
	console.log("mouse.js");
	
	var m_plugin_host = null;
	var m_is_init = false;
	var m_enabled = false;
	var abs_pitch = 0;
	var abs_yaw = 0;

	function GetQueryString() {
		var result = {};
		if (1 < window.location.search.length) {
			var query = window.location.search.substring(1);
			var parameters = query.split('&');

			for (var i = 0; i < parameters.length; i++) {
				var element = parameters[i].split('=');

				var paramName = decodeURIComponent(element[0]);
				var paramValue = decodeURIComponent(element[1]);

				result[paramName] = paramValue;
			}
		}
		return result;
	}

	function quat_to_yxy(q)
	{
		//console.log("quat_to_yxy",q);
		if(q.x == 0 && q.z == 0){
			var res = [];
			res[0] = 2*Math.atan(q.y/q.w);
			res[1] = 0;
			res[2] = 0;
			return res;
		}else{
			function twoaxisrot(r11, r12, r21, r31, r32) {
				//console.log("twoaxisrot",r11, r12, r21, r31, r32);
				var res = [];
				res[0] = Math.atan2(r11, r12);
				res[1] = Math.acos(Math.max(-1.0, Math.min(r21, 1.0)));
				res[2] = Math.atan2(r31, r32);
				return res;
			}
			var res = twoaxisrot(2 * (q.x * q.y - q.w * q.z), 2 * (q.y * q.z + q.w * q.x),
					q.w * q.w - q.x * q.x + q.y * q.y - q.z * q.z,
					2 * (q.x * q.y + q.w * q.z), -2 * (q.y * q.z - q.w * q.x), res);
			return res;
		}
	}

	var query = GetQueryString();
	if (query['view-offset']) {
		var split = query['view-offset'].split(',');
		abs_pitch = parseFloat(split[0]);
		abs_yaw = parseFloat(split[1]);
	}

	function init() {
		var last_mouseup_ts = 0;
		var last_mousemove_d = 0;
		var down = false;
		var wsx = 0, wsy = 0;
		var sx = 0, sy = 0;
		var ex = 0, ey = 0;
		var fov = 120;
		var mousedownFunc = function(ev) {
			if (ev.type == "touchstart") {
				ev.clientX = ev.targetTouches[0].clientX;
				ev.clientY = ev.targetTouches[0].pageY;
			}
			down = true;
			sx = ev.clientX;
			sy = ev.clientY;
			ex = ev.clientX;
			ey = ev.clientY;
			wsx = window.window.screenX;
			wsy = window.window.screenY;
		};
		var mousemoveFunc = function(ev) {
			if (ev.type == "touchmove") {
				ev.clientX = ev.targetTouches[0].pageX;
				ev.clientY = ev.targetTouches[0].pageY;
				ev.button = 0;
			}
			if (!down || ev.button != 0) {
				return;
			}
			
			if (sy < 50) { // title bar
				return;
			}
			
			var dx = -(ev.clientX - ex);
			var dy = -(ev.clientY - ey);
			ex -= dx;
			ey -= dy;

			if (m_plugin_host) {
				fov = m_plugin_host.get_fov();
			}

			var roll_diff = dx * fov / 300;
			var pitch_diff = -dy * fov / 300;

			var view_offset_quat = m_plugin_host.get_view_offset()
				|| new THREE.Quaternion();
			var view_quat = m_plugin_host.get_view_quat()
				|| new THREE.Quaternion();
			if (query['view-offset-relative'] == "true") {
				var quat = view_offset_quat.clone().multiply(view_quat);
				var view_offset_diff_quat = new THREE.Quaternion()
					.setFromEuler(new THREE.Euler(THREE.Math
						.degToRad(pitch_diff), THREE.Math.degToRad(0), THREE.Math
						.degToRad(roll_diff), "YXZ"));
				var next_quat = quat.clone().multiply(view_offset_diff_quat);
				view_offset_quat = next_quat.clone().multiply(view_quat.clone()
					.conjugate());
				// {
				// var diff_quat = quat.clone().conjugate().multiply(next_quat
				// .clone());
				// var diff_euler = new
				// THREE.Euler().setFromQuaternion(diff_quat);
				// console
				// .log("v x:" + pitch_diff + ",y:" + 0 + ",z:" + roll_diff);
				// console.log("p x:" + THREE.Math.radToDeg(diff_euler.x) +
				// ",y:"
				// + THREE.Math.radToDeg(diff_euler.y) + ",z:"
				// + THREE.Math.radToDeg(diff_euler.z));
				// }
			} else {
				var quat = view_offset_quat.clone().multiply(view_quat.clone());
				var pos = new THREE.Vector3(0, 1, 0).applyQuaternion(quat);
				var r = Math.sqrt(pos.x*pos.x + pos.z*pos.z);
				var pitch_deg = Math.atan2(r, pos.y) * 180 / Math.PI;
				var yaw_deg = Math.atan2(pos.x, pos.z) * 180 / Math.PI;
				if(pitch_deg < 45){
					var pos = new THREE.Vector3(0, 0, 1).applyQuaternion(quat);
					yaw_deg = Math.atan2(pos.x, pos.z) * 180 / Math.PI;
				}else if(135 < pitch_deg){
					var pos = new THREE.Vector3(0, 0, -1).applyQuaternion(quat);
					yaw_deg = Math.atan2(pos.x, pos.z) * 180 / Math.PI;
				}

				pitch_deg += pitch_diff;
				yaw_deg -= roll_diff;

				pitch_deg = Math.max(0, Math.min(pitch_deg, 180))

				//console.log("mouse.js : yaw,pitch",yaw_deg,roll_diff,":",pitch_deg,pitch_diff);

				var euler = new THREE.Euler(
					THREE.Math.degToRad(pitch_deg),
					THREE.Math.degToRad(yaw_deg),
					0,
					"YXZ");
				var next_quat = new THREE.Quaternion().setFromEuler(euler);
				view_offset_quat = next_quat.clone().multiply(view_quat.clone().conjugate());
			}
			if (m_plugin_host && m_enabled) {
				m_plugin_host.set_view_offset(view_offset_quat);
			}

			autoscroll = false;
		}
		var mouseupFunc = function() {
			var dx = (ex - sx);
			var dy = (ey - sy);
			var d = Math.sqrt(dx*dx + dy*dy);

			down = false;
			var now = new Date().getTime();
			if(now - last_mouseup_ts < 500 && d + last_mousemove_d < 10){
				if (m_plugin_host && m_enabled) {
					m_plugin_host.send_event("mouse", "double_click");

					app.set_param("psf_loader", "forward", "1");
				}
			}
			last_mousemove_d = d;
			last_mouseup_ts = now;
		};
		var mousewheelFunc = function(e) {
			fov += e.wheelDelta < 0 ? 5 : -5;
			if (fov > 150) {
				fov = 150;
			} else if (fov < 30) {
				fov = 30;
			}
			if (m_plugin_host && m_enabled) {
				m_plugin_host.set_fov(fov);
			}

		};
		document.addEventListener("touchstart", mousedownFunc);
		document.addEventListener("touchmove", mousemoveFunc);
		document.addEventListener("touchend", mouseupFunc);
		document.addEventListener("mousedown", mousedownFunc);
		document.addEventListener("mousemove", mousemoveFunc);
		document.addEventListener("mouseup", mouseupFunc);
		document.addEventListener("mousewheel", mousewheelFunc);

		var _fov = 70;
		function gestureStartHandler(e) {
			_fov = fov;
		}

		function gestureChangeHandler(e) {
			fov = _fov / e.scale;
			if (fov > 150) {
				fov = 150;
			} else if (fov < 30) {
				fov = 30;
			}
			if (m_plugin_host && m_enabled) {
				m_plugin_host.set_fov(fov);
			}
		}

		function gestureEndHandler(e) {
		}

		if ("ongesturestart" in window) {
			document
				.addEventListener("gesturestart", gestureStartHandler, false);
			document
				.addEventListener("gesturechange", gestureChangeHandler, false);
			document.addEventListener("gestureend", gestureEndHandler, false);
		} else {
            var mc = new Hammer.Manager(document);
            var pinch = new Hammer.Pinch();
            mc.add([pinch]);
            mc.on("pinchstart", gestureStartHandler);
            mc.on("pinchmove", gestureChangeHandler);
            mc.on("pinchend", gestureEndHandler);
		}
	}
	return function(plugin_host) {
		m_plugin_host = plugin_host;
		if (!m_is_init) {
			m_is_init = true;
			init();
		}
		var plugin = {
			init_options : function(options){
				if(options.view_offset){
					abs_pitch = options.view_offset[0];
					abs_yaw = options.view_offset[1];
				}
			},
			pst_started : function(pstcore, pst) {
				m_enabled = true;
				pstcore.pstcore_add_set_param_done_callback(pst, (pst_name, param, value)=>{
					if(pst_name == "mouse"){
						if(param == "enabled"){
							m_enabled = parseBoolean(value);
						}
					}
				});
			},
		};
		return plugin;
	}
})();