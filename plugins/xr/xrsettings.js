var create_plugin = (function() {
	var PLUGIN_NAME = "xrsettings";
	var m_plugin_host = null;
	var m_pstcore = null;
	var m_pst = 0;
	var m_permanent_options = {};

	return function(plugin_host) {
		m_plugin_host = plugin_host;
		var plugin = {
			init_options : function(options) {
                try{
                    m_permanent_options = JSON.parse(localStorage.getItem(PLUGIN_NAME)) || {};
                }catch (e){
                    m_permanent_options = {};
                }
			},
			pst_started : function(pstcore, pst) {
				m_pstcore = pstcore;
				m_pst = pst;
			},
			event_handler : function(sender, event, new_state) {
				if(!m_pst || !app.get_xrsession()){
					return;
				}
				if(!new_state || !new_state[event]){
					return;
				}
				try{
					switch(event){
						case "RIGHT_2_AXIS_FORWARD":
						case "RIGHT_2_AXIS_BACKWARD":
						case "RIGHT_3_AXIS_FORWARD":
						case "RIGHT_3_AXIS_BACKWARD":
							{
								var x = 0;
								var y = 0;
								var value = m_pstcore.pstcore_get_param(m_pst, "renderer", "screen_offset_left");
								try{
									var nodes = value.split(',');
									x = parseFloat(nodes[0]);
									y = parseFloat(nodes[1]);
								}catch{};

								switch(event){
									case "RIGHT_2_AXIS_FORWARD":
										x += 0.01;
										m_permanent_options.screen_offset_x = x;
										break;
									case "RIGHT_2_AXIS_BACKWARD":
										x -= 0.01;
										m_permanent_options.screen_offset_x = x;
										break;
									case "RIGHT_3_AXIS_FORWARD":
										y -= 0.01;
										m_permanent_options.screen_offset_y = y;
										break;
									case "RIGHT_3_AXIS_BACKWARD":
										y += 0.01;
										m_permanent_options.screen_offset_y = y;
										break;
								}
								m_pstcore.pstcore_set_param(m_pst, "renderer", "screen_offset_left", `${x},${y}`);
								m_pstcore.pstcore_set_param(m_pst, "renderer", "screen_offset_right", `${-x},${y}`);

								localStorage.setItem(PLUGIN_NAME, JSON.stringify(m_permanent_options));
								console.log(m_permanent_options);
							}
							break;
						case "RIGHT_4_BUTTON_PUSHED":
							{
								var value = parseFloat(m_pstcore.pstcore_get_param(m_pst, "renderer", "fov"));
								value -= 1;
								m_pstcore.pstcore_set_param(m_pst, "renderer", "fov", value.toString());
								
								m_permanent_options.fov = value;
								localStorage.setItem(PLUGIN_NAME, JSON.stringify(m_permanent_options));
								console.log(m_permanent_options);
							}
							break;
						case "RIGHT_5_BUTTON_PUSHED":
							{
								var value = parseFloat(m_pstcore.pstcore_get_param(m_pst, "renderer", "fov"));
								value += 1;
								m_pstcore.pstcore_set_param(m_pst, "renderer", "fov", value.toString());
								
								m_permanent_options.fov = value;
								localStorage.setItem(PLUGIN_NAME, JSON.stringify(m_permanent_options));
								console.log(m_permanent_options);
							}
							break;
						case "RIGHT_3_BUTTON_PUSHED":
							{//reset
								m_permanent_options = {};
								localStorage.setItem(PLUGIN_NAME, JSON.stringify(m_permanent_options));
								console.log("reset", m_permanent_options);
								app.get_xrsession().end();
							}
							break;
					}
				}catch(err){
					console.log(err);
				}
			},
		};
		return plugin;
	}
})();