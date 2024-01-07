function MPU() {
	var m_callback = null;
	var m_debugoutput_time = Date.now();
	var m_quat = new THREE.Quaternion(0, 0, 0, 1);
	var m_north_diff = 0;
	var m_north = 0;
	
	var FORWARD_ICON = "data:image/png;base64,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";

	var self = {
		// return THREE.Quaternion
		get_quaternion : function() {
			return m_quat.clone();
		},
		get_north : function() {
			return m_north;
		},
		set_attitude : function(pitch, yaw, roll) {
			var quat = new THREE.Quaternion()
				.setFromEuler(new THREE.Euler(THREE.Math.degToRad(pitch), THREE.Math
					.degToRad(yaw), THREE.Math.degToRad(roll), "YXZ"));
			m_quat = quat;
		},
		set_callback : function(callback) {
			m_callback = callback;
		},
		init : function(callback) {
			m_callback = callback;
            if(window.mobsense){ // cordova
                mobsense.getSensorList((data) => {
                    console.log(data);
                }, (error) => {
                    console.log(error);
                });
                
                mobsense.enableSensor("ROTATION_VECTOR", (data) => {
                    console.log(data);
                    mobsense.getState((sensorArray) => {
						var quat;
						if(sensorArray.length == 5){
							quat = new THREE.Quaternion(
	                                sensorArray[0],
	                                sensorArray[2],
	                                -sensorArray[1],
	                                sensorArray[3]);
						}else {
							quat = new THREE.Quaternion()
								.setFromEuler(
									new THREE.Euler(
		                                sensorArray[4],
		                                sensorArray[5],
		                                -sensorArray[3],
										"YXZ"));
						}
						var offset_quat = new THREE.Quaternion()
							.setFromEuler(new THREE.Euler(THREE.Math
								.degToRad(0), THREE.Math
								.degToRad(-window.orientation), THREE.Math
								.degToRad(0), "YXZ"));
						quat = quat.multiply(offset_quat);
						
						m_quat = quat;
                    	if(m_callback){
                    		m_callback(m_quat);
                    	}
                    }, (error) => {
                        console.log(error);
                    });
                }, (error) => {
                    console.log(error);
                });

                return;
            }else if (navigator.devicemotion) {
				var options = {
					frequency : 1000 / 100
				}; // 100fps

				function onSuccess_attitude(attitude) {
					var quat = new THREE.Quaternion()
						.setFromEuler(new THREE.Euler(THREE.Math
							.degToRad(attitude.beta), THREE.Math
							.degToRad(attitude.alpha), THREE.Math
							.degToRad(-attitude.gamma), "YXZ"));
					m_quat = quat;
                	if(m_callback){
                		m_callback(m_quat);
                	}
				}

				function onError_attitude(error) {
					alert('Sensor error: ' + error);
				}

				var watchID_attitude = navigator.devicemotion
					.watchAttitude(onSuccess_attitude, onError_attitude, options);
			} else {
				window
					.addEventListener('deviceorientation', function(attitude) {
						if (attitude['detail']) {
							attitude = attitude['detail'];
						}
						var time = Date.now();
						if (attitude.alpha != null) {
							var quat = new THREE.Quaternion()
								.setFromEuler(new THREE.Euler(THREE.Math
									.degToRad(attitude.beta), THREE.Math
									.degToRad(attitude.alpha), THREE.Math
									.degToRad(-attitude.gamma), "YXZ"));
							var offset_quat = new THREE.Quaternion()
								.setFromEuler(new THREE.Euler(THREE.Math
									.degToRad(0), THREE.Math
									.degToRad(-window.orientation), THREE.Math
									.degToRad(0), "YXZ"));
							quat = quat.multiply(offset_quat);
		
							m_north = -attitude.webkitCompassHeading
								- window.orientation;
							var euler = new THREE.Euler()
								.setFromQuaternion(quat, "YXZ");
							if (Math.abs(euler.x * 180 / Math.PI) < 45
								&& Math.abs(euler.z * 180 / Math.PI) < 45) {
								m_north_diff = euler.y * 180 / Math.PI - m_north;
							}
							var north_diff_quat = new THREE.Quaternion()
								.setFromEuler(new THREE.Euler(THREE.Math
									.degToRad(0), THREE.Math
									.degToRad(-m_north_diff), THREE.Math
									.degToRad(0), "YXZ"));
							quat = north_diff_quat.multiply(quat);
		
							m_quat = quat;
		                	if(m_callback){
		                		m_callback(m_quat);
		                	}
						}
					});
				self.requestDeviceMotionEventPermission();
			}
		},

		requestDeviceMotionEventPermission : function() {
			try{
				if (DeviceMotionEvent 
						&& DeviceMotionEvent.requestPermission
						&& typeof DeviceMotionEvent.requestPermission === 'function') {

					var button = PushButton(FORWARD_ICON, FORWARD_ICON, function(e) {
						switch (e.type) {
							case "up" :
								DeviceMotionEvent.requestPermission().then(response => {
									button.style.display = "none";
								}).catch(console.error);
								break;
						}
					});
					button.setAttribute("style", "position:absolute; bottom:10px; right:10px;");
					document.body.appendChild(button);

				}
			} catch(e) {
			}
		}
	};
	return self;
}