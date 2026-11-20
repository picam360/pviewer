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
    var PLUGIN_NAME = "magic_mr";
    var m_plugin_host = null;
    var m_pstcore = null;
    var m_pst = 0;
    var m_permanent_options = {};

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


    return function (plugin_host) {
        m_plugin_host = plugin_host;
        var plugin = {
            init_options: function (options) {
                try {
                    m_permanent_options = JSON.parse(localStorage.getItem(PLUGIN_NAME)) || {};
                } catch (e) {
                    m_permanent_options = {};
                }

                ZXingWASM.setZXingModuleOverrides({
                    locateFile: (path, prefix) => {
                        if (path.endsWith(".wasm")) {
                            return "/lib/zxing-wasm/reader/zxing_reader.wasm";
                        }
                        return prefix + path;
                    }
                });
            },
            pst_started: function (pstcore, pst) {
                m_pstcore = pstcore;
                m_pst = pst;
            },
            on_restore_app_menu: function (callback) {
                addMenuButton("swMm", "MM").then(() => {
                    swMm.onclick = (evt) => {
                        if(!running){
                            startCamera((res) => {
                                // if(!m_pst){
                                //     return;
                                // }

                                const qr = results[0];
                                console.log("QR Result:", qr);
                            });
                        }else{
                            stopCamera();
                        }
                    };
                });
            },
            event_handler: function (sender, event, new_state) {
            },
        };
        return plugin;
    }
})();
//</script>