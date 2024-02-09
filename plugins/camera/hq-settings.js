var create_plugin = (function() {
    var m_plugin_host = null;
    var m_plugin = null;
	var m_pstcore = null;
	var m_pst = 0;
    var m_options = {};
    var m_delay_timer = null;
        
    function addMenuButton(name, txt) {
            return new Promise((resolve, reject) => {
            var onsListItem = document.createElement("ons-list-item");
            onsListItem.id = name;
            onsListItem.innerHTML = txt;
            menu_list.insertBefore(onsListItem, menu_list_about);
            ons.compile(onsListItem);
            resolve();
        });
    }
    function prompt(msg, title) {
        return new Promise((resolve, reject) => {
            var range = {
                ae_target : { min : 10, max : 220, step : 1 },
                ctemp : { min : 2000, max : 15000, step : 50 },
                tint : { min : 200, max : 2500, step : 10 },
                hue : { min : -180, max : 180, step : 1 },
                saturation : { min : 0.0, max : 255, step : 1 },
                brightness : { min : -64, max : 64, step : 1 },
                contrast : { min : -100, max : 100, step : 1 },
                gamma : { min : 20, max : 180, step : 1 },
            };
            var default_hqcamera_params = {
                ae_target : 120,
                ctemp : 6503,
                tint : 1000,
                hue : 0,
                saturation : 128,
                brightness : 0,
                contrast : 0,
                gamma : 100,
            };
            var hqcamera_params = Object.assign(
                JSON.parse(JSON.stringify(default_hqcamera_params)),
                JSON.parse(JSON.stringify(m_options.hqcamera_params || {})));
            var html = '<p>' + msg + '</p>'
                     + '<div style="overflow-y: scroll; height: 150px;"><table>';
            function append_node(name, min, max, step, value){
                var id = `dialog-message-${name}`;
                html += '<tr>';
                html += `<td>${name}</td>`
                html += `<td><input type="range" name="${id}-range" min="${min}" max="${max}" step="${step}" value="${value}" /></td>`
                html += `<td><input type="text" name="${id}" id="${id}" size="5" value="${value}" /></td>`
                html += '</tr>';
            }
            for(var key in hqcamera_params){
                var name = `${key}`;
                append_node(name, range[key].min, range[key].max, range[key].step, hqcamera_params[key]);
            }
            html += '</table></div>';
            $( "#dialog-message" ).html(html);
            $( "#dialog-message" ).dialog({
              modal: true,
                title: title,
              buttons: {
                "Reset": function() {
                    $( this ).dialog( "close" );
                },
                "Close": function() {
                    $( this ).dialog( "close" );
                }
              }
            });
            function eventhandler(name, callback, ext){
                var id = `dialog-message-${name}`;
                var obj = $( `input[name='${id}']` );
                obj[0].ext = ext;
                obj.on("change", (e) => {
                    callback(e);
                });
                var range_obj = $( `input[name='${id}-range']` );
                range_obj[0].ext = { text_obj : obj };
                range_obj.on("input", (e) => {
                    e.target.ext.text_obj.val(e.target.value).trigger("change");
                });
            }
            for(var key in hqcamera_params){
                var name = `${key}`;
                eventhandler(name, (e) => {
                    var val = parseFloat(e.target.value);
                    if(isNaN(val)){
                        e.target.value = hqcamera_params[e.target.ext.key][e.target.ext.i];
                    }else{
                        hqcamera_params[e.target.ext.key] = val;
                        if(m_pst){
                            clearTimeout(m_delay_timer);
                            m_delay_timer = setTimeout(() => {
                                var cams = [
                                    "mux.vin0.capture",
                                    "mux.vin1.capture"
                                ];
                                for(var cam of cams){
                                    var key = e.target.ext.key;
                                    m_pstcore.pstcore_set_param(m_pst, cam, key, val.toString());
                                }
                            }, 500);
                        }
                    }
                }, { key });
            }
        });
    }
    
    function open_dialog(){
        app.menu.close();
        prompt("Camera", "Settings").then((opt) => {
        }).catch((err) => {
        });
    }
    
    return function(plugin_host) {
        //debugger;
        m_plugin_host = plugin_host;
        
        m_plugin = {
            init_options : function(options) {
                m_options = options;
            },
            pst_started: function (pstcore, pst) {
				m_pstcore = pstcore;
				m_pst = pst;
            },
            pst_stopped: function (pstcore, pst) {
				if(pst == m_pst){
					m_pst = 0;
				}
            },
            on_restore_app_menu : function(callback) {
                addMenuButton("swCamera", "Camera").then(() => {
                    swCamera.onclick = (evt) => {
                        open_dialog();
                    };
                });
            },
            event_handler : function(sender, event) {
            },
            command_handler : function(cmd, update) {
            },
        };
        return m_plugin;
    }
})();