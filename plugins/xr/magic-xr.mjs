//<script type="module">
const base_path = new URL('.', import.meta.url).href;
const ZXingWASM = await import(
  base_path + "../../lib/zxing-wasm/es/reader/index.js"
);

let stream = null;
let running = false;
let lastVideoTime = -1;
let lastTs = performance.now();

// QRコード読み取り設定
const readerOptions = {
    formats: ["QRCode"],
    tryHarder: true,
    maxNumberOfSymbols: 1
};

async function startCamera(callback) {
    if (running) return;

    try {

        stream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: "user",
                width: { ideal: 1280 },
                height: { ideal: 720 }
            },
            audio: false
        });

        const video = document.createElement("video");
        video.srcObject = stream;

        await new Promise((resolve) => {
            video.onloadedmetadata = () => resolve();
        });

        await video.play();

        lastVideoTime = -1;
        lastTs = performance.now();
        running = setInterval(async () => {
            const now = performance.now();
            const dt = Math.max(1, now - lastTs);
            lastTs = now;

            if (video.readyState >= 2) {
                if (video.currentTime !== lastVideoTime) {
                    lastVideoTime = video.currentTime;

                    const frame = new VideoFrame(video);
                    const imageData = new ImageData(
                        frame.displayWidth,
                        frame.displayHeight
                    );

                    await frame.copyTo(imageData.data, {
                        format: "RGBA"
                    });

                    frame.close();

                    const results = await ZXingWASM.readBarcodes(
                        imageData,
                        readerOptions
                    );

                    if (results.length > 0) {
                        callback(results);
                    }
                }
            }
        }, 33);
    } catch (err) {
        console.error(err);
    }
}

function stopCamera() {
    if (!running) {
        return;
    }
    clearInterval(running);
    running = 0;

    if (stream) {
        for (const track of stream.getTracks()) {
            track.stop();
        }
        stream = null;
    }
}

export const create_plugin = (function () {
    const PLUGIN_NAME = "magic_xr";
    let m_plugin_host = null;
    let m_pstcore = null;
    let m_pst = 0;
    let m_permanent_options = {};

    let m_xrsession = null;

	var m_objs = [
		{
			url : "/amf/blind-wall.amf",
			obj_id : "blind-wall",
			obj : null,
			default_color : "0.0,0.0,0.0,0.001",
			prepared : false,
		},
	];

	function base64encode_binary(data){
		return btoa([...data].map(n => String.fromCharCode(n)).join(""));
	}

	function load_objs(idx){
		if(idx === undefined){
			idx = 0;
		}else if(idx >= m_objs.length){
			return;
		}
		var base_url = "plugins/xr";
		if(m_objs[idx].url){
			var getFile = m_plugin_host.getFile;
			if(m_plugin_host.getFileFromUpstream){
				getFile = m_plugin_host.getFileFromUpstream;
			}
			getFile(base_url + m_objs[idx].url, (data) => {
				if(Array.isArray(data)){
					data = data[0];
				}
				m_objs[idx].obj = base64encode_binary(data);
				m_objs[idx].prepared = true;
				load_objs(idx + 1);
			});
		}else{
			m_objs[idx].prepared = true;
			load_objs(idx + 1);
		}
	}

	function upload_objs(pstcore, pst){
		var json = {
			nodes : [],
		};
		for(var node of m_objs){
			json.nodes.push({
				obj : node.obj,
				default_color : node.default_color,
				smooth_shading : false,
				obj_id : node.obj_id,
			});
		}
		var json_str = JSON.stringify(json);
		pstcore.pstcore_set_param(pst, "renderer", "overlay_obj", json_str);
	}

    function blind(bln){
        var jobj = {
            "id" : "blind",
            "nodes" : []
        };
        if(bln){
			jobj.nodes.push({
                "obj_scale" : "0.1,0.1,0.1",
                "obj_pos" : "0.0,0.0,0.0",
                "obj_quat" : "0,0,0,1",
                "use_light" : false,
                "blend" : false,
                "obj_id" : "blind-wall",
                "direct": true,
                "cull_face" : false,
			});
        }
		m_pstcore.pstcore_set_param(m_pst, "renderer", "overlay", JSON.stringify(jobj));
    }

    return function (plugin_host) {
        m_plugin_host = plugin_host;
        var plugin = {
            init_options: function (options) {
                try {
                    m_permanent_options = JSON.parse(localStorage.getItem(PLUGIN_NAME)) || {};
                } catch (e) {
                    m_permanent_options = {};
                }

				load_objs();

                ZXingWASM.setZXingModuleOverrides({
                    locateFile: (path, prefix) => {
                        if (path.endsWith(".wasm")) {
                            return "/lib/zxing-wasm/reader/zxing_reader.wasm";
                        }
                        return prefix + path;
                    }
                });
            },
			xrsession_started: function (session) {
				m_xrsession = session;

                startCamera((res) => {
                    // if(!m_pst){
                    //     return;
                    // }

                    blind(false);

                    const qr = res[0];
                    console.log("QR Result:", qr);

                    const transform = {
                        position : [ 0, 0, 1 ],
                        scale : [ 1.0, 1.0, 1.0 ],
                    };
                    m_pstcore.pstcore_set_param(m_pst, "door", "set_transform", JSON.stringify(transform));
                });
			},
            pst_started: function (pstcore, pst) {
                m_pstcore = pstcore;
                m_pst = pst;

				upload_objs(m_pstcore, m_pst);

                blind(true);
            },
            event_handler: function (sender, event, new_state) {
            },
        };
        return plugin;
    }
})();
//</script>