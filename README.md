Drip Drip Drop
==============

A simple, fast, Tiny Tiny RSS reader. 

What is it?
-----------

A web client for [Tiny Tiny Rss](http://tt-rss.org). It uses the [JSON API](http://tt-rss.org/redmine/projects/tt-rss/wiki/JsonApiReference) to communiate with your *tt-rss* server.

I'm a big fan of keyboard shortcuts - coupled with the right reader they let me rip through a lot of feeds quickly. Some things are only possible via keyboard shortcuts at the moment, I might change that in the future.

You can see all of the shortcuts on the [About](https://github.com/cgrinds/dripdripdrop/screenshots/keys.png) screen.

DripDripDrop takes a lot of inspiration fron [Newsbeuter](http://www.newsbeuter.org/), and a lot code and inspiration from [Lim Chee Aun](http://cheeaun.com/)'s [HackerWeb](http://hackerwebapp.com/).

Installation and Usage
----------------------

You will need *Tiny Tiny RSS* installed on a machine, let's call that machine **ttrss-server** with a domain name of *example.com*.

1. Add the `ddd` directory to *ttrss-server*. There is no CORs support at the moment so it needs to be on the same host.

2. Copy `ddd/config-dist.js` to `ddd/config.js`.

3. Edit `ddd/config.js` and update the `api` to point to your **ttrss-server**'s API end-point. This is usually something like `http://example.com/tt-rss/`.

4. Enable API access for each user that plans on using DripDripDrop:
    * in *Tiny Tiny RSS* open the preferences by navigating to `Actions` -> `Preferences`
    * Make sure the `Enable API access` checkbox is selected
     
5. Profit!!! or at least read your feeds.

Current Features
----------------
<img src="https://github.com/cgrinds/dripdripdrop/screenshots/keys.png" width="100px">

- feed favicons
- link to original article
- mark all read
- add / remove new feeds
- mark article read/unread
- show unread / read
- *NOT SUPPORTED YET* special feeds

Technical Stuff
---------------

DripDripDrop works best on modern browsers. Mobile support is rough around the edges but improving.
On Android I highly recommend Andrew Dolgov's [client](https://play.google.com/store/apps/details?id=org.fox.ttrss&hl=en). DripDripDrop makes extensive use of [localStorage](http://caniuse.com/namevalue-storage) to make performance snappy.

DripDripDrop is using:

- [Hogan.js](https://github.com/twitter/hogan.js) - logic-less templating
- [Amplify.Store](http://amplifyjs.com/api/store/) - client-side storage
- ruto.js - `location.hash` router
- [zepto.js](http://zeptojs.com/) - a minimalist JavaScript library for modern browsers with a largely jQuery-compatible API.
- iOS
	- [Tappable](https://github.com/cheeaun/tappable) - touch-friendly tap events
	- [Tween.js](https://github.com/sole/tween.js) - simple tweening engine

Screenshots
-----------
<img src="gstaff.org/dripdripdrop/screenshots/feeds.png">
<img src="gstaff.org/dripdripdrop/screenshots/article.png">

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

