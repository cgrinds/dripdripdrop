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

  var libIos = libCommon.slice(0);
  libIos.push.apply(libIos, andIos);
 
  var tmpl = grunt.file.read('assets/js/templates.js');
  var hashes = grunt.file.readJSON('hashes.json');

	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),
		uglify: {
			web: {
				options: {
					sourceMap: 'js/ddd-web.min.js.map',
					sourceMappingURL: function(path){
						return path.replace(/^js\//i, '') + '.map';
					},
					sourceMapRoot: '../'
				},
				files: {
					'js/ddd-web.min.js': [
						'assets/js/libs/zepto.js',
						'assets/js/libs/ruto.js',
						'assets/js/libs/amplify.store.js',
						'assets/js/libs/hogan.js',
						'assets/js/libs/ttrss-api.js',
						'assets/js/templates.js',
						'assets/js/ddd.js',
						'assets/js/ddd-web.js'
					]
				}
			},

			ios: {
				options: {
					sourceMap: 'js/ddd-ios.min.js.map',
					sourceMappingURL: function(path){
						return path.replace(/^js\//i, '') + '.map';
					},
					sourceMapRoot: '../'
				},
				files: {
					'js/ddd-ios.min.js': [
						'assets/js/libs/zepto.js',
						'assets/js/libs/ruto.js',
						'assets/js/libs/amplify.store.js',
						'assets/js/libs/hogan.js',
						'assets/js/libs/tappable.js',
						'assets/js/libs/tween.js',
						'assets/js/libs/requestanimationframe.js',
						'assets/js/templates.js',
						'assets/js/ddd.js',
						'assets/js/ddd-ios.js'
					]
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
    },
    
    replace: {
      index: {
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

      templates: {
        src: ['assets/js/ddd.js'],
        dest: 'build/assets/js/ddd.js',
        replacements: [{
          from: /\/\/XXX TEMPLATES HERE/,
          to: tmpl,
        },]
      },

      rev: {
        src: ['build/index.html'],
        dest: 'build/index-rev.html',
        replacements: [{
          from: 'config.js',
          to: 'config_' + hashes['config.js'].val + '.js',
        },
        {
          from: 'ddd.js',
          to: 'ddd_' + hashes['ddd.js'].val + '.js',
        },
        ]
      },
    },
    
    copy: {
      prod: {
        files: [
          {expand: true, src: ['assets/js/config-dist.js', 'assets/js/ddd-*'], dest: 'build'},
          {expand: true, src: ['assets/js/libs-*'], dest: 'build'},
          {expand: true, src: ['assets/css/*', 'assets/images/**', 'assets/icons/**'], dest: 'build'},
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
};
