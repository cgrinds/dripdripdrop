from __future__ import with_statement
from fabric.api import *
import os
import re
import urllib2

def upload_debug():
    run("mkdir -p ddd.debug")
    put('ddd.debug/*', '~/ddd.debug')

def upload_min():
    run("mkdir -p ddd.min")
    put('ddd.min/*', '~/ddd.min')

@roles('prod')
def gstaff():
  local('grunt prod')
  local('grunt prod-debug')
  upload_min()
  upload_debug()

  put('assets/js/config-ddd.js', '~/ddd.min/assets/js/config.js')
  put('assets/js/config-ddd.js', '~/ddd.debug/assets/js/config.js')
