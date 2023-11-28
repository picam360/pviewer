var create_plugin = (function() {
	var PLUGIN_NAME = "xrmode";
	var m_plugin_host = null;
	var m_pstcore = null;
	var m_pst = 0;
	var m_xrsession;
	var m_xrtype = "";
    var m_query = GetQueryString();
	var m_options = {};
	var m_permanent_options = {};

	var m_canvas;
	var m_framebuffer_bk;
	var m_framebuffer;
	var m_refSpace;
	var m_glctx;
	var m_xr_yaw_offset = 0;

	function vr_draw(){
		function redraw(t, xrFrame) {
			app.resetContextCurrent();
			var pose = xrFrame.getViewerPose(m_refSpace);
			var layer = m_xrsession.renderState.baseLayer;
			if(pose){
				{//update canvas size
					var w = layer.framebufferWidth;
					var h = layer.framebufferHeight;
					if(m_query["xr-width"]){
						w = parseInt(m_query["xr-width"]);
					}
					if(m_query["xr-height"]){
						h = parseInt(m_query["xr-height"]);
					}
					// w = 0;
					// for (let view of pose.views) {
					// 	let viewport = layer.getViewport(view);
					// 	w += viewport.width;
					// 	h = viewport.height;
					// }
					var changed = false;
					if(w != m_canvas.width){
						m_canvas.width = w;
					}
					if(h != m_canvas.height){
						m_canvas.height = h;
					}
				}
				if(!m_framebuffer && layer.framebuffer){
					m_framebuffer = layer.framebuffer;
					m_framebuffer.name = m_pstcore.GL.framebuffers.length;
					m_pstcore.GL.framebuffers.push(m_framebuffer);
					m_glctx.bindFramebuffer(m_glctx.FRAMEBUFFER, m_framebuffer);

					var xrsettings = JSON.parse(localStorage.getItem("xrsettings")) || {};
					if(xrsettings.fov !== undefined && 0 < xrsettings.fov && xrsettings.fov < 180){
						m_options["fov_stereo"] = xrsettings.fov;
					}
					if(xrsettings.screen_offset_x !== undefined && -1 < xrsettings.screen_offset_x && xrsettings.screen_offset_x < 1){
						m_options["screen_offset"][0][0] = xrsettings.screen_offset_x;
						m_options["screen_offset"][1][0] = -xrsettings.screen_offset_x;
					}else{
						m_options["screen_offset"][0][0] = -pose.views[0].projectionMatrix[8];
						m_options["screen_offset"][1][0] = -pose.views[1].projectionMatrix[8];
					}
					if(xrsettings.screen_offset_y !== undefined && -1 < xrsettings.screen_offset_y && xrsettings.screen_offset_y < 1){
						m_options["screen_offset"][0][1] = xrsettings.screen_offset_y;
						m_options["screen_offset"][1][1] = xrsettings.screen_offset_y;
					}else{
						m_options["screen_offset"][0][1] = -pose.views[0].projectionMatrix[9];
						m_options["screen_offset"][1][1] = -pose.views[1].projectionMatrix[9];
					}
		
					m_plugin_host.set_view_offset(new THREE.Quaternion());
					app.set_stereo(true);
				}
				
				var euler = new THREE.Euler(THREE.Math
					.degToRad(90), THREE.Math
					.degToRad(m_xr_yaw_offset), THREE.Math
					.degToRad(0), "YXZ");

				var offset_quat = new THREE.Quaternion()
					.setFromEuler(euler);

				var ori = pose.transform.orientation;
				var quat = new THREE.Quaternion(ori.x, ori.z, -ori.y, ori.w);

				quat = offset_quat.multiply(quat);

				m_plugin_host.set_view_quat(quat);
			}
			m_pstcore.pstcore_poll_events();
			m_xrsession.requestAnimationFrame(redraw);
		}

		m_xrsession.requestAnimationFrame(redraw);
	}

	function init_xr(){
		if(!navigator.xr){
			return;
		}
		var supported_callback = (xrtype) => {
			m_xrtype = xrtype;
			if(m_xrtype){
				app.start_xr = function(){
					m_canvas = app.get_canvas();
					m_glctx = app.get_glctx();
					m_framebuffer_bk = m_glctx.getParameter(m_glctx.FRAMEBUFFER_BINDING);
					return navigator.xr.requestSession(m_xrtype).then(onSessionStarted);
				}
				app.set_xrmode = (bln) => {
					m_permanent_options['xrmode'] = bln;
					localStorage.setItem(PLUGIN_NAME, JSON.stringify(m_permanent_options));
					if(m_pst && bln){
						app.start_xr();
					}
				};
				app.set_xr_yaw_offset = (yaw_degree) => {
					m_xr_yaw_offset = yaw_degree;
				};
				app.get_xrsession = () => {
					return m_xrsession;
				};
				var onSessionStarted = function(session) {
					m_xrsession = session;
					m_glctx.makeXRCompatible().then(() => {
						m_xrsession.updateRenderState({ baseLayer: new XRWebGLLayer(m_xrsession, m_glctx) });
						return m_xrsession.requestReferenceSpace('local');
					}).then((_refSpace) => {
						m_refSpace = _refSpace;

						app.set_stereo(true);
						m_plugin_host.fire_xrsession_started(m_xrsession);

						vr_draw();
					});

					m_xrsession.addEventListener('end', (e) => {
						m_plugin_host.fire_xrsession_stopped(m_xrsession);
						m_glctx.bindFramebuffer(m_glctx.FRAMEBUFFER, m_framebuffer_bk);
						m_glctx = null;
						m_framebuffer = null;
						m_framebuffer_bk = null;
						m_refSpace = null;
						m_xrsession = null;
						app.set_xrsession(null);
						app.start_animate();
					});
				};
				m_plugin_host.restore_app_menu();
			}
		};
		navigator.xr.isSessionSupported('immersive-ar').then((supported) => {
			if(supported){
				supported_callback('immersive-ar');
			}else{
				navigator.xr.isSessionSupported('immersive-vr').then((supported) => {
					if(supported){
						supported_callback('immersive-vr');
					}else{
						supported_callback(null);
					}
				});
			}
		});
	}
	return function(plugin_host) {
		m_plugin_host = plugin_host;
		var plugin = {
			init_options : function(options) {
				m_options = options;
                try{
                    m_permanent_options = JSON.parse(localStorage.getItem(PLUGIN_NAME)) || {};
                }catch (e){
                    m_permanent_options = {};
                }
			},
			pstcore_initialized : function(pstcore) {
				m_pstcore = pstcore;
				init_xr();
			},
			pst_started : function(pstcore, pst) {
				m_pstcore = pstcore;
				m_pst = pst;
				if(m_xrtype && swXrMode.isChecked()){
					app.start_xr();
				}
			},
			pst_stopped : function(pstcore, pst) {
				m_pst = null;
			},
			on_restore_app_menu : function(callback) {
				if(m_xrtype){
					var html = "";
					html += '<ons-list-item class="menu-item"><ons-row align="center">';
					html += '    <ons-col>XR Mode</ons-col>';
					html += '    <ons-col align="right" valign="center">';
					html += '        <ons-switch var="swXrMode" onchange="app.set_xrmode(swXrMode.isChecked());"/>';
					html += '    </ons-col>';
					html += '</ons-row></ons-list-item>';
					var onsListItem = $.parseHTML(html);
					menu_list.insertBefore(onsListItem[0], menu_list_about);
					ons.compile(onsListItem[0]);
					setTimeout(()=>{
						if(m_permanent_options['xrmode']){
							swXrMode.setChecked(true);
						}
					}, 0);
				}
			},
		};
		return plugin;
	}
})();