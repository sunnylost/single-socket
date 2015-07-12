/**
 * 初始化 SingleSocket 时，判断是否存在 socket 连接
 * FakeSocket 模拟 socket 对象的接口，但不是真实的连接
 * RealSocket 是真正的 socket 连接，被多个标签页共享
 *
 * 真实的连接获取到数据后，更新 localStorage
 * 其他标签页监听 storage 事件
 */
let global        = window,
    ST            = sessionStorage,
    LT            = localStorage,

    realSocketFns = [ '_handler', '_emitHandler', 'emit', 'on' ],
    realConnect

const BLANK                = '',
      CHECK_GAP            = 5000,
      EVENT_NAME           = 'storage',
      FUNCTION             = 'function',
      PRE                  = 'single-socket',
      METHOD               = `${PRE}-method`,
      UPDATE               = `${PRE}-update`,
      HAS_UPDATE           = `${PRE}-has-update`,
      LAST_ACTIVE_TIME     = `${PRE}-last-active-time`,
      TRIGGER_EVENT_PARAMS = `${PRE}-trigger-event-params`

class RealSocket {
    constructor() {
        console.log('real')

        this.socket = io.connect()
        SingleSocket.update()
        global.addEventListener( EVENT_NAME, this._fn = this::this._emitHandler )
    }

    _handler( name, data, fn ) {
        typeof fn === FUNCTION && fn.call( null, data )
        ST.setItem( UPDATE, JSON.stringify( data ) )
        ST.setItem( METHOD, name )

        LT.setItem( HAS_UPDATE, BLANK )
        LT.setItem( HAS_UPDATE, '1' )
    }

    _emitHandler( e ) {
        let key      = e.key,
            newValue = e.newValue

        if ( key === TRIGGER_EVENT_PARAMS && newValue !== BLANK ) {
            this.emit.apply( this, JSON.parse( LT.getItem( TRIGGER_EVENT_PARAMS ) ) )
        }
    }

    on( name, fn ) {
        this.socket.on( name, data => this._handler( name, data, fn ) )
    }

    emit( ...args ) {
        this.socket.emit.apply( this.socket, args )
    }
}

class FakeSocket {
    constructor() {
        this._events = {}
        global.addEventListener( EVENT_NAME, this._fn = this::this._handler )
    }

    _handler( e ) {
    }

    on( name, fn ) {
        let events = this._events

        if ( !events[ name ] ) {
            events[ name ] = []
        }

        events[ name ].push( fn )
    }

    emit( ...args ) {
        localStorage.setItem( TRIGGER_EVENT_PARAMS, '' )
        localStorage.setItem( TRIGGER_EVENT_PARAMS, JSON.stringify( args ) )
    }

    clean() {
        global.removeEventListener( EVENT_NAME, this._fn )
    }
}

class SingleSocket {
    constructor() {
        return new ( SingleSocket.hasConnect() ? FakeSocket : RealSocket )
    }

    static hasConnect() {
        return false
    }

    /**
     * 更新真实连接最后的活动时间
     */
    static update() {
        clearTimeout( SingleSocket._timeoutid )
        ST.setItem( LAST_ACTIVE_TIME, Date.now() )

        SingleSocket._timeoutid = setTimeout( () => SingleSocket.update(), CHECK_GAP )
    }
}

export default SingleSocket
