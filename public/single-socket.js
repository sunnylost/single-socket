/**
 * @author: sunnylost
 * @update-time: 2014-3-14
 * @version 0.1
 */

(function() {
	var socket,
		localStorage = window.localStorage,

		checkTimeoutId,
		updateTimeoutId,

		isActive = false,

		PREFIX = 'single-socket-',

		ID     = PREFIX + 'id',
		EVENT  = PREFIX + 'event',
		UPDATE = PREFIX + 'update',
		TRIGGER_EVENT    = PREFIX + '-trigger-event',
		LAST_ACTIVE_TIME = PREFIX + 'last-active-time',
		TRIGGER_EVENT_PARAMS = TRIGGER_EVENT + '-params';

	var SingleSocket = {
		connect: function() {
			return new (this.hasConnect() ? FakeSocket : RealSocket);
		},

		/**
		 * 检测当前是否存在 socket 链接
		 * 如果上次更新时间距离当前已经超过 10 秒，则认为链接断开，启用新连接
		 * @return {[type]} [description]
		 */
		checkAlive: function() {
			var _this = this;
			checkTimeoutId = setTimeout(function() {
				var lastTime = +localStorage.getItem(LAST_ACTIVE_TIME);
				if(lastTime !== lastTime || (Date.now() - new Date(lastTime) >= 10000)) {
					console.log("The connection is cut out!");
					_this.reconnect();
				} else {
					_this.checkAlive();
				}
			}, 5000)
		},

		/**
		 * 断开连接
		 * @return {[type]} [description]
		 */
		disconnect: function() {
			this.cleanup(true);
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
		 * 重新建立连接
		 * @return {[type]} [description]
		 */
		reconnect: function() {
			this.cleanup(true);
		},

		/**
		 * 更新最后一次活动时间，用于判断链接是否断开
		 * @return {[type]} [description]
		 */
		update: function() {
			var _this = this;
			updateTimeoutId = setTimeout(function() {
				localStorage.setItem(LAST_ACTIVE_TIME, Date.now());
				_this.update();
			}, 5000);
		},

		/**
		 * 清理之前保存的数据
		 * @param  {[type]} flag 是否删除 ID
		 * @return {[type]}      [description]
		 */
		cleanup: function(flag) {
			flag && localStorage.removeItem(ID);
			localStorage.removeItem(EVENT);
			localStorage.removeItem(UPDATE);
			localStorage.removeItem(TRIGGER_EVENT);
			localStorage.removeItem(LAST_ACTIVE_TIME);
		}
	};

	function RealSocket() {
		if(socket) throw new Exception('There\'s already exist one connection!');
		socket = io.connect();
		SingleSocket.update();
		window.addEventListener('storage', this._emitHandler.bind(this));
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

		_emitHandler: function(e) {
			var key = e.key;

			if(key === TRIGGER_EVENT && e.newValue !== '') {
				this.emit.apply(this, JSON.parse(localStorage.getItem(TRIGGER_EVENT_PARAMS)));
			}
		},

		on: function(eventName, fn) {
			var _this = this;
			socket.on(eventName, function(data) {
				_this._handler(eventName, data, fn);
			});
		},

		emit: function(eventName) {
			socket.emit.apply(socket, [].slice.call(arguments, 0));
		}
	};

	function FakeSocket() {
		window.addEventListener('storage', this._handler.bind(this));
		this._events = {};
		SingleSocket.checkAlive();
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
				if(data) {
					for (var i = 0, len = events.length; i < len; i++) {
						events[i](data);
					}
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

		emit: function(eventName) {
			localStorage.setItem(TRIGGER_EVENT_PARAMS, JSON.stringify([].slice.call(arguments, 0)));
			localStorage.setItem(TRIGGER_EVENT, '');
			localStorage.setItem(TRIGGER_EVENT, eventName);
		}
	};

	/**
	 * 页面刷新时，如果当前页面有连接，那么断开
	 */
	window.addEventListener('unload', function() {
		if(isActive) {
			SingleSocket.disconnect();
		}
	})

	window.SingleSocket = SingleSocket;
}())