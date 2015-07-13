/**
 * 初始化 SingleSocket 时，判断是否存在 socket 连接
 * FakeSocket 模拟 socket 对象的接口，但不是真实的连接
 * RealSocket 是真正的 socket 连接，被多个标签页共享
 *
 * 真实的连接获取到数据后，更新 localStorage
 * 其他标签页监听 storage 事件
 */

let global            = window,
    LS                = localStorage,

    gid               = 1,
    isRealConnect     = false,
    realSocketFns     = [ '_handler', '_emitHandler', 'emit', 'on' ],
    $check            = Symbol( 'check' ),
    $clean            = Symbol( 'clean' ),
    $emitHandler      = Symbol( 'emitHandler' ),
    $events           = Symbol( 'events' ),
    $fn               = Symbol( 'fn' ),
    $handler          = Symbol( 'handler' ),
    $id               = Symbol( 'id' ),
    $isReal           = Symbol( 'isReal' ),
    $recommend        = Symbol( 'recommend' ),
    $timeoutID        = Symbol( 'timeoutID' ),
    $upgrade          = Symbol( 'upgrade' ),
    fakeSocketMethods = [ $clean, $isReal, $handler, $emitHandler, 'on', 'emit' ],
    connectInstance, sinceAfter

const BLANK                = '',
      UPDATE_RATE          = 5000,
      CHECK_RATE           = 2 * UPDATE_RATE,
      MAX_RESET_TIME       = 1000 * 60 * 60 * 24,
      UNLOAD               = 'unload',
      EVENT_NAME           = 'storage',
      FUNCTION             = 'function',
      UNDEFINED            = 'undefined',
      PRE                  = 'single-socket',
      GID                  = `${PRE}-gid`,
      ACTIVE_ID            = `${PRE}-active-id`,
      METHOD               = `${PRE}-method`,
      RECOMMEND_ID         = `${PRE}-recommend-id`,
      UPDATE               = `${PRE}-update`,
      HAS_REAL_CONNECT     = `${PRE}-has-real-connect`,
      HAS_UPDATE           = `${PRE}-has-update`,
      LAST_ACTIVE_TIME     = `${PRE}-last-active-time`,
      TRIGGER_EVENT_PARAMS = `${PRE}-trigger-event-params`

sinceAfter = checkTime => {
    let lastActiveTime = LS.getItem( LAST_ACTIVE_TIME )

    if ( lastActiveTime ) {
        lastActiveTime = new Date( +lastActiveTime )
        return Date.now() - lastActiveTime >= checkTime
    } else {
        return true
    }
}

class RealSocket {
    constructor() {
        console.log( 'real' )
        this.socket   = io.connect()
        isRealConnect = true
        global.addEventListener( EVENT_NAME, this[ $fn ] = this::this[ $emitHandler ] )
    }

    [ $handler ]( name, data, fn ) {
        typeof fn === FUNCTION && fn.call( null, data )
        LS.setItem( UPDATE, JSON.stringify( data ) )
        LS.setItem( METHOD, name )

        LS.setItem( HAS_UPDATE, BLANK )
        LS.setItem( HAS_UPDATE, '1' )
    }

    [ $emitHandler ]( e ) {
        let key      = e.key,
            newValue = e.newValue

        if ( key === TRIGGER_EVENT_PARAMS && newValue !== BLANK ) {
            this.emit.apply( this, JSON.parse( LS.getItem( TRIGGER_EVENT_PARAMS ) ) )
        }
    }

    on( name, fn ) {
        this.socket.on( name, data => this[ $handler ]( name, data, fn ) )
    }

    emit( ...args ) {
        this.socket.emit.apply( this.socket, args )
    }

    [ $clean ]() {
        this.socket.disconnect()
        global.removeEventListener( EVENT_NAME, this[ $fn ] )
    }

    [ $isReal ]() {
        return this[ $id ] == LS.getItem( ACTIVE_ID )
    }
}

class FakeSocket {
    constructor() {
        console.log( 'fake' )
        this[ $events ] = {}
        this[ $check ]()
        global.addEventListener( EVENT_NAME, this[ $fn ] = this::this[ $handler ] )
    }

    [ $check ]() {
        this[ $timeoutID ] = setTimeout( () => {
            if ( sinceAfter( CHECK_RATE ) ) {
                this[ $recommend ]()
            } else {
                this[ $check ]()
            }
        }, CHECK_RATE )
    }

    [ $handler ]( e ) {
        let key = e.key,
            method, data, rawData

        if ( key === HAS_UPDATE && e.newValue !== BLANK ) {
            method  = this[ $events ][ LS.getItem( METHOD ) ]
            rawData = LS.getItem( UPDATE )
            data    = rawData != UNDEFINED && JSON.parse( rawData )

            if ( data ) {
                for ( var i = 0, len = method.length; i < len; i++ ) {
                    method[ i ]( data )
                }
            }
        }
    }

    on( name, fn ) {
        let events = this[ $events ]

        if ( !events[ name ] ) {
            events[ name ] = []
        }

        events[ name ].push( fn )
    }

    emit( ...args ) {
        LS.setItem( TRIGGER_EVENT_PARAMS, '' )
        localStorage.setItem( TRIGGER_EVENT_PARAMS, JSON.stringify( args ) )
    }

    [ $clean ]() {
        clearTimeout( this[ $timeoutID ] )
        global.removeEventListener( EVENT_NAME, this[ $fn ] )
    }

    [ $isReal ]() {
        return false
    }

    [ $recommend ] () {
        if ( !LS.getItem( RECOMMEND_ID ) ) {
            LS.setItem( RECOMMEND_ID, this[ $id ] )
            setTimeout( this::this[ $upgrade ], CHECK_RATE )
        } else {
            this[ $check ]()
        }
    }

    [ $upgrade ]() {
        this[ $clean ]()

        let newConnectInstance = new RealSocket()
        SingleSocket.update()
        SingleSocket.connect( newConnectInstance )
        LS.removeItem( RECOMMEND_ID )

        fakeSocketMethods.forEach( method => {
            connectInstance[ method ] = newConnectInstance::newConnectInstance[ method ]
        })

        for ( let key in connectInstance[ $events ] ) {
            connectInstance[ $events ][ key ].forEach( fn => newConnectInstance.on( key, fn ) )
        }
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
        LS.setItem( ACTIVE_ID, instance[ $id ] )
    }

    static attempReset() {
        if ( sinceAfter( MAX_RESET_TIME ) ) {
            LS.setItem( GID, 0 )
        }
    }

    /**
     * 更新真实连接最后的活动时间
     */
    static update() {
        clearTimeout( SingleSocket[ $timeoutID ] )
        LS.setItem( LAST_ACTIVE_TIME, Date.now() )
        SingleSocket[ $timeoutID ] = setTimeout( () => SingleSocket.update(), UPDATE_RATE )
    }

    static disconnect() {
        if ( connectInstance ) {
            connectInstance[ $isReal ]() && LS.removeItem( HAS_REAL_CONNECT )
            connectInstance[ $clean ]()
        }
    }

    assign( instance ) {
        SingleSocket.attempReset()

        let _gid  = LS.getItem( GID ),
            oldId = instance[ $id ]

        if ( !oldId ) {
            if ( !_gid ) {
                _gid = 1
            } else {
                ++_gid
            }

            instance[ $id ] = _gid
        } else {
            _gid = oldId
        }

        LS.setItem( GID, _gid )
    }
}

window.addEventListener( UNLOAD, SingleSocket.disconnect )

export default SingleSocket
