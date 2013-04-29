(function(d){
  config = {
    api:'/tt-rss/',

    // FEED_LIMIT does not really work with unread only since the unread check
    // is done in code after the db query that includes a limit. there will be missed
    // results
    article_limit:  30,
    
    // Auto refresh every x number of minutes. Be nice to your server :)
    // Turn auto refresh off with -1
    refresh_every:  15,

    show_special_folders: true,
  };

  window._ddd_config = config;
})(document);

