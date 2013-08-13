var accessToken = '';
var time = null;
var template = null;
var first = true;
var timerId = null;

window.fbAsyncInit = function() {
  // init the FB JS SDK
  FB.init({
    appId      : '314771152002676',                    // App ID from the app dashboard
    //channelUrl : '//WWW.YOUR_DOMAIN.COM/channel.html', // Channel file for x-domain comms
    status     : true,                                  // Check Facebook Login status
    xfbml      : true                                  // Look for social plugins on the page
  });

  // Here we subscribe to the auth.authResponseChange JavaScript event. This event is fired
  // for any authentication related change, such as login, logout or session refresh. This means that
  // whenever someone who was previously logged out tries to log in again, the correct case below 
  // will be handled. 
  FB.Event.subscribe('auth.authResponseChange', function(response) {
    // Here we specify what we do with the response anytime this event occurs. 
    if (response.status === 'connected') {
      // The response object is returned with a status field that lets the app know the current
      // login status of the person. In this case, we're handling the situation where they 
      // have logged in to the app.
      accessToken = response.authResponse.accessToken;
      $('.fb-authorize').addClass('hidden');
      FB.api('/me', function(response) {
        $('.fb-login').hide();
        $('.fb-user').removeClass('hidden').find('a > username').html(response.name);
      });
      fetchComments();
    } else if (response.status === 'not_authorized') {
      // In this case, the person is logged into Facebook, but not into the app, so we call
      // FB.login() to prompt them to do so. 
      // In real-life usage, you wouldn't want to immediately prompt someone to login 
      // like this, for two reasons:
      // (1) JavaScript created popup windows are blocked by most browsers unless they 
      // result from direct interaction from people using the app (such as a mouse click)
      // (2) it is a bad experience to be continually prompted to login upon page load.
      $('.fb-authorize').removeClass('hidden');
    } else {
      // In this case, the person is not logged into Facebook, so we call the login() 
      // function to prompt them to do so. Note that at this stage there is no indication
      // of whether they are logged into the app. If they aren't then they'll see the Login
      // dialog right after they log in to Facebook. 
      // The same caveats as above apply to the FB.login() call here.
      FB.login();
    }
  });

  // Cache our template
  template = _.template($('#item-template').html());

  // Refresh button callback
  $('.btn-refresh').click(fetchComments);

  $('.fb-user .logout').click(function(e) {
    e.preventDefault();
    FB.logout(function() {
      location.reload();
    });
  });

  $('.fb-login a').click(function() {
    FB.login();
  });

  $('.authorize').click(function(e) {
    FB.login();
  });
};

// Load the SDK asynchronously
(function(d, s, id){
   var js, fjs = d.getElementsByTagName(s)[0];
   if (d.getElementById(id)) {return;}
   js = d.createElement(s); js.id = id;
   js.src = "//connect.facebook.net/en_US/all.js";
   fjs.parentNode.insertBefore(js, fjs);
 }(document, 'script', 'facebook-jssdk'));

var TYPES = {
  0: 'Orange Juice',
  1: 'Potato Chips'
};

function addGift(url, sender, type, date, text) {
  var html = template({
    type: TYPES[type],
    sender: sender,
    url: url,
    date: date,
    text: text
  });

  if (first)
    $('#list').append(html);
  else
    $('#list').prepend(html);
}

function kickTimer() {
  clearTimeout(timerId);
  timerId = setTimeout(fetchComments, 10000);
}

function fetchComments(e) {
  if (e)
    e.preventDefault();

  var btn = $('.btn-refresh');
  btn.button('loading');
  var query = 'SELECT text, time FROM comment WHERE post_id IN ( SELECT post_id FROM stream WHERE source_id = 129079313911235 AND type IN (80, 128, 247) LIMIT 1 )';
  if (time) {
    query += ' AND time > ' + time;
  }
  query += ' ORDER BY time DESC';

  FB.api({
    method: 'fql.query',
    query: query,
    access_token: accessToken
  }, function(response) {
    btn.button('reset');

    if (response.length > 0) {
      time = response[0].time;
    } else {
      return kickTimer();
    }

    if (first)
      $('#list').html('');

    $('#list li.new').removeClass('new');

    for (var i in response) {
      var comment = response[i];
      var filtered = comment.text.match(/http[s]?:\/\/apps.facebook.com\/criminalcase\/reward\.php\?reward_key\=[0-9a-fA-F]+&sender=([0-9]+)&reward_type=([0-9])/i);
      var trimmed = comment.text.replace(/http[s]?:\/\/apps.facebook.com\/criminalcase\/reward\.php\?reward_key\=[0-9a-fA-F]+&sender=[0-9]+&reward_type=[0-9][a-zA-Z0-9\=&_]+/i, '');
      if (filtered)
        addGift(filtered[0], filtered[1], filtered[2], new Date(comment.time * 1000), trimmed);
    }

    first = false;
    kickTimer();
  });
}
