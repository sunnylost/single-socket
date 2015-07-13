/**
 * 初始化 SingleSocket 时，判断是否存在 socket 连接
 * FakeSocket 模拟 socket 对象的接口，但不是真实的连接
 * RealSocket 是真正的 socket 连接，被多个标签页共享
 *
 * 真实的连接获取到数据后，更新 localStorage
 * 其他标签页监听 storage 事件
 */
let global    = window,
LS            = localStorage,

gid           = 1,
isRealConnect = false,
realSocketFns = [ '_handler', '_emitHandler', 'emit', 'on' ],
connectInstance

const BLANK                = '',
      CHECK_GAP            = 5000,
      BEFORE_UNLOAD        = 'unload',
      EVENT_NAME           = 'storage',
      FUNCTION             = 'function',
      PRE                  = 'single-socket',
      GID                  = `${PRE}-gid`,
      ACTIVE_ID            = `${PRE}-active-id`,
      METHOD               = `${PRE}-method`,
      UPDATE               = `${PRE}-update`,
      HAS_REAL_CONNECT     = `${PRE}-has-real-connect`,
      HAS_UPDATE           = `${PRE}-has-update`,
      LAST_ACTIVE_TIME     = `${PRE}-last-active-time`,
      TRIGGER_EVENT_PARAMS = `${PRE}-trigger-event-params`

class RealSocket {
    constructor() {
        console.log( 'real' )
        this.socket   = io.connect()
        isRealConnect = true
        global.addEventListener( EVENT_NAME, this._fn = this::this._emitHandler )
    }

    _handler( name, data, fn ) {
        typeof fn === FUNCTION && fn.call( null, data )
        LS.setItem( UPDATE, JSON.stringify( data ) )
        LS.setItem( METHOD, name )

        LS.setItem( HAS_UPDATE, BLANK )
        LS.setItem( HAS_UPDATE, '1' )
    }

    _emitHandler( e ) {
        let key      = e.key,
            newValue = e.newValue

        if ( key === TRIGGER_EVENT_PARAMS && newValue !== BLANK ) {
            this.emit.apply( this, JSON.parse( LS.getItem( TRIGGER_EVENT_PARAMS ) ) )
        }
    }

    on( name, fn ) {
        this.socket.on( name, data => this._handler( name, data, fn ) )
    }

    emit( ...args ) {
        this.socket.emit.apply( this.socket, args )
    }

    clean() {
        this.socket.disconnect()
        global.removeEventListener( EVENT_NAME, this._fn )
    }

    isReal() {
        return this.id == LS.getItem( ACTIVE_ID )
    }
}

class FakeSocket {
    constructor() {
        console.log( 'fake' )
        this._events = {}
        global.addEventListener( EVENT_NAME, this._fn = this::this._handler )
    }

    _handler( e ) {
        let key = e.key,
            method,
            params,
            data

        if ( key === HAS_UPDATE && e.newValue !== BLANK ) {
            method = this._events[ LS.getItem( METHOD ) ]
            params = JSON.parse( LS.getItem( TRIGGER_EVENT_PARAMS ) )
            data   = JSON.parse( LS.getItem( UPDATE ) )

            if ( params ) {
                for ( var i = 0, len = method.length; i < len; i++ ) {
                    method[ i ]( data )
                }
            }
        }
    }

    on( name, fn ) {
        let events = this._events

        if ( !events[ name ] ) {
            events[ name ] = []
        }

        events[ name ].push( fn )
    }

    emit( ...args ) {
        LS.setItem( TRIGGER_EVENT_PARAMS, '' )
        localStorage.setItem( TRIGGER_EVENT_PARAMS, JSON.stringify( args ) )
    }

    clean() {
        global.removeEventListener( EVENT_NAME, this._fn )
    }

    isReal() {
        return false
    }
}

class SingleSocket {
    constructor() {
        let hasConnect  = SingleSocket.hasConnect()
        connectInstance = new ( hasConnect ? FakeSocket : RealSocket )
        this.assign( connectInstance )

        if ( isRealConnect ) {
            SingleSocket.update()
            SingleSocket.connect( connectInstance )
        }

        return connectInstance
    }

    static hasConnect() {
        return !!LS.getItem( HAS_REAL_CONNECT )
    }

    static connect( instance ) {
        LS.setItem( HAS_REAL_CONNECT, 1 )
        LS.setItem( ACTIVE_ID, instance.id )
    }

    /**
     * 更新真实连接最后的活动时间
     */
    static update() {
        clearTimeout( SingleSocket._timeoutid )
        LS.setItem( LAST_ACTIVE_TIME, Date.now() )

        SingleSocket._timeoutid = setTimeout( () => SingleSocket.update(), CHECK_GAP )
    }

    static disconnect() {
        if ( connectInstance ) {
            connectInstance.isReal() && LS.removeItem( HAS_REAL_CONNECT )
            connectInstance.clean()
        }
    }

    assign( instance ) {
        let _gid = LS.getItem( GID )

        if ( !_gid ) {
            _gid = 1
        } else {
            ++_gid
        }

        instance.id = _gid
        LS.setItem( GID, _gid )
    }
}

window.addEventListener( BEFORE_UNLOAD, () => {
    SingleSocket.disconnect()
} )

export default SingleSocket
