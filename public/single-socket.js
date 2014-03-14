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
		gid,

		retObj,

		realSocketFns = ['_handler', '_emitHandler', 'emit', 'on'],

		PREFIX = 'single-socket-',

		ID     = PREFIX + 'id',
		BACKUP = PREFIX + 'backup',
		EVENT  = PREFIX + 'event',
		UPDATE = PREFIX + 'update',
		LAST_ACTIVE_TIME = PREFIX + 'last-active-time',
		TRIGGER_EVENT_PARAMS = PREFIX + '-trigger-event-params';

	var SingleSocket = {
		connect: function() {
			return (retObj = new (this.hasConnect() ? FakeSocket : RealSocket));
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
		 * TODO:断开连接
		 * @return {[type]} [description]
		 */
		disconnect: function() {
			socket && socket.disconnect();
			this.removeFromBackups();
		},

		/**
		 * 是否已经存在 socket 连接
		 * @return {Boolean} [description]
		 */
		hasConnect: function() {
			return this.getId() != null;
		},

		getId: function() {
			var id = localStorage.getItem(ID),
				backups;
			if (id == null) {
				this.cleanup();
				localStorage.removeItem(BACKUP);

				isActive = true;
				gid = 1;
				localStorage.setItem(ID, gid);
				return null;
			} else {
				gid = ++id;
				localStorage.setItem(ID, gid);
				backups = JSON.parse(localStorage.getItem(BACKUP)) || {};
				backups[gid] = 1;
				localStorage.setItem(BACKUP, JSON.stringify(backups));
			}
			return id;
		},

		/**
		 * TODO:重新建立连接
		 * @return {[type]} [description]
		 */
		reconnect: function() {
			this.cleanup(true);
			var backups = JSON.parse(localStorage.getItem(BACKUP)),
				proto;
			for(var i in backups) {
				i = +i;
				if(typeof i === 'number' && i === i) {
					localStorage.setItem(ID, i);
					if(gid === i) {
						retObj.clean();
						proto = RealSocket.prototype;
						realSocketFns.forEach(function(n) {
							retObj[n] = proto[n];
						})
						RealSocket.call(retObj);
						this.removeFromBackups();
					}
					return;
				}
			}
		},

		/**
		 * 将 gid 从备选 id 中删掉
		 * @return {[type]} [description]
		 */
		removeFromBackups: function() {
			var backups = JSON.parse(localStorage.getItem(BACKUP));
			delete backups[gid];
			localStorage.setItem(BACKUP, JSON.stringify(backups));
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
		 * 清理之前保存的数据及定时器
		 * @param  {[type]} flag 是否删除 ID
		 * @return {[type]}      [description]
		 */
		cleanup: function(flag) {
			flag && localStorage.removeItem(ID);
			localStorage.removeItem(EVENT);
			localStorage.removeItem(UPDATE);
			localStorage.removeItem(LAST_ACTIVE_TIME);
			localStorage.removeItem(TRIGGER_EVENT_PARAMS);

			clearTimeout(checkTimeoutId);
			clearTimeout(updateTimeoutId);
		}
	};

	function RealSocket() {
		if(socket) throw new Exception('There\'s already exist one connection!');
		socket = io.connect();
		SingleSocket.update();
		window.addEventListener('storage', this._emitHandler.bind(this));
	}

	RealSocket.prototype = {
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

			if(key === TRIGGER_EVENT_PARAMS && e.newValue !== '') {
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
		window.addEventListener('storage', (this._fn = this._handler.bind(this)));
		this._events = {};
		SingleSocket.checkAlive();
	};

	FakeSocket.prototype = {
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
			localStorage.setItem(TRIGGER_EVENT_PARAMS, '');
			localStorage.setItem(TRIGGER_EVENT_PARAMS, JSON.stringify([].slice.call(arguments, 0)));
		},

		clean: function() {
			window.removeEventListener('storage', this._fn);
		}
	};

	/**
	 * 页面刷新时，如果当前页面有连接，那么断开
	 */
	window.addEventListener('beforeunload', function() {
		if(isActive) {
			SingleSocket.disconnect();
		}
	})

	window.SingleSocket = SingleSocket;
}())