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


/**
 * QRコードの四隅からカメラ座標系の位置・法線を推定
 *
 * @param {Object} position ZXing qr.position
 * @param {Object} options
 * @returns {{
 *   x: number, y: number, z: number,
 *   normal: {x:number, y:number, z:number},
 *   rotation: number[],
 *   corners: Array
 * }}
 */
function estimateQRCodePose(position, options = {}) {

    const {
        width = 1280,
        height = 720,
        hfov = 60,
        size = 50
    } = options;

    // カメラ内部パラメータ
    const fx = width / (2 * Math.tan(hfov * Math.PI / 360));
    const fy = fx;

    const cx = width / 2;
    const cy = height / 2;

    // QRコードの実座標（中心原点）
    const objectPoints = [
        [-size / 2, -size / 2],
        [ size / 2, -size / 2],
        [ size / 2,  size / 2],
        [-size / 2,  size / 2]
    ];

    // 画像上の四隅
    const imagePoints = [
        position.topLeft,
        position.topRight,
        position.bottomRight,
        position.bottomLeft
    ];

    // 画像座標を正規化カメラ座標に変換
    const normalized = imagePoints.map(p => [
        (p.x - cx) / fx,
        (p.y - cy) / fy
    ]);

    // ホモグラフィーを求める
    const A = [];
    const b = [];

    for (let i = 0; i < 4; i++) {
        const [X, Y] = objectPoints[i];
        const [x, y] = normalized[i];

        A.push([X, Y, 1, 0, 0, 0, -x * X, -x * Y]);
        b.push(x);

        A.push([0, 0, 0, X, Y, 1, -y * X, -y * Y]);
        b.push(y);
    }

    const h = solveLinearSystem(A, b);

    // ホモグラフィーの列ベクトル
    const h1 = [h[0], h[3], h[6]];
    const h2 = [h[1], h[4], h[7]];
    const h3 = [h[2], h[5], 1];

    const norm = v => Math.hypot(...v);
    const dot = (a, b) =>
        a.reduce((s, v, i) => s + v * b[i], 0);

    const cross = (a, b) => [
        a[1] * b[2] - a[2] * b[1],
        a[2] * b[0] - a[0] * b[2],
        a[0] * b[1] - a[1] * b[0]
    ];

    const scale = 2 / (norm(h1) + norm(h2));

    // 回転行列の最初の2列
    let r1 = h1.map(v => v * scale);
    let r2 = h2.map(v => v * scale);

    // 直交化（Gram-Schmidt）
    const r1Norm = norm(r1);
    r1 = r1.map(v => v / r1Norm);

    const projection = dot(r1, r2);
    r2 = r2.map((v, i) => v - projection * r1[i]);

    const r2Norm = norm(r2);
    r2 = r2.map(v => v / r2Norm);

    // 法線ベクトル
    let r3 = cross(r1, r2);

    // QRコードの位置
    let t = h3.map(v => v * scale);

    // カメラ前方にある解を選択
    if (t[2] < 0) {
        r1 = r1.map(v => -v);
        r2 = r2.map(v => -v);
        r3 = r3.map(v => -v);
        t = t.map(v => -v);
    }

    // 回転行列（列優先ではなく行優先）
    const rotation = [
        r1[0], r2[0], r3[0],
        r1[1], r2[1], r3[1],
        r1[2], r2[2], r3[2]
    ];

    return {
        x: t[0],
        y: t[1],
        z: t[2],

        normal: {
            x: r3[0],
            y: r3[1],
            z: r3[2]
        },

        rotation,

        corners: imagePoints
    };
}

/**
 * ガウス消去法による連立一次方程式
 */
function solveLinearSystem(A, b) {

    const n = b.length;

    A = A.map((row, i) => [...row, b[i]]);

    for (let i = 0; i < n; i++) {

        // ピボット選択
        let maxRow = i;

        for (let j = i + 1; j < n; j++) {
            if (Math.abs(A[j][i]) > Math.abs(A[maxRow][i])) {
                maxRow = j;
            }
        }

        [A[i], A[maxRow]] = [A[maxRow], A[i]];

        if (Math.abs(A[i][i]) < 1e-12) {
            throw new Error("QR pose calculation failed: singular matrix");
        }

        // ピボットを1にする
        const pivot = A[i][i];

        for (let j = i; j <= n; j++) {
            A[i][j] /= pivot;
        }

        // 他の行を消去
        for (let k = 0; k < n; k++) {
            if (k === i) continue;

            const factor = A[k][i];

            for (let j = i; j <= n; j++) {
                A[k][j] -= factor * A[i][j];
            }
        }
    }

    return A.map(row => row[n]);
}


async function startCamera(callback) {
    if (running) return;

    try {
        const baseVideoConstraints = {
            width: { ideal: 1280 },
            height: { ideal: 720 }
        };

        try {
            stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    ...baseVideoConstraints,
                    facingMode: { exact: "environment" }
                },
                audio: false
            });
        } catch (err) {
            stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    ...baseVideoConstraints,
                    facingMode: "user"
                },
                audio: false
            });
        }

        const video = document.createElement("video");
        video.srcObject = stream;
        if(false){
            video.style.position = "fixed";
            video.style.left = "50%";
            video.style.top = "50%";
            video.style.transform = "translate(-50%, -50%)";
            video.style.zIndex = "999999";
            video.style.maxWidth = "90vw";
            video.style.maxHeight = "90vh";
            video.style.objectFit = "contain";
            document.body.appendChild(video);
        }

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
                        callback(results, imageData);
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
    let m_jumon_cur = {};

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
                "obj_scale" : "1.0,1.0,1.0",
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
			},
            pst_started: function (pstcore, pst) {
                m_pstcore = pstcore;
                m_pst = pst;

				upload_objs(m_pstcore, m_pst);

                blind(true);

                startCamera((res, imageData) => {
                    // if(!m_pst){
                    //     return;
                    // }

                    blind(false);

                    const qr = res[0];
                    console.log("QR Result:", qr);

                    if(!qr.text.startsWith('{')){
                        return;
                    }
                    try{
                        const jumon = JSONC.parse(qr.text);
                        if(jumon.format != "REMOPASS_JUMON"){
                            return;
                        }
                        if(JSON.stringify(jumon) == JSON.stringify(m_jumon_cur)){
                            return;
                        }

                        const pose = estimateQRCodePose(qr.position, {
                            width: imageData.width,
                            height: imageData.height,
                            hfov: 60,
                            size: jumon.marker_size,
                        });

                        const transform = {
                            position : [ pose.x/1e3, pose.y/1e3, pose.z/1e3 ],
                            scale : [ 1.0, 1.0, 1.0 ],
                            tex_id : "door-frame",
                        };
                        m_pstcore.pstcore_set_param(m_pst, "door", "set_transform", JSON.stringify(transform));
                    }catch(e){
                        console.log(e);
                    }
                });
            },
            event_handler: function (sender, event, new_state) {
            },
        };
        return plugin;
    }
})();
//</script>