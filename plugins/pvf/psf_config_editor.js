var create_plugin = (function() {
	var PLUGIN_NAME = "psf_config_editor";
	var m_plugin_host = null;
	var m_pstcore = null;
	var m_pst = 0;
	var m_filemap = {};
	var m_options = {};
    var m_permanent_options = {};
	var m_config_json = {};
	var m_current_point = "";
	var m_yaw_deg_mousedown = 0;
	var m_container = null;
	var m_map = null;
	var m_layer_points = null;
	var m_layer_current = null;

	function push_str(nodes, str, x, y, z, w, coodinate){
		var offset = 0;
		switch(coodinate){
			case "left":
				offset = 0;
				break;
			case "right":
				offset = -w*str.length;
				break;
			case "center":
			default:
				offset = -w*str.length/2;
				break;
		}
		const INT_MAX = 0x7FFFFFFF;
		for(var i=0;i<str.length;i++){
			nodes.push({
				width : w,
				height : w*1.25,
				x : x + w*i + offset,
				y,
				z : (z > 1 ? z : INT_MAX),
				tex_id : `ascii[${str.charCodeAt(i)}]`,
			});
		}
	}

	function get_yaw_deg(){
		var view_offset_quat = m_plugin_host.get_view_offset() || new THREE.Quaternion();
		var view_quat = m_plugin_host.get_view_quat() || new THREE.Quaternion();
		var quat = view_offset_quat.multiply(view_quat);

		var pos = new THREE.Vector3(0, 1, 0).applyQuaternion(quat);
		var yaw_deg = Math.atan2(pos.x, pos.z) / Math.PI * 180;
		return yaw_deg;
	}

	var down = false;
	var wsx = 0, wsy = 0;
	var sx = 0, sy = 0;
	var ex = 0, ey = 0;
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

		var yaw_deg = get_yaw_deg();
		m_yaw_deg_mousedown = yaw_deg;

		var overlay_json = {
			nodes : [],
		};
		push_str(overlay_json.nodes, yaw_deg.toFixed(0) + "deg", 80, 5, 0, 4);
		m_pstcore.pstcore_set_param(m_pst, "renderer", "overlay", JSON.stringify(overlay_json));
	};
	var mousemoveFunc = function(ev) {
		if (ev.type == "touchmove") {
			ev.clientX = ev.targetTouches[0].pageX;
			ev.clientY = ev.targetTouches[0].pageY;
			ev.button = 0;
		}
		
		var dx = -(ev.clientX - ex);
		var dy = -(ev.clientY - ey);
		ex -= dx;
		ey -= dy;

		if(down){
			var yaw_deg = get_yaw_deg();
			var diff_deg = yaw_deg - m_yaw_deg_mousedown;
	
			var overlay_json = {
				nodes : [],
			};
			push_str(overlay_json.nodes, yaw_deg.toFixed(0) + "deg", 80, 5, 0, 4);
			push_str(overlay_json.nodes, diff_deg.toFixed(0) + "deg", 80, 10, 0, 4);
			m_pstcore.pstcore_set_param(m_pst, "renderer", "overlay", JSON.stringify(overlay_json));
		}
	}
	var mouseupFunc = function(ev) {
		down = false;

		var overlay_json = {
			nodes : [],
		};
		m_pstcore.pstcore_set_param(m_pst, "renderer", "overlay", JSON.stringify(overlay_json));
	};
	var mousewheelFunc = function(e) {
	};
	var keydownFunc = function(e){
		if(e.ctrlKey) {
			switch(e.code){
				case "KeyS":
					console.log(PLUGIN_NAME, "save config.json");
					var json_str = JSON.stringify(m_config_json, null, 4);
					console.log(PLUGIN_NAME, json_str);
					break;
			}
		}
		if(e.altKey) {
			switch(e.code){
				case "KeyM":
					console.log(PLUGIN_NAME, "map");
					if(m_container.style.display == "none"){
						m_container.style.display = "block";
					}else{
						m_container.style.display = "none";
					}
					break;
				case "KeyC":
					console.log(PLUGIN_NAME, "tune compass");
					if(m_pst){
						var point = get_point_from_path(m_current_point);
						if(point == null){
							return;
						}

						var yaw_deg = get_yaw_deg();
						var diff_deg = yaw_deg - m_yaw_deg_mousedown;

						point.compass += diff_deg;

						var json_str = JSON.stringify(m_config_json);
						//console.log(PLUGIN_NAME, json_str);
						m_pstcore.pstcore_set_param(m_pst, "psf_loader", "config_json", json_str);

						m_yaw_deg_mousedown = yaw_deg;
					}
					break;
			}
		}
	}
	var keyupFunc = function(e){
		switch(e.code){
		}
	}

	function init_map() {
		m_container = document.createElement("div");
		//style
		m_container.style.position = "absolute";
		m_container.style.left = "0%";
		m_container.style.top = "67%";
		m_container.style.width = "33%";
		m_container.style.height = "33%";
		m_container.id = "map";
		//m_container.style.display = "none";

		var mousedownFunc = function(ev) {
			var now = new Date().getTime();
		}
		var mouseupFunc = function() {
			var now = new Date().getTime();
		}
		var mousemoveFunc = function(ev) {
			if (ev.type == "touchmove") {
				ev.clientX = ev.pageX;
				ev.clientY = ev.pageY;
			}
			ev.preventDefault();
			ev.stopPropagation();
		}
		var mousewheelFunc = function(ev) {
			ev.preventDefault();
			ev.stopPropagation();
		};
		var preventFunc = function(ev) {
			ev.preventDefault();
			ev.stopPropagation();
		}
		m_container.addEventListener("touchstart", mousedownFunc);
		m_container.addEventListener("mousedown", mousedownFunc);
		m_container.addEventListener("mousemove", mousemoveFunc);
		m_container.addEventListener("touchmove", mousemoveFunc);
		m_container.addEventListener("mousewheel", mousewheelFunc);
		m_container.addEventListener("dragstart", preventFunc, {
			passive : false
		});
		document.body.appendChild(m_container);

		var script = document.createElement('script');
		script.src = "https://vpm.picam360.com/openlayers-v5.1.3/ol.js";
		script.onload = function() {

			// m_overlay = new ol.Overlay({
			// 	element : m_container,
			// 	autoPan : true,
			// 	autoPanAnimation : {
			// 		duration : 250
			// 	}
			// });
			m_map = new ol.Map({
				target : 'map',
				layers : [new ol.layer.Tile({
					source : new ol.source.OSM()
				})],
				overlays : [],
				view : new ol.View({
					center : ol.proj.fromLonLat([136.1228505, 35.2937157]),
					zoom : 20
				})
			});

			m_layer_points = new ol.layer.Vector({
				source : new ol.source.Vector({
					features : []
				})
			});
			m_map.addLayer(m_layer_points);

			m_layer_current = new ol.layer.Vector({
				source : new ol.source.Vector({
					features : []
				})
			});
			m_map.addLayer(m_layer_current);
			
		};
		document.head.appendChild(script);
	}

	function get_point_from_path(path){
		try{
			for(var p of m_config_json.points){
				if(p.path == path){
					return p;
				}
			}
		}catch{
			return null;
		}
		return null;
	}

	return function(plugin_host) {
		//debugger;
		m_plugin_host = plugin_host;
		
		var plugin = {
			init_options : function(options) {
                try{
                    m_permanent_options = JSON.parse(localStorage.getItem(PLUGIN_NAME + '_js_options')) || {};
                }catch (e){
                    m_permanent_options = {};
                }
                Object.assign(options, m_permanent_options);
                m_options = options;

				init_map();
			},
            pst_started: function (pstcore, pst) {
				m_pstcore = pstcore;
				m_pst = pst;
				m_pstcore.pstcore_add_set_param_done_callback(m_pst, (pst_name, param, value)=>{
					if(pst_name == "psf_loader"){
						switch(param){
							case "config_json":
								m_config_json = JSON.parse(value);
								{
									var features = [];
									for(var p of m_config_json.points){
										var pos = p.location.split(',');
										var lon = parseFloat(pos[0]);
										var lat = parseFloat(pos[1]);
										var feature = new ol.Feature(new ol.geom.Point(ol.proj.fromLonLat([lon, lat])));
										features.push(feature);
									}
									m_layer_points.setSource(new ol.source.Vector({
										features
									}));
								}
								break;
							case "current_point":
								m_current_point = value;
								var point = get_point_from_path(m_current_point);
								if(point != null){
									var pos = point.location.split(',');
									var lon = parseFloat(pos[0]);
									var lat = parseFloat(pos[1]);
									m_map.getView().setCenter(ol.proj.fromLonLat([lon, lat]));

									var feature = new ol.Feature(new ol.geom.Point(ol.proj.fromLonLat([lon, lat])));
									feature.setStyle([
										new ol.style.Style({
											image : new ol.style.Circle({
												radius : 15,
												stroke : new ol.style.Stroke({
													color : [255, 0, 0],
													width : 2
												})
											})
										})]);
									m_layer_current.setSource(new ol.source.Vector({
										features : [feature]
									}));
								}
								break;
						}
					}
				});
				document.addEventListener("touchstart", mousedownFunc);
				document.addEventListener("touchmove", mousemoveFunc);
				document.addEventListener("touchend", mouseupFunc);
				document.addEventListener("mousedown", mousedownFunc);
				document.addEventListener("mousemove", mousemoveFunc);
				document.addEventListener("mouseup", mouseupFunc);
				document.addEventListener("mousewheel", mousewheelFunc);
				document.addEventListener('keydown', keydownFunc);
				document.addEventListener('keyup', keyupFunc);
            },
            pst_stopped: function (pstcore, pst) {
				document.removeEventListener("touchstart", mousedownFunc);
				document.removeEventListener("touchmove", mousemoveFunc);
				document.removeEventListener("touchend", mouseupFunc);
				document.removeEventListener("mousedown", mousedownFunc);
				document.removeEventListener("mousemove", mousemoveFunc);
				document.removeEventListener("mouseup", mouseupFunc);
				document.removeEventListener("mousewheel", mousewheelFunc);
				document.removeEventListener('keydown', keydownFunc);
				document.removeEventListener('keyup', keyupFunc);
            },
			event_handler : function(sender, event) {
			},
		};
		return plugin;
	}
})();