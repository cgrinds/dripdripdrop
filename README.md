<img src="http://gstaff.org/dripdripdrop/icons/favicon-144.png">
Drip Drip Drop
==============

A simple, fast, Tiny Tiny RSS reader. 

What is it?
-----------

A web client for [Tiny Tiny Rss](http://tt-rss.org). It uses the [JSON API](http://tt-rss.org/redmine/projects/tt-rss/wiki/JsonApiReference) to communiate with your *tt-rss* server.

I'm a big fan of keyboard shortcuts - coupled with the right reader they let me rip through a lot of feeds quickly. Some things are only possible via keyboard shortcuts at the moment, I might change that in the future.

You can see all of the shortcuts on the [About](http://gstaff.org/dripdripdrop/screenshots/keys.png) screen.

DripDripDrop takes a lot of inspiration fron [Newsbeuter](http://www.newsbeuter.org/), and a lot code and inspiration from [Lim Chee Aun](http://cheeaun.com/)'s [HackerWeb](http://hackerwebapp.com/).

Installation and Usage
----------------------

You will need *Tiny Tiny RSS* installed on a machine, let's call that machine **ttrss-server**.

1. Grab the latest [release](https://github.com/cgrinds/dripdripdrop/tree/master/dist).

2. Untar the release on **ttrss-server** (for example tar xvf ddd-0.4.2.tgz). 
If you have CORs enabled on your server - ddd will work fine, that's how I develop. 
Laptop talks to ttrss server on a different machine.

3. Copy `ddd/assets/js/config-dist.js` to `ddd/assets/js/config.js`.

4. Edit the `config.js` and update the `api` to point to your **ttrss-server**'s API end-point. This is usually something like `/tt-rss/`.

5. Enable API access for each user that plans on using DripDripDrop:
    * in *Tiny Tiny RSS* open the preferences by navigating to `Actions` -> `Preferences`
    * Make sure the `Enable API access` checkbox is selected
     
6. Profit!!! or at least read your feeds.

Current Features
----------------
<img src="http://gstaff.org/dripdripdrop/screenshots/keys.png">

- when you mark a feed read, moves you back to the list of feeds instead of leaving you on a blank page
- feed favicons
- link to original article
- mark article read/unread
- show unread / read
- mark all read
- add / remove new feeds
- [vimium style](http://gstaff.org/dripdripdrop/screenshots/links.png) link navigation
- special feeds, enabled by default. disable in settings

Technical Stuff
---------------

DripDripDrop works best on modern browsers. Mobile support is rough around the edges but improving.
On Android I highly recommend Andrew Dolgov's [client](https://play.google.com/store/apps/details?id=org.fox.ttrss&hl=en). DripDripDrop makes extensive use of [localStorage](http://caniuse.com/namevalue-storage) to make performance snappy.

DripDripDrop is using:

- [Hogan.js](https://github.com/twitter/hogan.js) - logic-less templating
- [Amplify.Store](http://amplifyjs.com/api/store/) - client-side storage
- ruto.js - `location.hash` router
- [zepto.js](http://zeptojs.com/) - a minimalist JavaScript library for modern browsers with a largely jQuery-compatible API.
- [Vimium](https://github.com/philc/vimium) - for link highlighting
- iOS
	- [Tappable](https://github.com/cheeaun/tappable) - touch-friendly tap events
	- [Tween.js](https://github.com/sole/tween.js) - simple tweening engine

Screenshots
-----------
<img src="http://gstaff.org/dripdripdrop/screenshots/feeds.png">
<img src="http://gstaff.org/dripdripdrop/screenshots/links.png">


Development
-----------
[Node.js](http://nodejs.org/) is required

Prerequisites

    git clone https://github.com/cgrinds/dripdripdrop.git
    cd dripdripdrop
    npm install
    cp assets/js/config-dist.js assets/js/config.js
    node make-templates.js
    grunt concat:libs

Then have your local server serve up the **dripdripdrop** directory

Contributing and Feedback
-------------------------

Feel free to fork, file some issues or [email](mailto:chris@gstaff.org) me.


License
-------

Licensed under the [MIT License](http://cgrinds.mit-license.org).

Other similar apps
------------------

This is the not the first third-party client for Tiny Tiny RSS. There are many [others](http://tt-rss.org/redmine/projects/tt-rss/wiki/RelatedSoftware) and more all the time.

What Google giveth, Google will taketh away.

