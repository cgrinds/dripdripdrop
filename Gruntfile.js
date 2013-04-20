module.exports = function(grunt) {
  var libCommon = [
    'assets/js/libs/zepto.js',
    'assets/js/libs/ruto.js',
    'assets/js/libs/amplify.store.js',
    'assets/js/libs/hogan.js',
  ];
  var andWeb = [
    'assets/js/libs/mousetrap.js',
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
  console.log('uglifyWeb=', uglifyWeb);

  var libIos = libCommon.slice(0);
  libIos.push.apply(libIos, andIos);
  var uglifyIos = libIos.slice(0);
  uglifyIos.push('assets/js/templates.js');
  uglifyIos.push('assets/js/ddd.js');
  uglifyIos.push('assets/js/ddd-ios.js');
  console.log('uglifyIos=', uglifyIos);
 
  var tmpl = grunt.file.read('assets/js/templates.js');
  var hashes = grunt.file.readJSON('hashes.json');

  var to_copy = [
    'assets/js/config-dist.js',
    'assets/css/*',
    'assets/images/**',
    'assets/icons/**',
  ];

	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),
		uglify: {
			web: {
				options: {
					sourceMap: 'ddd.min/ddd.min.web.js.map',
					sourceMappingURL: function(path){
						return path.replace(/^js\//i, '') + '.map';
					},
					sourceMapRoot: '../'
				},
				files: {
					'ddd.min/ddd.min.web.js': uglifyWeb
				}
			},

			ios: {
				options: {
					sourceMap: 'ddd.min/ddd.min.ios.js.map',
					sourceMappingURL: function(path){
						return path.replace(/^js\//i, '') + '.map';
					},
					sourceMapRoot: '../'
				},
				files: {
					'ddd.min/ddd.min.ios.js': uglifyIos
				}
			}
		},
		jshint: {
			all: [
				'assets/js/*.js'
			]
		},

    concat: {
      options: {
        separator: ';'
      },
      libs: {
        files: {
          'assets/js/libs-web.js' : libWeb,
          'assets/js/libs-ios.js' : libIos,
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
        },{
          from: /<!--xxxx/,
          to: ''
        }]
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
        },]
      },
    },
    
    copy: {
      prod: {
        files: [
          {expand: true, src: to_copy, dest: 'ddd.min'},
          // this is just for local testing
          {expand: true, src: ['assets/js/config.js'], dest: 'build'},
        ]
      },
      debug: {
        files: [
          {expand: true, src: to_copy, dest: 'ddd.debug'},
          // this is just for local testing
          {expand: true, src: ['assets/js/config.js'], dest: 'build'},
        ]
      }
    },
	});

	grunt.loadNpmTasks('grunt-contrib-uglify');
	grunt.loadNpmTasks('grunt-contrib-jshint');
	grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-text-replace');
  grunt.loadNpmTasks('grunt-contrib-copy');


  grunt.registerTask('prod', 
    ['replace:templates', 'replace:index_common', 'replace:index_web_min',
      'uglify:web', 'uglify:ios', 'copy:prod']);

  grunt.registerTask('prod-debug', 
    ['replace:templates', 'replace:index_common', 'replace:index_web', 
      'concat:web_debug', 'concat:ios_debug', 'copy:debug']);
};
