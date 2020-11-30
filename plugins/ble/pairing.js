var create_plugin = (function() {
	var m_plugin_host = null;
	var m_host = false;
	var m_initializePeripheral_result = null;
	var m_permanent_options = null;
	//var BLE_SERVICE_UUID = "F3AEC952-823F-4FF9-A8B1-507DA47E317D";
	//var BLE_SERVICE_UUID = "00001234-0000-1000-8000-00805f9b34fb";
	var BLE_SERVICE_UUID = "0360";
	var BLE_CHARACTERISTIC_PUBLIC_KEY = "0000";
	var BLE_CHARACTERISTIC_MSG = "0001";
	var m_pairing_key = null;
	var m_public_key = null;
	var m_private_key = null;
	var m_derive_map = {};
	var m_response = "";
	var m_host_applink = "";
	

	function keyGen() {
		const ec = {
			name: "ECDH",
			namedCurve: "P-256", //can be "P-256", "P-384", or "P-521"
		};
		const usage = ["deriveKey"];

		return crypto.subtle.generateKey(ec, true, usage);
	}

	async function keyExport(key, isPub) {
		const encode = isPub ? "spki" : "pkcs8";

		return new Uint8Array(await crypto.subtle.exportKey(encode, key));
	}

	function keyImport(key, isPub) {
		const encode = isPub ? "spki" : "pkcs8";
		const ec = {
			name: "ECDH",
			namedCurve: "P-256"
		};
		const usage = isPub ? [] : ["deriveKey"];

		return crypto.subtle.importKey(encode, key, ec, false, usage);
	}

	function keyDerive(pub, priv) {
		const aes = {
			name: "AES-GCM",
			length: 256
		};
		const ec = {
			name: "ECDH",
			public: pub
		};
		const usage = ["encrypt", "decrypt"];

		return crypto.subtle.deriveKey(ec, priv, aes, false, usage);
	}

	async function aesEncrypt(key, data) {
		const aes = {
			name: "AES-GCM",
			iv: crypto.getRandomValues(new Uint8Array(16)),
			tagLength: 128
		};

		const result = await crypto.subtle.encrypt(aes, key, data);

		const buffer = new Uint8Array(aes.iv.byteLength + result.byteLength);
		buffer.set(aes.iv, 0);
		buffer.set(new Uint8Array(result), aes.iv.byteLength);

		return buffer;
	}

	async function aesDecrypt(key, data) {
		const aes = {
			name: "AES-GCM",
			iv: data.subarray(0, 16),
			tagLength: 128
		};

		return new Uint8Array(await crypto.subtle.decrypt(aes, key, data.subarray(
			16)));
	}

	async function init_permanent_options() {
		try {
			m_permanent_options = JSON.parse(localStorage.getItem('pairing_options')) || {};
		} catch (e) {
			m_permanent_options = {};
		}
		if (m_permanent_options['crypto_key']) {
			m_public_key = await keyImport(
					window.bluetoothle.encodedStringToBytes(
							m_permanent_options['crypto_key'].public_key), true);
			m_private_key = await keyImport(
					window.bluetoothle.encodedStringToBytes(
							m_permanent_options['crypto_key'].private_key), false);
		} else {
			var key_pair = await keyGen();
			m_public_key = key_pair.publicKey;
			m_private_key = key_pair.privateKey;
			m_permanent_options['crypto_key'] = {
				public_key: window.bluetoothle.bytesToEncodedString(
						await keyExport(m_public_key, true)),
				private_key: window.bluetoothle.bytesToEncodedString(
						await keyExport(m_private_key, false)),
			}
			save_permanent_options();
		}
	}

	function save_permanent_options() {
		localStorage.setItem('pairing_options', JSON.stringify(m_permanent_options));
	}

	function initialize() {
		function _initialize(callback) {
			getAdapterInfo().then((result) => {
				if (!result.isInitialized) {
					var params = {
						//					  "request": true,
						//					  "restoreKey": "pviewer_ble"
					};
					window.bluetoothle.initialize((result) => {
						_initialize(callback);
					}, params);
				} else if (result.isScanning) {
					window.bluetoothle.stopScan((result) => {
						_initialize(callback);
					}, params);
				} else {
					callback(result);
				}
			});
		}
		return new Promise((resolve) => {
			_initialize(resolve);
		});
	}

	function initializePeripheral(read_callback, write_callback) {
		function _initializePeripheral(callback) {
			var params = {
				//			  "request": true,
				//			  "restoreKey": "pviewer_ble"
			};
			window.bluetoothle.initializePeripheral((result) => {
				switch (result.status) {
					case "enabled":
						m_initializePeripheral_result = result;
						callback(result);
						break;
					case "connected":
						console.log("connected:", JSON.stringify(result));
						break;
					case "writeRequested":
						write_callback(result);
						break;
					case "readRequested":
						read_callback(result);
						break;
				}
			}, params);
		}
		return new Promise((resolve) => {
			if (m_initializePeripheral_result) {
				resolve(m_initializePeripheral_result);
				return;
			}
			if (window.cordova.platformId === "android") {
				initialize().then((result) => {
					setTimeout(() => {
						_initializePeripheral(resolve);
					}, 1000);
				});
			} else {
				_initializePeripheral(resolve);
			}
		});
	}

	function getAdapterInfo() {
		return new Promise((resolve, reject) => {
			window.bluetoothle.isInitialized((result1) => {
				window.bluetoothle.isEnabled((result2) => {
					window.bluetoothle.isScanning((result3) => {
						var result = {
							isInitialized: result1.isInitialized,
							isEnabled: result2.isEnabled,
							isScanning: result3.isScanning,
						};
						resolve(result);
					});
				});
			});
		});
	}

	function startScan(callback) {
		return new Promise((resolve, reject) => {
			var params = {
				"services": [BLE_SERVICE_UUID]
			}
			window.bluetoothle.startScan((result) => {
				switch (result.status) {
					case "scanStarted":
						resolve(result);
						break;
					case "scanResult":
						callback(result);
				}
			}, (err) => {
				reject(err);
			}, params);
		});
	}

	function stopScan() {
		return new Promise((resolve, reject) => {
			window.bluetoothle.isScanning((result1) => {
				if (result1.isScanning == false) {
					resolve(result1);
				} else {
					window.bluetoothle.stopScan((result2) => {
						switch (result2.status) {
							case "scanStopped":
								resolve(result2);
								break;
						}
					}, (err) => {
						reject(err);
					});
				}
			});
		});
	}

	function addService() {
		return new Promise((resolve, reject) => {
			var params = {
				service: BLE_SERVICE_UUID,
				characteristics: [{
					uuid: BLE_CHARACTERISTIC_PUBLIC_KEY,
					permissions: {
						read: true,
						write: true,
						//readEncryptionRequired: true,
						//writeEncryptionRequired: true,
					},
					properties: {
						read: true,
						writeWithoutResponse: true,
						write: true,
						notify: true,
						indicate: true,
						//authenticatedSignedWrites: true,
						//notifyEncryptionRequired: true,
						//indicateEncryptionRequired: true,
					}
				},{
					uuid: BLE_CHARACTERISTIC_MSG,
					permissions: {
						read: true,
						write: true,
						//readEncryptionRequired: true,
						//writeEncryptionRequired: true,
					},
					properties: {
						read: true,
						writeWithoutResponse: true,
						write: true,
						notify: true,
						indicate: true,
						//authenticatedSignedWrites: true,
						//notifyEncryptionRequired: true,
						//indicateEncryptionRequired: true,
					}
				}]
			};
			setTimeout(() => {
				window.bluetoothle.addService((result) => {
					resolve(result);
				}, (err) => {
					reject(err);
				}, params);
			}, 1000);
		});
	}

	function startAdvertising() {
		return new Promise((resolve, reject) => {
			var params;
			if (window.cordova.platformId === "android") {
				params = {
					"name": "PViewer",
					"service": BLE_SERVICE_UUID,
					"timeout": 180000
				};
			} else {
				params = {
					"name": "PViewer",
					"services": [BLE_SERVICE_UUID],
				};
			}
			setTimeout(() => {
				window.bluetoothle.startAdvertising((result) => {
					resolve(result);
				}, (err) => {
					reject(err);
				}, params);
			}, 1000);
		});
	}

	function stopAdvertising() {
		return new Promise((resolve, reject) => {
			window.bluetoothle.isAdvertising((result1) => {
				if (result1.isAdvertising == false) {
					resolve(result1);
				} else {
					window.bluetoothle.stopAdvertising((result2) => {
						switch (result2.status) {
							case "advertisingStopped":
								resolve(result2);
								break;
						}
					}, (err) => {
						reject(err);
					});
				}
			});
		});
	}

	function connect(address) {
		return new Promise((resolve, reject) => {
			var params = {
				address: address,
			};
			window.bluetoothle.isConnected((result1) => {
				if (result1.isConnected) {
					resolve(result1);
				} else {
					window.bluetoothle.close((result2) => {
						window.bluetoothle.connect((result3) => {
							resolve(result3);
						}, (err) => {
							reject(err);
						}, params);
					}, (err) => {
						reject(err);
					}, params);
				}
			}, (err) => {
				window.bluetoothle.connect((result2) => {
					//clearTimeout(timer);
					resolve(result2);
				}, (err) => {
					reject(err);
				}, params);
			}, params);
		});
	}

	function discover(address) {
		return new Promise((resolve, reject) => {
			var params = {
				address: address,
			};
			window.bluetoothle.discover((result) => {
				resolve(result);
			}, (err) => {
				reject(err);
			}, params);
		});
	}

	function write(address, chara, bytes) {
		return new Promise((resolve, reject) => {
			var params = {
				address: address,
				service: BLE_SERVICE_UUID,
				characteristic: chara,
				value: window.bluetoothle.bytesToEncodedString(bytes),
			};
			window.bluetoothle.write((result) => {
				resolve(result);
			}, (err) => {
				reject(err);
			}, params);
		});
	}

	function read(address, chara) {
		return new Promise((resolve, reject) => {
			var params = {
				address: address,
				service: BLE_SERVICE_UUID,
				characteristic: chara,
			};
			window.bluetoothle.read((result) => {
				result.bytes = window.bluetoothle.encodedStringToBytes(result.value);
				resolve(result);
			}, (err) => {
				reject(err);
			}, params);
		});
	}

	function respond(req, bytes) {
		return new Promise((resolve, reject) => {
			var params = {
				requestId: req.requestId,
				address: req.address,
			};
			if(bytes){
				params.value = bluetoothle.bytesToEncodedString(bytes);
			}
			window.bluetoothle.respond((result) => {
				resolve(result);
			}, (err) => {
				reject(err);
			}, params);
		});
	}

	function addMenuSwitch(name, txt, callback) {
		var onsListItem = document.createElement("ons-list-item");
		onsListItem.innerHTML =
			'<ons-row align="center">' +
			'<ons-col id="' + name + '_txt">' + txt + '</ons-col>' +
			'<ons-col align="right" valign="center">' +
			'<ons-switch var="' + name + '" />' +
			'</ons-col>' +
			'</ons-row>';
		menu_list.insertBefore(onsListItem, menu_list_about);
		ons.compile(onsListItem);
		setTimeout(() => {
			callback();
		}, 0);
	}
	
	function connectDevice(address, key_required){
		connect(address).then((result) => {
			console.log(JSON.stringify(result));
			return discover(result.address);
		}).then((result) => {
			console.log(JSON.stringify(result));
			var msg = {
				public_key: m_permanent_options['crypto_key'].public_key,
			};
			if(key_required){
				var key = window.prompt("pairing key");
				if (!key) {
					throw "no pairing key";
				}
				msg.pairing_key = key;
			}
			var bytes = bluetoothle.stringToBytes(JSON.stringify(msg));
			return write(result.address, BLE_CHARACTERISTIC_PUBLIC_KEY, bytes);
		}).then((result) => {
			console.log(JSON.stringify(result));
			return read(result.address, BLE_CHARACTERISTIC_PUBLIC_KEY);
		}).then(async (result) => {
			console.log(JSON.stringify(result.bytes));
			var public_key_exp = window.bluetoothle.bytesToString(result.bytes);
			var public_key = await keyImport(
					window.bluetoothle.encodedStringToBytes(public_key_exp), true);
			var derive_key = await keyDerive(public_key, m_private_key);
			m_derive_map[result.address] = derive_key;
			var bonds = m_permanent_options['bonds'] || [];
			bonds.push(public_key_exp);
			m_permanent_options['bonds'] = bonds;
			save_permanent_options();

			var msg = {
				cmd: "init",
			};
			var bytes = bluetoothle.stringToBytes(JSON.stringify(msg));
			var bytes_enc = await aesEncrypt(m_derive_map[result.address], bytes);
			return write(result.address, BLE_CHARACTERISTIC_MSG, bytes_enc);
		}).then((result) => {
			console.log(JSON.stringify(result));
		}).catch((err) => {
			console.log("error:", JSON.stringify(err));
			alert(JSON.stringify(err));
		});
	}
	
	async function readDevice(req){
		switch (req.characteristic) {
		case BLE_CHARACTERISTIC_PUBLIC_KEY:
			var bytes = bluetoothle.stringToBytes(m_permanent_options['crypto_key'].public_key);
			respond(req, bytes).then(() => {
			}).catch((err) => {
				console.log("error:", JSON.stringify(err));
				alert(JSON.stringify(err));
			});
			break;
		case BLE_CHARACTERISTIC_MSG:
			if (m_derive_map[req.address]) {
				var bytes = await aesEncrypt(m_derive_map[req.address], m_response);
				respond(req, bytes).then(() => {
				}).catch((err) => {
					console.log("error:", JSON.stringify(err));
					alert(JSON.stringify(err));
				});
			}
			break;
		}
	}
	
	async function writeDevice(req){
		var bytes = window.bluetoothle.encodedStringToBytes(req.value);
		switch (req.characteristic) {
		case BLE_CHARACTERISTIC_PUBLIC_KEY:
			var _msg = window.bluetoothle.bytesToString(bytes);
			var msg = JSON.parse(_msg);
			if (m_pairing_key) { //pass first responder
				if (msg.pairing_key == m_pairing_key) {
					var public_key = await keyImport(
							window.bluetoothle.encodedStringToBytes(msg.public_key), true);
					var derive_key = await keyDerive(public_key,
						m_private_key);
					m_derive_map[req.address] = derive_key;
					var bonds = [];
					bonds[0] = msg.public_key;
					m_permanent_options['bonds'] = bonds;
					save_permanent_options();
				}
				m_pairing_key = null; //pass first responder
			} else {
				if (m_permanent_options['bonds'].indexOf(msg.public_key) >= 0){
					var public_key = await keyImport(
							window.bluetoothle.encodedStringToBytes(msg.public_key), true);
					var derive_key = await keyDerive(public_key,
						m_private_key);
					m_derive_map[req.address] = derive_key;
				}
			}
			respond(req, null).then(() => {
			}).catch((err) => {
				console.log("error:", JSON.stringify(err));
				alert(JSON.stringify(err));
			});
			break;
		case BLE_CHARACTERISTIC_MSG:
			if (m_derive_map[req.address]) {
				var bytes_dec = await aesDecrypt(m_derive_map[req.address], bytes);
				var msg = bluetoothle.bytesToString(bytes_dec);
				console.log(msg);
				messageHandler(msg);
			}
			respond(req, null).then(() => {
			}).catch((err) => {
				console.log("error:", JSON.stringify(err));
				alert(JSON.stringify(err));
			});
			break;
		}
	}
	
	function startNewPairingCentral(){
		initialize().then((result) => {
			return startScan((result) => {
				console.log(result.address + ":" + JSON.stringify(result.advertisement));
				connectDevice(result.address, true);
			});
		}).then((result) => {
			console.log(JSON.stringify(result));
		}).catch((err) => {
			console.log("error:", JSON.stringify(err));
			alert(JSON.stringify(err));
		});
	}
	
	function startNewPairingPeripheral(){
		m_pairing_key = ('0000' + Math.floor(Math.random() * 10001)).slice(-4);
		initializePeripheral(readDevice, writeDevice).then((result) => {
			return addService();
		}).then((result) => {
			return startAdvertising();
		}).then((result) => {
			console.log(JSON.stringify(result));
			app.alert(m_pairing_key, 'pairing key');
		}).catch((err) => {
			console.log("error:", JSON.stringify(err));
			alert(JSON.stringify(err));
		});
	}
	
	function startRestorePairingCentral(){
		initialize().then((result) => {
			return startScan((result) => {
				console.log(result.address + ":" + JSON.stringify(result.advertisement));
				connectDevice(result.address, false);
			});
		}).then((result) => {
			console.log(JSON.stringify(result));
		}).catch((err) => {
			console.log("error:", JSON.stringify(err));
			alert(JSON.stringify(err));
		});
	}
	
	function startRestorePairingPeripheral(){
		initializePeripheral(readDevice, writeDevice).then((result) => {
			return addService();
		}).then((result) => {
			return startAdvertising();
		}).then((result) => {
			console.log(JSON.stringify(result));
		}).catch((err) => {
			console.log("error:", JSON.stringify(err));
			alert(JSON.stringify(err));
		});
	}
	
	function stopPairingCentral(){
		m_derive_map = {};
		m_permanent_options['bonds'] = [];
		save_permanent_options();
		
		stopScan().then((result) => {
			return;
		}).catch((err) => {
			console.log("error:", JSON.stringify(err));
			alert(JSON.stringify(err));
		});
	}
	
	function stopPairingPeripheral(){
		m_derive_map = {};
		m_permanent_options['bonds'] = [];
		save_permanent_options();
		
		stopAdvertising().then((result) => {
			return;
		}).catch((err) => {
			console.log("error:", JSON.stringify(err));
			alert(JSON.stringify(err));
		});
	}
	
	function messageHandler(_msg){
		try{
			var msg = JSON.parse(_msg);
			switch(msg.cmd){
			case "init":
				break;
			case "status":
				if(m_host_applink != msg.host_applink){
					m_host_applink = msg.host_applink;
					app.open_applink(m_host_applink);
				}
				break;
			}
		}catch(err){
			console.log("error:", JSON.stringify(err));
		}
	}

	return function(plugin_host) {
		//debugger;
		m_plugin_host = plugin_host;

		var plugin = {
			init_options: async function(options) {
				if (!window.bluetoothle) {
					return;
				}
				await init_permanent_options();
				m_host = m_permanent_options["host"] || false;
				var restore_pairing = false;
				if(m_permanent_options['bonds'] && m_permanent_options['bonds'].length != 0){
					restore_pairing = true;
					if (m_host) { //central
						startRestorePairingCentral();
					} else { //peripheral
						startRestorePairingPeripheral();
					}
				}
				{ //poling
					setInterval(async () => {
						var remove_candidate = [];
						var num = 0;
						for(var address in m_derive_map){
							num++;
							if(m_host){
								var msg = {
									cmd: "status",
									host_applink: app.get_applink(),
								};
								var bytes = bluetoothle.stringToBytes(JSON.stringify(msg));
								var bytes_enc = await aesEncrypt(m_derive_map[address], bytes);
								await write(address, BLE_CHARACTERISTIC_MSG, bytes_enc).then((result) => {
									
								}).catch((err) => {
									remove_candidate.push(address);
								});
							}
						}
						for(var address of remove_candidate){
							delete m_derive_map[address];
							connectDevice(address, false);
						}
						$('#swParing_txt').html("Pairing:" + num);
					}, 1000);
				}
				addMenuSwitch("swHost", "Host", () => {
					swHost.setChecked(m_host);
					swHost.on("change", (evt) => {
						m_permanent_options["host"] = evt.value;
						save_permanent_options();
					});
				});
				addMenuSwitch("swParing", "Paring", () => {
					swParing.setChecked(restore_pairing);
					swParing.on("change", (evt) => {
						if (evt.value) {
							if (m_host) { //central
								startNewPairingCentral();
							} else { //peripheral
								startNewPairingPeripheral();
							}
						} else { //pairing off
							if (m_host) {
								stopPairingCentral();
							} else {
								stopPairingPeripheral();
							}
						}
					});
				});
			},
			event_handler: function(sender, event) {},
		};
		return plugin;
	}
})();
