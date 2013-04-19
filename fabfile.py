from __future__ import with_statement
from fabric.api import *
import os
import re
import urllib2

def prepare_files():
    local('grunt replace:templates')
    local('grunt replace:index')
    local('grunt copy:prod')

def upload_common():
    put('build/assets', '~/feeds/src/client')
    put('build/index.html', '~/feeds/src/client')

def upload_ddd():
    put('build/assets', '~/ddd')
    put('build/index.html', '~/ddd')

@roles('prod')
def gstaff():
  prepare_files()
  upload_common()
  upload_ddd()

  #put('assets/js/config.gstaff.js', '~/feeds/src/client/assets/js/config.js')
  put('assets/js/config-ddd.js', '~/ddd/assets/js/config.js')
