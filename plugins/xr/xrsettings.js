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
				if(!m_pst){
					return;
				}
				try{
					switch(event){
						case "2_AXIS_FORWARD_DOWN":
							{
								var value = parseFloat(m_pstcore.pstcore_get_param(m_pst, "renderer", "parallax"));
								value += 0.1;
								m_pstcore.pstcore_set_param(m_pst, "renderer", "parallax", value.toString());

								m_permanent_options.parallax = value;
								localStorage.setItem(PLUGIN_NAME, JSON.stringify(m_permanent_options));
								console.log(m_permanent_options);
							}
							break;
						case "2_AXIS_BACKWARD_DOWN":
							{
								var value = parseFloat(m_pstcore.pstcore_get_param(m_pst, "renderer", "parallax"));
								value -= 0.1;
								m_pstcore.pstcore_set_param(m_pst, "renderer", "parallax", value.toString());

								m_permanent_options.parallax = value;
								localStorage.setItem(PLUGIN_NAME, JSON.stringify(m_permanent_options));
								console.log(m_permanent_options);
							}
							break;
						case "3_AXIS_FORWARD_DOWN":
							{
								var value = parseFloat(m_pstcore.pstcore_get_param(m_pst, "renderer", "fov"));
								value -= 1;
								m_pstcore.pstcore_set_param(m_pst, "renderer", "fov", value.toString());
								
								m_permanent_options.fov = value;
								localStorage.setItem(PLUGIN_NAME, JSON.stringify(m_permanent_options));
								console.log(m_permanent_options);
							}
							break;
						case "3_AXIS_BACKWARD_DOWN":
							{
								var value = parseFloat(m_pstcore.pstcore_get_param(m_pst, "renderer", "fov"));
								value += 1;
								m_pstcore.pstcore_set_param(m_pst, "renderer", "fov", value.toString());
								
								m_permanent_options.fov = value;
								localStorage.setItem(PLUGIN_NAME, JSON.stringify(m_permanent_options));
								console.log(m_permanent_options);
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
	return self;
})();