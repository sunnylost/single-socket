var fs         = require( 'fs' ),
    gulp       = require( 'gulp' ),
    babel      = require( 'gulp-babel' ),
    sourcemaps = require( 'gulp-sourcemaps' ),

    paths      = {
        src: 'src/*.js',

        build: 'build/',

        dist: 'dist/'
    },

    options    = {
        stage: 0,
        modules: 'umd'
    }

gulp.task( 'scripts', function() {
    gulp.src( paths.src )
        .pipe( sourcemaps.init() )
        .pipe( babel( options ) )
        .pipe( sourcemaps.write( '.' ) )
        .pipe( gulp.dest( paths.build ) )
} )

gulp.task( 'watch', function() {
    gulp.watch( paths.src, [ 'scripts' ] )
} )

gulp.task( 'dist', function() {
    gulp.src( paths.src )
        .pipe( babel( options ) )
        .pipe( gulp.dest( paths.dist ) )
} )

gulp.task( 'default', [ 'scripts', 'watch' ] )
