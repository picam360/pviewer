var create_plugin = (function() {
	var m_plugin_host = null;
	var m_pst = null;
	var m_pstcore = null;
	var m_pvf_chcker = null;
	var m_st_pts = 0;
	var m_et_pts = 0;
	var m_cur_pts = 0;

	var m_timebox = null;
	var m_slider = null;

	var m_play_button = null;
	var PAUSE_ICON = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAACXBIWXMAAAsTAAALEwEAmpwYAAAFBUlEQVR4nO2Z2VNaZxjGz2jtjMZoFDcUUAGNe0SbTvuHZNpp/5B2csONwRU3JIDGaFxSi8XUNcYlmelNN40bRlZlFYRzwJpcSG/ezkcDmQE753yCkM74zHDDufk9H+/7fu95IIhrXetaMeueGlJFq9SXjSu++3deUJr6ZWq/4Tnpq1sk/65d8KKPr3beo62e82iqZz33q2bdXxBiSCGSrc+WKW7jqq9NtOJ3NK744M4LHzQsU9DwnIL6JQrqFkmoWyChdt4LNXNeqJ71QvXPHqh65oHbM257hcbdKtSQnISDN/5ylt+05lOJ1nwB0aof8OFPoFJzApU/nYBw2h0QqF2KyklnXkLgm9dPvxGt+yjRmh9iha+YdoNQ7Qbhjy7g/+Ai+VOur68OfAPSmtdPh5rW/RBveMFU0ACUPz2G8gmnslm1kRZf+DlnRtNL/9KVw08eQ9mEE3jjzkW2ypkRH/gNSEskfOm4E0rHnMAbsa/WqLWfxm4gEWUzGQE/6gDuiAM4j22KmOCbXp5+mzx4O3CG7VA8ZP3qUvB3V/9iidZ83mTClzyyAXvQSrFVlxix/8755MIXDyEDNmArLXIs+PpXJAfnkqqacUHlhBEqxnQgfHIAgjEDVKqPw/CCp3YoG9ZB6eA+8FRaKB08gLIxGzN4lRUKFdYAW2XmMTYQXA8wTh7Bb7rfQUh/ut4Bf1QfPnkEv+H68PwP51vgKt8wgi9SIgMWKJBbWpnRiyFFtOK345RNxZMDiFT5o/1w2ZSqtFHPufJdxvCFDy1QMHDkINSQSsv/fqvEqnnh6JtoA0PacM3zlHtRzzmyHebwcgvkDxxBbr/5c/ryCa7EeA0rGIk2UDaoDTcsTxFtoES2gwWfJzsCVr/5e1oDDcvUDO60ETyONoDKJjRtuA93o54X929jwef1HwKr93Ca1kD9MqnFHZX84f0oQFQ2oVF5oYG+bTz4vkPI7T3cpf8FlkgKd86jho0yoNgLz3nUsJFi927hwkNOj9lL/wsskQHcSwo1bKTQqYfmPGrYSBX1bOHCQ47UfE5roG7RG8C9YVHDXmjg/ZxHDRupwu4tPPhuM9zqMjEwMO+lcNcDujmPGjbKgPQ1HrzUBNmdJvoSQukB7m5DN+dRw0aqoOs1HnyXCbI6jPRNXDPrmcFdzOjmPGrYSOV3bmLBZ3ea4GaHkX6MotwGd6ukm/OoYaMMdGxiwWd1GCGz3fAdrQEUOuGuxHRzHjVspPLaN7Hgb7YbIV2iu8tombutObHh7PN0cx41bKRYbZtY8JlteivjNA8lZjgvIxz5PvzueBuG+81+BkV9e+E5X9C9G/wupF9tZ8Dq2MaAN8CNVoOEYCoU96HEjPGb1LAVimXaYNmgkw/CK48+zHm5GfKlO8GyQScfhO81MobPlOjP01v0JQSOUNwX02sg7iUl/Q/4VgNkPDDICFzVqG25/CmX9yOAJzPFusvlpiirTCb8DYkB0lt094hYhLLKZMFntOgHiJilhlTeuONZwk/+gW6BEL/6JHYDBEGgoJU76lhMYNnME+I4hbshocgbZZUJKRtxnE7+IqGssnjI6o37tJHoPTE3LGMTMgcLxX2FSut5zPAS/Tma81libS6RaOUqbCUoMcsfsNjw4fU2tB5g37BXIjGkoNAJ5TYo+kDpQU6PicrpNgduSU2B7E4jldVp3EH7PFqJg1vlx/A367WuRfz/9Q+l5/7vsBoxewAAAABJRU5ErkJggg==";
	var PLAY_ICON = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAACXBIWXMAAAsTAAALEwEAmpwYAAAFAUlEQVR4nO2ZWU8bZxiFR1AqQQiE1ZjF7JgdDE3V/pAoVStFahvlL7TKjW9YEggJwTa2cYLTAi01MZSdsCRSr7nBmMXj3dgstsfQqKkwqnqqj5QqjUhmsTGtxJF8/5xv3nm/M8cUdaELXShiXTMgXrbAfNo4H7rd8Iwx1s0xa/WzwVDtdPCoZipAfqGaSb+5asJvrBr3364c3/2EkiOOOm99NMcUNC6E7sjm972N8yE0PAuhfo5B/SyDuhkGtdNB1E4FUTMZQPVEAFXjAVT97EflmB/S0d2tcuNue5kxmB9z8MZfXmY1LYa0ssVQWLawD/7we6gw7qHi6R7KRnbDpYYddcWQLzMm8M1LB5/LlkKMbHEfkcKXj+yizLCLsp92UPLjTrBkeOezswNfRkLz0oGuaWkf0YYvHT42gOIftlE86NM0a5cTogs/4Utqer4/c+bwQ9soGvRBMuCbFmt9SdGBX0ZCLOELB3wo/N4HiX5rodpg/jByA7EYm6G34J94UaD3Ir/fo44Ivun5wRfnB7+F/MdbyNW5rwuCv7rwa4ZsMRQ4T/i8Rx6I+9yMWCtgxb7e8zzhx/YgfepDxYgvKvC5OmLAA7HGpeIFX/cimC/kkpIOu3Br3okbsw6UDdhRbtiOHF7rhkjtDou1dglnA8fxQMDYlH23gfAff4Jo1MJANrCJ0kF3RPA5GmLAhWyVq50bvRxxsvn9LSEzX6pfx5sK/H6EW3MOFPXbUDzkFQwv6nUhW+n0UgbEs/L/nSoFvbCl/f82cKIpawgN+jUU6p3C4FUuZCmdSO+xf8w+PseRWNi2KXm8dqqB46fx6gg3p+2Q9NGQ6D284TMVTmT02L9lNVA/x4wKXZXFj95t4ESTlhDqdGbkae284DN7HMjodoywGqibC5qF7vlinRlc5H91hK8nbMhVbiC3z8UN/qED6d0OE/sTmAkyQi+poj5uBk40scmgSr0Kca+dCzzSHtgD7E9gJhgWesMWavkZINp+GYZUtQpRr5MNHmld9kNWA7XTgbDQeCDRrEKIgQqlCSKV8/3w9+24cs/GwcBkgBGabSRqfgbGNxhIlSsQKWzs8F02pHba2EeItAdCg1lBr4kTuP+3I3w5SiO7ew0ilYMb/D0bUjqs7C9x9bh/VGiq5GKAnHql0oTsHpp95t+AT+204XKHlX2Nkt5GaCQuUJnee+pfjdEQPVyHqNfBGz6lw4rku/Q3rAZI6SQ0z+crVk4/dbIuVSaIFFYuqxKnwV++a0Vi2+ZVTmFOatzzCMnzeW8ZOJ71MStyetaRo3ZGBJ98x+Lm3OaRxkzIx0huz8o/cXpkLQhprwk5SivXSwrvhqdxqZ1uo7iK1H2kMeP7MZKnpnFjzIrrIzRyFBsQa5xRgU9usxwmtljyKD4idR/vLymdG2KN4/WPW7YBK3w7jaRWWkHxVbXBk14yvBOI9EsqCvDBZPmmsN6UdJXnCX+pjUZiy+Y1KhKRrvK84JNaLEoqYhkQLxnwjsX85Fs3pyj5iw8iN0BRFClaC554p2M4NpOUPErl7olI5U26ypiMjTxKJ3+aSFeZq3MHor5t2iz+iF9YziYU3gxS94k07sNoXFJJrbQiRW5Op2KtdLUnjzRmWUqXR0C28ZB4wPuGPRPJEUdKJ9LbkOqDtAdpD2xM2n17+EqXLZzaaWVSOq0rJM+TSHycKv8Lf7Ne6ELU/19/AYeLBvUYIigCAAAAAElFTkSuQmCC";

	function create_button(src_normal, src_pushed, callback) {
		var button = document.createElement("img");
		button.src = src_normal;
		button.src_normal = src_normal;
		button.src_pushed = src_pushed;
		button.down = false;
		button.set_src = function(src_normal, src_pushed) {
			button.src_normal = src_normal;
			button.src_pushed = src_pushed;
			button.src = (!button.down ? src_normal : src_pushed);
		}

		var mousedownFunc = function(ev) {
			if (callback) {
				callback({
					type : "down",
					caller : button,
				});
			}

			button.down = true;
			if (button.src_pushed) {
				button.src = button.src_pushed;
			}
		}
		button.mouseupFunc = function() {
			if (callback) {
				callback({
					type : "up",
					caller : button,
				});
			}

			button.down = false;
			button.src = button.src_normal;
		}
		button.mousemoveFunc = function(ev) {
			if (ev.type == "touchmove") {
				ev.clientX = ev.pageX;
				ev.clientY = ev.pageY;
				ev.button = 0;
			}
			if (!button.down || ev.button != 0) {
				return;
			}
			ev.preventDefault();
			ev.stopPropagation();
		}
		var preventFunc = function(ev) {
			ev.preventDefault();
			ev.stopPropagation();
		}
		button.addEventListener("touchstart", mousedownFunc);
		button.addEventListener("mousedown", mousedownFunc);
		button.addEventListener("dragstart", preventFunc, {
			passive : false
		});

		var mouseupFunc = function(ev) {
			if (button.down) {
				button.mouseupFunc(ev);
			}
		}
		var mousemoveFunc = function(ev) {
			if (button.down) {
				button.mousemoveFunc(ev);
			}
		}

		// addEventListener spec migration
		var supportsPassive = false;
		try {
			var opts = Object.defineProperty({}, 'passive', {
				get : function() {
					supportsPassive = true;
				}
			});
			window.addEventListener("test", null, opts);
		} catch (e) {
		}
		document.addEventListener("touchend", mouseupFunc);
		document.addEventListener("mouseup", mouseupFunc);
		document.addEventListener("touchmove", mousemoveFunc, supportsPassive
			? {
				passive : false,
				capture : true
			}
			: true);
		document.addEventListener("mousemove", mousemoveFunc, supportsPassive
			? {
				passive : false,
				capture : true
			}
			: true);

		return button;
	}

	var startTimer = function() {
		if(m_slider.timer) {
			clearTimeout(m_slider.timer);
		}
		m_slider.timer = setTimeout(() => {
			if(app.navi && app.navi.getCurrentPage().name == 'main.html'){
				m_slider.style.visibility = 'hidden';
				m_timebox.style.visibility = 'hidden';
				m_play_button.style.visibility = 'hidden';
			}
			m_slider.timer = null;
		}, 3000);
	}
	var mousedownFunc = function(ev) {
		if(app.navi && app.navi.getCurrentPage().name == 'main.html'){
			m_slider.style.visibility = 'visible';
			m_timebox.style.visibility = 'visible';
			m_play_button.style.visibility = 'visible';
		}
		startTimer();
	};
	var mousemoveFunc = function(ev) {
		if (ev.clientY > m_slider.offsetTop) { // title bar
			mousedownFunc(ev);
		}
	};
	var keydownFun = function (ev) {
		switch(ev.code){
		case "ArrowLeft":
			if(m_pst){
				m_pstcore.pstcore_set_param(m_pst, "pvf_loader", "skip", "-30");
			}
			break;
		case "ArrowRight":
			if(m_pst){
				m_pstcore.pstcore_set_param(m_pst, "pvf_loader", "skip", "30");
			}
			break;
		}
	};

	function on_pvf_started() {
		m_play_button = create_button(PAUSE_ICON, PAUSE_ICON, function(
			e) {
			switch (e.type) {
				case "up" :
					if(m_play_button.pause){
						m_pstcore.pstcore_set_param(m_pst, "pvf_loader", "pause", "0");
						m_play_button.pause = false;
						m_play_button.src_normal = PAUSE_ICON;
						m_play_button.src_pushed = PAUSE_ICON;
					}else{
						m_pstcore.pstcore_set_param(m_pst, "pvf_loader", "pause", "1");
						m_play_button.pause = true;
						m_play_button.src_normal = PLAY_ICON;
						m_play_button.src_pushed = PLAY_ICON;
					}
					break;
			}
		});
		m_play_button.setAttribute("style", `position:absolute; bottom:60px; left:5px; width:50px; height:50px;`);
		document.body.appendChild(m_play_button);

		m_timebox = document.createElement("p");
		m_timebox.innerHTML = "00:00:00/00:00:00";
		m_timebox.setAttribute("style", "position:absolute; bottom:60px; right:10px; font-size: 16px; font-weight: bold; color:#FFF; text-stroke: 1px #000; -webkit-text-stroke: 1px #000;");
		document.body.appendChild(m_timebox);

		m_slider = document.createElement("input");
		m_slider.id = "play_control_slider";
		m_slider.type = "range";
		m_slider.min = "0";
		m_slider.max = "1000";//permil
		m_slider.value = "0";
		m_slider.addEventListener("change", (e) => {
			var pts = (m_et_pts - m_st_pts) * m_slider.value / 1000;
			m_pstcore.pstcore_set_param(m_pst, "pvf_loader", "pts", pts.toString());
		});
		m_slider.setAttribute("style", "position:absolute; bottom:75px;");
		m_slider.resize_fnc = () => {
			m_slider.style.left = (m_play_button.offsetWidth + 10) + "px";
			m_slider.style.width = (window.innerWidth - (m_play_button.offsetWidth + 10) - (m_timebox.offsetWidth + 20)) + "px";
		};
		m_slider.resize_fnc();
		window.addEventListener('resize', m_slider.resize_fnc, false);
		document.body.appendChild(m_slider);


		m_slider.update_interval = setInterval(() => {
			get_pts((st_pts, et_pts, cur_pts) => {
				m_st_pts = st_pts;
				m_et_pts = et_pts;
				m_cur_pts = cur_pts;
				m_slider.value = (m_cur_pts - m_st_pts) / (m_et_pts - m_st_pts) * 1000;

				var et_s = parseInt(m_et_pts - m_st_pts);
				var et_m = parseInt(et_s/60);
				var et_h = parseInt(et_m/60);
				var et_s2 = ('00' + et_s%60).slice(-2);
				var et_m2 = ('00' + et_m%60).slice(-2);
				var et_h2 = ('00' + et_h%24).slice(-2);
	
				var ct_s = parseInt(m_cur_pts - m_st_pts);
				var ct_m = parseInt(ct_s/60);
				var ct_h = parseInt(ct_m/60);
				var ct_s2 = ('00' + ct_s%60).slice(-2);
				var ct_m2 = ('00' + ct_m%60).slice(-2);
				var ct_h2 = ('00' + ct_h%24).slice(-2);
	
				m_timebox.innerHTML = `${ct_h2}:${ct_m2}:${ct_s2}/${et_h2}:${et_m2}:${et_s2}`;
			});
		}, 1000);

		startTimer();
		document.addEventListener('keydown', keydownFun);
		document.addEventListener("touchstart", mousedownFunc);
		document.addEventListener("mousedown", mousedownFunc);
		document.addEventListener("mousemove", mousemoveFunc);
	}

	function get_pts(callback) {
		var name = "pvf_loader";
		m_pstcore.pstcore_get_param(m_pst, name, "src_st_pts", (value) => {
			var st_pts = parseFloat(value);
			m_pstcore.pstcore_get_param(m_pst, name, "src_et_pts", (value) => {
				var et_pts = parseFloat(value);
				m_pstcore.pstcore_get_param(m_pst, name, "cur_pts", (value) => {
					var cur_pts = parseFloat(value);
					callback(st_pts, et_pts, cur_pts);
				});
			});
		});
	}

	function on_pst_started() {
		m_pvf_chcker = setInterval(() => {
			get_pts((st_pts, et_pts, cur_pts) => {
				if(!isNaN(st_pts) && !isNaN(et_pts) && !isNaN(cur_pts)){
					m_st_pts = st_pts;
					m_et_pts = et_pts;
					m_cur_pts = cur_pts;
					clearInterval(m_pvf_chcker);
					on_pvf_started();
				}
			});
		}, 1000);
	}
	function on_pst_stopped() {
		if(m_slider){
			clearInterval(m_pvf_chcker);

			document.body.removeChild(m_play_button);
			document.body.removeChild(m_timebox);

			clearTimeout(m_slider.timer);
			clearInterval(m_slider.update_interval);
			window.removeEventListener('resize', m_slider.resize_fnc);
			document.body.removeChild(m_slider);
	
			document.removeEventListener("keydown", mousedownFunc);
			document.removeEventListener("touchstart", mousedownFunc);
			document.removeEventListener("mousedown", mousedownFunc);
			document.removeEventListener("mousemove", mousemoveFunc);

			m_slider = null;
		}
	}
	return function(plugin_host) {
		m_plugin_host = plugin_host;
		var plugin = {
			pstcore_initialized : (pstcore) => {
				m_pstcore = pstcore;
			},
			pst_started : function(pstcore, pst) {
				m_pst = pst;
				on_pst_started();
			},
			pst_stopped : function(pstcore, pst) {
				m_pst = null;
				on_pst_stopped();
			},
			on_restore_app_menu : function(callback) {
				console.log("play control");
			},
		};
		return plugin;
	}
})();