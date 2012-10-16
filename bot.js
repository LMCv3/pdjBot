var phantom = require('phantom');
var config = require('./config');

phantom.create(function(ph) {
  console.log('start');
  
  ph.createPage(function(page) {
    // Route "console.log()" calls from within the Page context to the main Phantom context (i.e. current "this")
    page.set('onConsoleMessage', function (msg) { 
      if (msg.substring(0, 17) !== "Viewport argument") { //This is to prevent html viewport logs from appearing
        console.log(msg); 
      }
    });

    //Everything starts here, open the main plug.dj webpage.
    page.open(encodeURI("http://www.plug.dj"), function(status){
      
      if ('success' === status)
      {
        //This function is a bitch, it doesn't like variables from outside AT ALL. To hack this add the variable here and at the bottom.
        evaluate(page, function(config){
        
          var url = window.location.href;
           
          if (url === 'http://www.plug.dj/')
          {
            if (0 != $('#twitter').length)
            {
              console.log("Redirect to twitter oauth");
              $('#twitter').click();
            }
            else
            {
              console.log('Successfully logged in, redirect to coding-soundtrack');
              window.location.href = 'http://www.plug.dj/coding-soundtrack/';
            }
          }
          else if (url.substring(0,43) === 'https://api.twitter.com/oauth/authenticate?')
          {
            if (typeof(document.getElementById('username_or_email')) != 'undefined') {
              console.log("Submitting credentials to twitter");
              document.getElementById('username_or_email').value = config.username;
              document.getElementById('password').value = config.password; 
              document.getElementById('oauth_form').submit();
              console.log('Submission complete');
            }
          }
          else if (url === 'https://api.twitter.com/oauth/authenticate')
          {
            var ps = document.getElementsByTagName('p'),
                l = ps.length;
            for (var i=0; i<l; i++)
            {
              if (ps[i].innerHTML.match(/Invalid user name or password/))
              {
                throw "invalid username/password for twitter?";
                return;
              }
            }
          }
          else if (url === 'http://www.plug.dj/coding-soundtrack/')
          {
          
            //INITIALIZE BOT HERE, We check our variable first to make sure we dont init multiple times
            if (!window.jarplug)
            {
              window.jarplug = {};
              window.djData = [];
              console.log("-|-|-|-|-Bot Ready-|-|-|-|-");
              
              /**Event listeners**/
              API.addEventListener(API.CHAT, function(data){
                if (data.message.substr(0,1) === "/"){
                  command(data);
                }

                console.log(" - " + data.from + " : " + data.message  + " (ID: " + data.fromID + " )");
                
                
                //Update dj idle timers on messages
                djs = API.getDJs();
                for (var i = 0; i < djs.length; ++i) {
                  if (typeof(window.djData[djs[i].id]) != 'undefined') {
                    if (djs[i].id == data.fromID) {
                      window.djData[djs[i].id].lastActive = new Date().getTime();
                    }
                  } else {
                    window.djData[djs[i].id] = {
                        username : djs[i].username
                      , lastActive : new Date().getTime()
                    };
                  }
                }
                
              });
              
              //Update djs object with any new djs
              API.addEventListener(API.DJ_UPDATE, function(djs) {

                for (var i = 0; i < djs.length; ++i) {
                  if (typeof(window.djData[djs[i].id]) == 'undefined') {
                    window.djData[djs[i].id] = {
                        username : djs[i].username
                      , lastActive : new Date().getTime()
                    };
                  }
                }
                
              });
              
              API.addEventListener(API.DJ_ADVANCE, function(djs) {
                if ($('#button-vote-positive').length != 0) {
                  setTimeout(function(){
                    $('#button-vote-positive').click();
                  },761);
                } else {
                  console.log("couldn't find upvote");
                }
                
              });
              
              
              
              /**COMMANDS**/
              function command(data) {
                var cmd = data.message;
                var tokens = cmd.substr(1, cmd.length).split(" ");
                console.log("Command " + tokens[0]);
                
                switch (tokens[0])
                {
                  case 'about':
                  case 'commands':
                    API.sendChat("http://github.com/unusualbob/pdjBot");
                    break;
                  case 'idle':
                  case 'djs':
                    getIdleDjs();
                    break;
                  case 'bitch':
                    API.sendChat('Not a lot of things are against the rules, but bitching about the music is. Stop being a bitch.');
                    break;
                  case 'rules':
                    API.sendChat('No song limits, no queues, no auto-dj. Pure FFA. DJ\'s over 10 minutes idle (measured by chat) face the [boot]. See /music for music suggestions, though there are no defined or enforced rules on music. More: http://goo.gl/b7UGO');
                    break;
                  case 'afk':
                    API.sendChat('If you\'re afk at the end of your song for longer than 30 minutes you get warning 1. One minute later you get warning 2, another minute last warning, 30 seconds [boot].');
                    break;
                  case 'afpdj':
                  case 'aftt':
                    API.sendChat('-AFTT- AFPDJ is just as bad as AFK. DJ\'s must pay attention to chat, if you cannot do that then don\'t DJ during prime time. The purpose of these rules is so that active users who can pay attention to chat at their employer\'s expense can sit up on the decks.');
                    break;
                  case 'count':
                    API.sendChat('There are ' + API.getUsers().length + ' users.');
                    break;
                  case 'remaeus' :
                    API.sendChat("Hey @remæus close a few tabs so your chrome doesn't crash");
                    break;
                }
              }
              
              //Simple check to see if a given ID is in the list of admin IDs in config
              function admin(id) {
                if (config.adminIds.indexOf(id) != -1) {
                  return true;
                }
                return false;
              }
              
              //Gets the list of currently idle djs
              function getIdleDjs() {
                console.log('pre api');
                djs = API.getDJs();
                
                var msg = "";
                for (var i = 0; i < djs.length; ++i) {
                  console.log('dj ' + i);
                  if (typeof(window.djData[djs[i].id]) == 'undefined') {
                  
                    window.djData[djs[i].id] = {
                        username : djs[i].username
                      , lastActive : new Date().getTime()
                    };
                    
                  }
                  
                  idle = idleTime(djs[i].id);
                  msg += idle;
                  
                  if (i >= djs.length - 1) {
                    if (msg != "") {
                      API.sendChat(msg);
                    } else {
                      API.sendChat("Looks like no one is idle!");
                    }
                  } else if (idle != "") {
                    msg += " || ";
                  }
                }
              }
              
              //Calculates if a DJ is idle and returns a formatted idle string if so
              function idleTime(id) {
                console.log("idle: " + window.djData[id] + " : " + (new Date().getTime() - window.djData[id].lastActive));
              
                idle = Math.floor( ( new Date().getTime() - window.djData[id].lastActive) / 1000 );
                
                minutes = parseInt(idle / 60.0);
                if (minutes < 5) {
                  return "";
                }
                
                seconds = parseInt((idle % 60) * .6);
                
                if (seconds < 10) {
                  seconds = "0" + seconds;
                }
                
                return ( "@" + window.djData[id].username + " - " 
                      + minutes + ":" + seconds);
                
              }
            }
          }
          else
          {
            console.log("Unknown url: " + url);
          }
        }, config);
      }
      else
      {
        console.log("status: " + status);
        phantom.exit();
      }
    });
 
    //hack so we can pass variables into page.evaluate, dumb thing
    function evaluate(page, func) {
        var args = [].slice.call(arguments, 2);
        var str = 'function() { return (' + func.toString() + ')(';
        for (var i = 0, l = args.length; i < l; i++) {
            var arg = args[i];
            if (/object|string/.test(typeof arg)) {
                str += 'JSON.parse(' + JSON.stringify(JSON.stringify(arg)) + '),';
            } else {
                str += arg + ',';
            }
        }
        str = str.replace(/,$/, '); }');
        return page.evaluate(str);
    }
    
  });

});