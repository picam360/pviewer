function PushButton(src_normal, src_pushed, callback) {
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

	var st = 0, et = 0;
	var sx = 0, sy = 0;
	var x_axis = 0;// -1:1
	var x_axis_candidate = 0;
	var y_axis = 0;// -1:1
	var y_axis_candidate = 0;
	var mousedownFunc = function(ev) {
		if (callback) {
			callback({
				type : "down"
			});
		}

		if (ev.type == "touchstart") {
			ev.clientX = ev.pageX;
			ev.clientY = ev.pageY;
		}
		st = Date.now();
		sx = ev.clientX;
		sy = ev.clientY;
		x_axis = 0;
		y_axis = 0;
		x_axis_candidate = 0;
		y_axis_candidate = 0;

		button.down = true;
		if (button.src_pushed) {
			button.src = button.src_pushed;
		}
	}
	button.mouseupFunc = function() {
		et = Date.now();
		if (callback) {
			callback({
				type : "up",
				elapsed_ms : et - st
			});
		}

		button.down = false;
		button.src = button.src_normal;

		x_axis = 0;
		y_axis = 0;
		x_axis_candidate = 0;
		y_axis_candidate = 0;
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
		var dx = (ev.clientX - sx);
		var dy = (ev.clientY - sy);

		var threshold = 1;
		dx = parseInt(dx / threshold) * threshold;
		dy = parseInt(dy / threshold) * threshold;
		sx += dx;
		sy += dy;

		var limit = window.parent.screen.width / 20;
		if (dx == 0) {
			// do nothing
		} else {
			x_axis_candidate += dx / limit;
			x_axis_candidate = Math.max(-1, Math.min(x_axis_candidate, 1));
		}
		if (dy == 0) {
			// do nothing
		} else {
			y_axis_candidate -= dy / limit;// minus means system coodinate
			// to
			y_axis_candidate = Math.max(-1, Math.min(y_axis_candidate, 1));
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

	setInterval(function() {
		var updated = false;
		var ev = {
			type : "axis",
			x : x_axis,
			dx : 0,
			y : y_axis,
			dy : 0,
		};
		if (x_axis_candidate != x_axis) {
			ev.x = x_axis_candidate;
			ev.dx = x_axis_candidate - x_axis;

			x_axis = x_axis_candidate;
			updated = true;
		}
		if (y_axis_candidate != y_axis) {
			ev.y = y_axis_candidate;
			ev.dy = y_axis_candidate - y_axis;

			y_axis = y_axis_candidate;
			updated = true;
		}
		if (updated && callback) {
			callback(ev);
		}
	}, 200);

	button.style.position = 'absolute';
	button.style.display = "none";
	button.width = 50;
	button.height = 50;

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