var create_plugin = (function() {
    var m_plugin_host = null;
    var m_plugin = null;
	var m_pstcore = null;
	var m_pst = 0;
    var m_options = {};
        
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
                fov : { min : 30, max : 150, step : 1},
                so : { min : -1.0, max : 1.0, step : 0.01},
                c : { min : 0.0, max : 1.0, step : 0.01},
                f : { min : 0.0, max : 2.0, step : 0.01},
                k : { min : -1.0, max : 1.0, step : 0.01},
                p : { min : -1.0, max : 1.0, step : 0.01},
                s : { min : -1.0, max : 1.0, step : 0.01},
            };
            var default_fov = 95;
            var default_lens_params = {
                c : [ 0.500, 0.500 ],
                f : [ 1.000, 1.000 ],
                k : [ 0.000, 0.000, 0.000, 0.000 ],
                p : [ 0.000, 0.000 ],
                s : [ 0.000, 0.000, 0.000, 0.000 ],
            };
            var xrsettings = JSON.parse(localStorage.getItem("xrsettings")) || {};
            var lens_params = Object.assign(
                JSON.parse(JSON.stringify(default_lens_params)),
                JSON.parse(JSON.stringify(m_options.lens_params)));
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
            append_node("fov", range["fov"].min, range["fov"].max, range["fov"].step, m_options.fov_stereo);
            for(var key of ["x", "y"]){
                append_node(`so${key}`, range["so"].min, range["so"].max, range["so"].step, xrsettings[`screen_offset_${key}`] || 0);
            }
            for(var key in lens_params){
                for(var i in lens_params[key]){
                    var name = `${key}${i}`;
                    if(key == "c" || key == "f"){
                        name = `${key}${i == 0 ? "x" : "y"}`;
                    }
                    append_node(name, range[key].min, range[key].max, range[key].step, lens_params[key][i]);
                }
            }
            html += '</table></div>';
            $( "#dialog-message" ).html(html);
            $( "#dialog-message" ).dialog({
              modal: true,
                title: title,
              buttons: {
                "Reset": function() {
                    app.set_fov_stereo(default_fov);
                    app.set_lens_params(default_lens_params);

                    $( this ).dialog( "close" );
                },
                "Close": function() {
                    $( this ).dialog( "close" );
                }
              }
            });
            function eventhandler(name, callback, ext){//fov
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
            eventhandler("fov", (e) => {
                var val = parseFloat(e.target.value);
                if(isNaN(val)){
                    e.target.value = m_options.fov_stereo;
                }else{
                    app.set_fov_stereo(val);
                }
            });
            for(var key of ["x", "y"]){
                eventhandler(`so${key}`, (e) => {
                    var key = e.target.ext;
                    var val = parseFloat(e.target.value);
                    if(isNaN(val)){
                        e.target.value = xrsettings[`screen_offset_${key}`] || 0;
                    }else{
                        xrsettings[`screen_offset_${key}`] = val;
                        localStorage.setItem("xrsettings", JSON.stringify(xrsettings));
                        app.set_screen_offset([xrsettings.screen_offset_x || 0, xrsettings.screen_offset_y || 0]);
                    }
                }, key);
            }
            for(var key in lens_params){
                for(var i in lens_params[key]){
                    var name = `${key}${i}`;
                    if(key == "c" || key == "f"){
                        name = `${key}${i == 0 ? "x" : "y"}`;
                    }
                    eventhandler(name, (e) => {
                        var val = parseFloat(e.target.value);
                        if(isNaN(val)){
                            e.target.value = lens_params[e.target.ext.key][e.target.ext.i];
                        }else{
                            lens_params[e.target.ext.key][e.target.ext.i] = val;
                            app.set_lens_params(lens_params);
                        }
                    }, { key, i });
                }
            }
        });
    }
    
    function open_dialog(){
        app.menu.close();
        prompt("Distortion and Offset Tunings", "Lens Settings").then((opt) => {
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
            on_restore_app_menu : function(callback) {
                addMenuButton("swLens", "Lens").then(() => {
                    swLens.onclick = (evt) => {
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