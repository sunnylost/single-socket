(function() {
	var socket,
		localStorage = window.localStorage,

		isActive = false,

		PREFIX = 'single-socket-',

		ID     = PREFIX + 'id',
		EVENT  = PREFIX + 'event',
		UPDATE = PREFIX + 'update';

	var SingleSocket = {
		connect: function() {
			return new (this.hasConnect() ? FakeSocket : RealSocket);
		},

		/**
		 * 是否已经存在 socket 连接
		 * @return {Boolean} [description]
		 */
		hasConnect: function() {
			return this.getId() != null;
		},

		getId: function() {
			var id = localStorage.getItem(ID);
			if (id == null) {
				isActive = true;
				localStorage.setItem(ID, 0);
				this.cleanup();
				return null;
			} else {
				localStorage.setItem(ID, ++id);
			}
			return id;
		},

		/**
		 * 清理之前保存的数据
		 * @return {[type]} [description]
		 */
		cleanup: function() {
			localStorage.removeItem(EVENT);
			localStorage.removeItem(UPDATE);
		}
	};

	function RealSocket() {
		this.socket = io.connect();
	}

	RealSocket.prototype = {
		constructor: RealSocket,

		_handler: function(eventName, data, fn) {
			typeof fn === 'function' && fn.call(null, data);
			localStorage.setItem(UPDATE, JSON.stringify(data));
			/**
			 * 如果设置的值相同是不会触发 storage 事件滴~~
			 */
			localStorage.setItem(EVENT, '');
			localStorage.setItem(EVENT, eventName);
		},

		on: function(eventName, fn) {
			var _this = this;
			this.socket.on(eventName, function(data) {
				_this._handler(eventName, data, fn);
			});
		},

		emit: function(eventName) {
			var socket = this.socket;
			socket.emit.apply(socket, [].slice.call(arguments, 0));
		}
	};

	function FakeSocket() {
		window.addEventListener('storage', this._handler.bind(this));
		this._events = {};
	};

	FakeSocket.prototype = {
		constructor: FakeSocket,

		_handler: function(e) {
			var key = e.key,
				events,
				data;
			if (key === EVENT && e.newValue !== '') {
				events = this._events[localStorage.getItem(EVENT)];
				data = JSON.parse(localStorage.getItem(UPDATE));
				for (var i = 0, len = events.length; i < len; i++) {
					events[i](data);
				}
			}
		},

		on: function(eventName, fn) {
			var events = this._events;
			if (!events[eventName]) {
				events[eventName] = [];
			}
			events[eventName].push(fn);
		},

		emit: function(eventName) {}
	};

	window.SingleSocket = SingleSocket;
}())