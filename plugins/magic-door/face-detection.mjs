//<script type="module">
const base_path = new URL('.', import.meta.url).href;
const vision_bundle = await import(
  base_path + "@mediapipe/tasks-vision/vision_bundle.js"
);
const { FaceLandmarker, FilesetResolver } = vision_bundle;

let faceLandmarker = null;
let stream = null;
let running = false;
let lastVideoTime = -1;
let lastTs = performance.now();

let smoothYaw = 0;
let smoothPitch = 0;
let smoothRoll = 0;
const alpha = 0.25;

function toDeg(rad) {
    return rad * 180 / Math.PI;
}

function lerp(a, b, t) {
    return a + (b - a) * t;
}

// 4x4行列の回転部分から yaw/pitch/roll を求める
// m は 16要素の配列（row-major想定）
function matrixToEulerDegrees(m) {
    const r00 = m[0], r01 = m[1], r02 = m[2];
    const r10 = m[4], r11 = m[5], r12 = m[6];
    const r20 = m[8], r21 = m[9], r22 = m[10];

    // 一般的な Tait-Bryan angles (YXZ寄りの取り方)
    let yaw = Math.atan2(r02, r22);
    let pitch = Math.asin(-r12);
    let roll = Math.atan2(r10, r11);

    // 画面の見た目に合わせて符号を調整
    yaw = -toDeg(yaw);
    pitch = toDeg(pitch);
    roll = -toDeg(roll);

    return { yaw, pitch, roll };
}

async function initFaceLandmarker() {
    const vision = await FilesetResolver.forVisionTasks(
        base_path + "@mediapipe/tasks-vision/wasm"
    );

    faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
        baseOptions: {
            modelAssetPath:
                base_path + "@mediapipe/models/face_landmarker.task"
        },
        runningMode: "VIDEO",
        numFaces: 1,
        outputFaceBlendshapes: false,
        outputFacialTransformationMatrixes: true,
        minFaceDetectionConfidence: 0.5,
        minFacePresenceConfidence: 0.5,
        minTrackingConfidence: 0.5
    });
}

async function startCamera(callback) {
    if (running) return;

    try {
        if (!faceLandmarker) {
            await initFaceLandmarker();
        }

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
        running = setInterval(() => {
            const now = performance.now();
            const dt = Math.max(1, now - lastTs);
            lastTs = now;

            if (video.readyState >= 2) {
                if (video.currentTime !== lastVideoTime) {
                    lastVideoTime = video.currentTime;

                    const result = faceLandmarker.detectForVideo(video, now);

                    const hasFace =
                        result &&
                        result.faceLandmarks &&
                        result.faceLandmarks.length > 0 &&
                        result.facialTransformationMatrixes &&
                        result.facialTransformationMatrixes.length > 0;

                    if (hasFace) {
                        const landmarks = result.faceLandmarks[0];
                        const mat = result.facialTransformationMatrixes[0].data;
                        const pose = matrixToEulerDegrees(mat);

                        smoothYaw = lerp(smoothYaw, pose.yaw, alpha);
                        smoothPitch = lerp(smoothPitch, pose.pitch, alpha);
                        smoothRoll = lerp(smoothRoll, pose.roll, alpha);
                        //console.log("detected", smoothYaw, smoothPitch, smoothRoll);

                        const nose = result.faceLandmarks[0][1];

                        const DISPLAY_LENGTH = 300;//mm
                        const z_30 = 60;
                        const z_60 = 20;
                        const nz_30 = DISPLAY_LENGTH / 2 / Math.tan(30 / 2 / 180 * Math.PI);
                        const nz_60 = DISPLAY_LENGTH / 2 / Math.tan(60 / 2 / 180 * Math.PI);
                        const z_scale = (nz_30 - nz_60) / (z_30-z_60);
                        const fov = 60;
                        const fov_rad = fov * Math.PI / 180;

                        const W = video.videoWidth;
                        const H = video.videoHeight;

                        const fx = W / (2 * Math.tan(fov_rad / 2));
                        const fy = fx;

                        const nx = (nose.x - 0.5) * W;
                        const ny = -(nose.y - 0.5) * H;
                        let nz = -mat[14] * z_scale;

                        if(-mat[14] > 20){
                            nz = (-mat[14] - z_60) * z_scale + nz_60;
                        }else{
                            nz = -mat[14] * nz_60 / z_60;
                        }

                        const nyaw = Math.atan2(nx, fx);
                        const npitch = Math.atan2(ny, fy);
                        const display_fov = Math.atan2(DISPLAY_LENGTH/2, nz) * 2;

                        console.log(-mat[14], DISPLAY_LENGTH/2, nz, display_fov * 180 / Math.PI);

                        callback({
                            nyaw,
                            npitch,
                            display_fov,
                        });
                    } else {
                        console.log("not detected");
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
    var PLUGIN_NAME = "face_detection";
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
            },
            pst_started: function (pstcore, pst) {
                m_pstcore = pstcore;
                m_pst = pst;
            },
            on_restore_app_menu: function (callback) {
                addMenuButton("swFd", "FD").then(() => {
                    swFd.onclick = (evt) => {
                        if(!running){
                            startCamera((res) => {
                                if(!m_pst){
                                    return;
                                }

                                const pitch_deg = res.npitch * 180 / Math.PI;
                                const yaw_deg = res.nyaw * 180 / Math.PI;
                                const fov_deg = res.display_fov * 180 / Math.PI;

                                //console.log("detected", pitch_deg, yaw_deg, fov_deg);

                                const euler = new THREE.Euler(
                                    THREE.Math.degToRad(-pitch_deg + 90),
                                    THREE.Math.degToRad(-yaw_deg),
                                    0,
                                    "YXZ");
                                const view_quat = new THREE.Quaternion().setFromEuler(euler);
				                //m_plugin_host.set_view_offset(view_quat);
				                m_plugin_host.set_fov(fov_deg);

			                    m_pstcore.pstcore_set_param(m_pst, "renderer", "screen_offset_left", `${-res.nyaw},${res.npitch}`);
			                    m_pstcore.pstcore_set_param(m_pst, "renderer", "screen_offset_right", `${-res.nyaw},${res.npitch}`);
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