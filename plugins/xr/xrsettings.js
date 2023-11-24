var create_plugin = (function() {
	var PLUGIN_NAME = "xrsettings";
	var m_plugin_host = null;
	var m_pstcore = null;
	var m_pst = 0;

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
			event_handler : function(sender, event) {
				if(!m_pst || !app.get_xrsession()){
					return;
				}
				try{
					switch(event){
						case "2_AXIS_FORWARD_DOWN":
						case "2_AXIS_BACKWARD_DOWN":
						case "3_AXIS_FORWARD_DOWN":
						case "3_AXIS_BACKWARD_DOWN":
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
									case "2_AXIS_FORWARD_DOWN":
										x += 0.01;
										m_permanent_options.screen_offset_x = x;
										break;
									case "2_AXIS_BACKWARD_DOWN":
										x -= 0.01;
										m_permanent_options.screen_offset_x = x;
										break;
									case "3_AXIS_FORWARD_DOWN":
										y -= 0.01;
										m_permanent_options.screen_offset_y = y;
										break;
									case "3_AXIS_BACKWARD_DOWN":
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
						case "4_BUTTON_DOWN":
							{
								var value = parseFloat(m_pstcore.pstcore_get_param(m_pst, "renderer", "fov"));
								value -= 1;
								m_pstcore.pstcore_set_param(m_pst, "renderer", "fov", value.toString());
								
								m_permanent_options.fov = value;
								localStorage.setItem(PLUGIN_NAME, JSON.stringify(m_permanent_options));
								console.log(m_permanent_options);
							}
							break;
						case "5_BUTTON_DOWN":
							{
								var value = parseFloat(m_pstcore.pstcore_get_param(m_pst, "renderer", "fov"));
								value += 1;
								m_pstcore.pstcore_set_param(m_pst, "renderer", "fov", value.toString());
								
								m_permanent_options.fov = value;
								localStorage.setItem(PLUGIN_NAME, JSON.stringify(m_permanent_options));
								console.log(m_permanent_options);
							}
							break;
						case "3_BUTTON_DOWN":
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