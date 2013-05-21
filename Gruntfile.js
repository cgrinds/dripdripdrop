module.exports = function(grunt) {
  var libCommon = [
      'assets/js/libs/min.js',
      'assets/js/libs/ruto.js',
      'assets/js/libs/hogan.js',
  ];
  var andWeb = [
      'assets/js/libs/mousetrap.js',
      'assets/js/libs/vimium.js',
      'assets/js/libs/tinycon.js',
      'assets/js/footer_poll.js',
  ];
  var andIos = [
      'assets/js/libs/tappable.js',
      'assets/js/libs/tween.js',
      'assets/js/libs/requestanimationframe.js',
      'assets/js/footer_poll.js',
  ];

  var libWeb = libCommon.slice(0);
  libWeb.push.apply(libWeb, andWeb);
  var uglifyWeb = libWeb.slice(0);
  uglifyWeb.push('assets/js/templates.js');
  uglifyWeb.push('assets/js/ddd.js');
  uglifyWeb.push('assets/js/ddd-web.js');

  var libIos = libCommon.slice(0);
  libIos.push.apply(libIos, andIos);
  var uglifyIos = libIos.slice(0);
  uglifyIos.push('assets/js/templates.js');
  uglifyIos.push('assets/js/ddd.js');
  uglifyIos.push('assets/js/ddd-ios.js');

  var tmpl = grunt.file.read('assets/js/templates.js');

  var to_copy = [
      'assets/js/config-dist.js',
      'assets/css/*',
      'assets/images/**',
      'assets/icons/**',
  ];

  var pkg = grunt.file.readJSON('package.json');
  grunt.initConfig({
    uglify: {
      web: {
        options: {
          sourceMap: 'ddd.min/ddd.min.web.js.map',
          sourceMappingURL: function(path) {
            // path is ddd.min/ddd.min.web.js
            return path.slice(8) + '.map';
          },
          sourceMapRoot: '.',
          compress: {
            //sequences     : true,
            properties: true,
            dead_code: true,
            drop_debugger: true,
            conditionals: true,
            comparisons: true,
            evaluate: true,
            booleans: true,
            loops: true,
            unused: true,
            hoist_funs: true,
            hoist_vars: true,
            if_return: true,
            //join_vars     : true,
            cascade: true,
            side_effects: true,
            warnings: true,
            //screw_ie8     : true,
          },
          mangle: {
            toplevel: true,
          }
        },
        files: {
          'ddd.min/ddd.min.web.js': 'ddd.min/ddd.web.js'
        }
      },

      ios: {
        options: {
          sourceMap: 'ddd.min/ddd.min.ios.js.map',
          sourceMappingURL: function(path) {
            return path.replace(/^js\//i, '') + '.map';
          },
          sourceMapRoot: '../',
          compress: {
            //sequences     : true,
            properties: true,
            dead_code: true,
            drop_debugger: true,
            conditionals: true,
            comparisons: true,
            evaluate: true,
            booleans: true,
            loops: true,
            unused: true,
            hoist_funs: true,
            hoist_vars: true,
            if_return: true,
            //join_vars     : true,
            cascade: true,
            side_effects: true,
            warnings: true,
            //screw_ie8     : true,
          },
        },
        files: {
          'ddd.min/ddd.min.ios.js': uglifyIos
        }
      }
    },
    jshint: {
      options: {
        indent: 2,
        latedef: true,
        es5    : true,
        undef  : true,
        unused : 'vars',
        browser: true,
        globals: {
          "dddns": true,
          "Hogan": false,
          "amplify": false,
          'console': false,
          '$': false,
          '$all': false,
          'ruto': false,
          'TEMPLATES': false,
          'Node': false,
        },
      },
      all: [
          //'assets/js/*.js'
          'assets/js/ddd.js'
      ]
    },

    concat: {
      options: {
        separator: ';'
      },
      libs: {
        files: {
          'assets/js/libs-web.js': libWeb,
          'assets/js/libs-ios.js': libIos,
        },
        nonull: true,
      },

      web_debug: {
        files: {
          'ddd.debug/ddd.web.js': uglifyWeb,
        }
      },
      ios_debug: {
        files: {
          'ddd.debug/ddd.ios.js': uglifyIos,
        }
      }

    },

    replace: {
      index_common: {
        src: ['index.html'],
        dest: 'build/index.html',
        replacements: [{
            from: /prod cut begin -->/,
            to: '',
          }, {
            from: /<!--xxxx/,
            to: ''
          }
        ]
      },
      index_web_min: {
        src: ['build/index.html'],
        dest: 'ddd.min/index.html',
        replacements: [{
            from: /\/\/XXX_toload(.|[\n\r])*\/\/XXX_toload_end/,
            to: "var load = ['ddd.min.'];",
          },
        ]
      },
      index_web: {
        src: ['build/index.html'],
        dest: 'ddd.debug/index.html',
        replacements: [{
            from: /\/\/XXX_toload(.|[\n\r])*\/\/XXX_toload_end/,
            to: "var load = ['ddd.'];",
          },
        ]
      },
      templates: {
        src: ['assets/js/ddd.js'],
        dest: 'build/assets/js/ddd.js',
        replacements: [{
            from: /\/\/XXX TEMPLATES HERE/,
            to: tmpl,
          },
        ]
      },
      sourcemap: {
        src: ['ddd.min/ddd.min.web.js.map'],
        overwrite: true,
        replacements: [{
            from: 'ddd.min/ddd.web.js',
            to: 'ddd.web.js',
          },
        ]
      },
    },

    copy: {
      prod: {
        files: [{
            expand: true,
            src: to_copy,
            dest: 'ddd.min'
          },
          // this is just for local testing
          {
            expand: true,
            src: ['assets/js/config.js'],
            dest: 'build'
          },
        ]
      },
      debug: {
        files: [{
            expand: true,
            src: to_copy,
            dest: 'ddd.debug'
          }, {
            expand: true,
            flatten: true,
            src: 'ddd.debug/ddd.web.js',
            dest: 'ddd.min/'
          }, // for source map support
          // this is just for local testing
          {
            expand: true,
            src: ['assets/js/config.js'],
            dest: 'build'
          },
        ]
      }
    },

    compress: {
      dist: {
        options: {
          mode: 'tgz',
          archive: 'dist/ddd-' + pkg.version + '.tgz'
        },
        expand: true,
        cwd: 'ddd.min',
        src: ['**/*'],
        dest: 'ddd',
      },
      debug: {
        options: {
          mode: 'tgz',
          archive: 'dist/ddd-debug-' + pkg.version + '.tgz'
        },
        expand: true,
        cwd: 'ddd.debug',
        src: ['**/*'],
        dest: 'ddd',
      }

    },

    cssmin: {
      web: {
        files: {
          'ddd.min/assets/css/ddd-web.css': ['assets/css/ddd-web.css']
        }
      },
      ios: {
        files: {
          'ddd.min/assets/css/ddd-ios.css': ['assets/css/ddd-ios.css']
        }
      }
    },

  });

  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-text-replace');
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-contrib-compress');
  grunt.loadNpmTasks('grunt-contrib-cssmin');

  grunt.registerTask('prod', ['prod-debug', 'replace:index_web_min', 'uglify:web', 'uglify:ios', 'copy:prod',
      'cssmin:web', 'cssmin:ios', 'replace:sourcemap', 'compress:dist'
  ]);

  grunt.registerTask('prod-debug', ['replace:templates', 'replace:index_common', 'replace:index_web',
      'concat:web_debug', 'concat:ios_debug', 'copy:debug', 'compress:debug'
  ]);
};
