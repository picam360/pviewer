/*global cordova, module*/

var m_pstcore = require('pstcore');
var m_pst = null;
var m_set_param_callback = null;
module.exports = {
	init: function (successCallback, errorCallback) {
		const config = {
				"plugin_paths" : [
					"plugins/pvf_loader_st.so",
					"plugins/libde265_decoder_st.so",
					//"plugins/timer_st.so",
					"plugins/pgl_renderer_st.so",
				],
				"window_size" : {
					"width" : window.innerWidth,
					"height" : window.innerHeight
				}
		}
		if (process.platform == 'darwin') {
			config.plugin_paths.push("plugins/vt_decoder_st.so");
		}
		const config_json = JSON.stringify(config);
		m_pstcore.pstcore_init(config_json);
		
		m_pstcore.pstcore_add_set_param_done_callback((msg) => {
			if(m_set_param_callback) {
				m_set_param_callback(msg);
			}
		});
		
        successCallback("OK");
	},
	on_set_param: function (successCallback, errorCallback) {
		m_set_param_callback = successCallback;
	},
	build_pvf_streamer: function (successCallback, errorCallback) {
        var stdef = "";
        //cur += sprintf(buff + cur, "pvf_loader url=%s", url);
		if (process.platform == 'darwin') {
        	stdef += "vt_decoder name=decoder";
		} else {
        	stdef += "libde265_decoder name=decoder";
		}
        stdef += "!pgl_renderer name=renderer";
        m_pst = m_pstcore.pstcore_build_pstreamer(stdef);

        successCallback("OK");
	},
	poll: function (successCallback, errorCallback) {
    	m_pstcore.pstcore_poll_events();
	},
	start_pstreamer: function (_this, successCallback, errorCallback) {
		if(!m_pst){
			return;
		}
    	m_pstcore.pstcore_start_pstreamer(m_pst);
    	
        successCallback("OK");
	},
	stop_pstreamer: function (_this, successCallback, errorCallback) {
		if(!m_pst){
			return;
		}
    	m_pstcore.pstcore_stop_pstreamer(m_pst);
    	
        successCallback("OK");
	},
	destroy_pstreamer: function (_this, successCallback, errorCallback) {
		if(!m_pst){
			return;
		}
    	m_pstcore.pstcore_destroy_pstreamer(m_pst);
    	m_pst = null;
    	
        successCallback("OK");
	},
	enqueue: function (_this, data, successCallback, errorCallback) {
		if(!m_pst){
			return;
		}
    	m_pstcore.pstcore_enqueue(m_pst, data);
    	
        successCallback("OK");
	},
	set_param: function (_this, pst_name, param, value, successCallback, errorCallback) {
		if(!m_pst){
			return;
		}
		m_pstcore.pstcore_set_param(m_pst, pst_name, param, value);
		
        successCallback("OK");
	},
};
