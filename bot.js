// TO DO:
//  1. Fix ampersand?
//  2. Split long tweets into multiple?
//  3. Figure out how to deal with media
//  4. Make use of tweet entities
//  5. Integrate with @POTUS account
console.log("The bot is starting");

require('dotenv').config()
var Twit = require('twit');

var T = new Twit({
  consumer_key: process.env.CONSUMER_KEY,
  consumer_secret: process.env.CONSUMER_SECRET,
  access_token: process.env.ACCESS_TOKEN,
  access_token_secret: process.env.ACCESS_TOKEN_SECRET,
  timeout_ms: 60*1000,
});

var TRUMPID = '25073877';
var MYID = '268536594'; // @Renenenenee - for testing purposes
var followID = TRUMPID;

var stream = T.stream('statuses/filter', { follow: followID });

stream.on('connect', function (request) {
  console.log("[twit] Attempting to connect...");
});

stream.on('connected', function (response) {
  console.log("[twit] Status code: %d, connection successful", response.statusCode);
});

stream.on('reconnect', function (request, response, connectInterval) {
  console.log("[twit] Status code: %d, reconnect scheduled in %d ms", response.statusCode, connectInterval);
});

stream.on('disconnect', function (disconnectMessage) {
  console.log("[twit] Stream disconnected with code %d, reason: ",
  disconnectMessage.disconnect.code, disconnectMessage.disconnect.reason);
});

stream.on('error', function (error) {
  console.log('[twit] Error code %d: %s. Status code: %d', error.code, error.message, error.statusCode);
});

stream.on('delete', function (deleteMessage) {
  console.log('[twit] Tweet id %s deleted', deleteMessage.delete.status.id_str);
});

stream.on('tweet', processTweet);

function processTweet(tweet) {
  if (tweet.user.id_str == followID) {
    console.log("[twit] Ope, he's tweeting!");

    if (tweet.is_quote_status) {
      if (tweet.retweeted_status) {
        var text = 'RT @' + tweet.retweeted_status.user.screen_name + ': ' + handleQuoted(tweet);
      }
      else {
        var text = handleQuoted(tweet);
      }
      truncatePostProfit(text, true);
      return;
    }
    else if (tweet.retweeted_status) {
      var text = 'RT @' + tweet.retweeted_status.user.screen_name + ': ' + handleTruncate(tweet.retweeted_status);
    }
    else if (tweet.in_reply_to_user_id) {
      var text = '.' + handleTruncate(tweet);
    }
    else {
      var text = handleTruncate(tweet);
    }
    truncatePostProfit(text, false)
  }
}

function handleTruncate(tweet) {
  if (tweet.truncated) {
    return tweet.extended_tweet.full_text;
  }
  else {
    return tweet.text;
  }
}

function handleQuoted(tweet) {
  var text = tweet.text + '\n@' + tweet.quoted_status.user.screen_name + ': "' + handleTruncate(tweet.quoted_status);
  return text;
}

// Maybe another implementation would be to split long tweets into multiple!
function truncatePostProfit(text, isQuote) { // if isQuote is true, tag receives a closing "
  console.log
  var MAXTWEETLENGTH = 280;
  var tag = ' #TrumpVerbatim'

  // quick and dirty replace
  text = text.replace("&amp;", "&")
  var rawLength = text.length;

  if (isQuote) {
    tag = '"' + tag;
    if ((rawLength + tag.length) > MAXTWEETLENGTH) {
      tag = '...' + tag;
      text = text.substring(0, MAXTWEETLENGTH-tag.length-1); // there's an extra character in there? for some reason????
    }
  }
  else {
    if ((rawLength + tag.length) > MAXTWEETLENGTH) {
      tag = '...' + tag;
      text = text.substring(0, MAXTWEETLENGTH-tag.length);
    }
  }

  var tweet_body = text + tag;
  T.post('statuses/update', {status: tweet_body}, function(err, data, response) {
    if (err) {
      console.log('[twit] Could not post tweet: "%s"\nERROR %d: %s', tweet_body, err.code, err.message);
    }
    else {
      console.log('[twit] Tweet "%s" successfully posted!', tweet_body);
    }
  });
}
