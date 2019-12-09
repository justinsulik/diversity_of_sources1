/*
Description: jsPsych plugin for running a decision-making task that tests people's sensitivity to non-independence of information
Preferably load p5.min.js in the main experiment page (otherwise it will be downloaded from cdnjs.cloudflare.com)
Need to load jsStat in main expt page
Todo:
randomise anchors (currently 0-2 male; 3-5 female)
*/

jsPsych.plugins['source-choice'] = (function(){

  var plugin = {};

  plugin.info = {
    name: 'source-choice',
    parameters: {
      training: {
        type: jsPsych.plugins.parameterType.BOOLEAN,
        pretty_name: 'Training trial',
        default: false,
        description: 'If true, shows only the instructions so participants can see how a trial would work'
      },
      choice_type: {
        type: jsPsych.plugins.parameterType.STRING,
        pretty_name: 'Choice type',
        default: 'intentional',
        description: 'If "random", appears to be random selection; if "intentional", appears to be intentional selection'
      },
      agents: {
        type: jsPsych.plugins.parameterType.INT,
        default: 5,
        description: 'Number of agents. Gets overridden if it clashes with any of the social_info params'
      },
      diversity: {
        type: jsPsych.plugins.parameterType.STRING,
        default: 'high',
        description: 'If "high" then all TVs different; if "low" then all the same'
      },
      anchor_ids: {
        type: jsPsych.plugins.parameterType.INT,
        array: true,
        default: [0, 1, 2, 3, 4],
        description: 'Which anchor IDs to use (shuffle in main expt script)'
      },
      agreement: {
        type: jsPsych.plugins.parameterType.STRING,
        default: 'disagree',
        description: 'whether the townspeople will agree/disagree with participant'
      },
      town: {
        type: jsPsych.plugins.parameterType.STRING,
        default: "Smallville"
      },
      candidate: {
        type: jsPsych.plugins.parameterType.STRING,
        default: 'Bob Smith'
      },
      platform: {
        type: jsPsych.plugins.parameterType.STRING,
        default: "His platform involves increasing the town's education budget, building more bicycle paths, and instituting equal pay."
      },
      nominative: {
        type: jsPsych.plugins.parameterType.STRING,
        default: "he",
        description: "What pronoun to use for the mayoral candidate"
      }
    }
  };

  plugin.trial = function(display_element, trial){

    // set up basic html for trial

    var css = '<style id="jspsych-source-choice-css">'+
    '#mainSketchContainer {border: 1px solid black; position: relative;}'+
    '.instructions {position: absolute; left: 500px; width: 360px; text-align: left; font-size: 15px}'+
    '#instructions {margin-top: 30px;}'+
    '#instructions2 {margin-top: 260px;}'+
    '.hidden {color: grey;}'+
    '</style>';
    var html = '<div id="mainSketchContainer"><div id="instructions" class="instructions"></div>'+
    '<div id="instructions2" class="instructions"></div></div>';
    var button = '<br><button id="next">Next</button>';

    display_element.innerHTML = css + html;

    // check if p5 script is loaded
    if (window.p5){
        console.log('p5 already loaded...');
        createSketch();
    } else {
      $.ajax({
          url: "https://cdnjs.cloudflare.com/ajax/libs/p5.js/0.5.16/p5.min.js",
          dataType: "script",
          success: function() {
            console.log("p5 downloaded...");
            createSketch();
          }
      });
    }

    // an object for tracking the current state of the animation, and what should happen next

    var stateGraph = {
      'scenario': {
        // describe the problem/topic that is being decided
        instructions: function(){
          return "The town of "+trial.town+" is having an election for mayor. " + trial.candidate + " is in the running. "+trial.platform+
          button;
        },
        onClick: function(){
          trialState = 'priorEstimate';
          updateInstructions();
        }
      },
      'priorEstimate': {
        // give prior rating in response to scenario
        instructions: function(){
          return 'How likely do you think '+trial.candidate+' is to win? Rate your belief on the scale below (click scale to confirm).';
        },
        onClick: function(){
          // check if reponse given: advance or remind
          if(trial_data.prior_estimate){
            social_info = generateInfo();
            console.log(social_info);
            // update agents to reflect social_info
            updateAgentsBeliefs();
            trialState = 'priorConfidence';
            updateInstructions();
          } else {
            alert("Click on the bar to rate how likely you think it is");
          }
        }
      },
      'priorConfidence': {
        // give prior confidence
        instructions: function(){
          return 'How confident are you about your decision? Rate your confidence on the scale below (click scale to confirm).';
        },
        onClick: function(){
          // check if reponse given: advance or remind
          if(trial_data.prior_confidence){
            trialState = 'tvStart';
            updateInstructions();
          }
        }
      },
      'tvStart': {
        // explain how tvs will work
        instructions: function(){
          if(trial.choice_type=='random'){
            return "The people of "+trial.town+" get most of their information from TV. Click on each person's TV, which will select a <b>random</b> news channel for them to watch.";
          } else {
            return "The people of "+trial.town+" get most of their information from TV. Click on each person's remote control, and they will turn on a trusted news station.";
          }
        },
        onClick: function(){
          $('#instructions').html('');
        }
      },
      'tvsOn': {
        // give posterior rating in response to new data
        instructions: function(){
          return "Based on the news, the people of "+trial.town+" have each decided how likely they think "+trial.candidate+" is to win. Click 'next' to see their beliefs about his chances."+
          button;
        },
        onClick: function(){
            trialState = 'socialInfo';
            updateInstructions();
        }
      },
      'socialInfo': {
        // give social info
        instructions: function(){
          return "";
        },
        onClick: function(){
        }
      },
      'posteriorCheck': {
        // give posterior rating in response to new data
        instructions: function(){
          return "Click on the person that thinks "+trial.nominative+" has the highest chance.";
        },
        onClick: function(){
          if(trial_data.checks.posteriorCheck){
            trialState = 'posteriorEstimate';
            updateInstructions();
          }
        }
      },
      'posteriorEstimate': {
        instructions: function(){
          return "Have a look at people's updated opinions. What do you think "+trial.candidate+"'s chances are now?  Rate your confidence on the scale below (click scale to confirm).";
        },
        onClick: function(){
          if(trial_data.posterior_estimate){
            trialState = 'posteriorConfidence';
            updateInstructions();
          }
        }
      },
      'posteriorConfidence': {
        instructions: function(){
          return "How confident are you about your decision? Rate your confidence on the scale below (click scale to confirm).";
        },
        onClick: function(){
          if(trial_data.posterior_confidence){
            endTrial();
          }
        }
      }
    };

    // trial variables

    var trial_data = {checks: {}};
    var trialState = 'scenario';
    var estimate;
    var confidence;
    var displays;
    var thoughts;
    var agents;
    var social_info;
    var hide_agents = ['scenario', 'priorEstimate', 'priorConfidence'];
    var hide_tv = ['scenario', 'priorEstimate', 'priorConfidence', 'priorAgents'];
    var show_bar = ['priorEstimate', 'priorConfidence', 'posteriorEstimate', 'posteriorConfidence'];

    // trial functions

    function displayId(i){
      // depending on the trial condition (diversity = hi/low)
      // return a lookup dict to translate anchor # to anchor ID
      if(trial.diversity == 'low'){
        if(i==1){
          return 1;
        } else {
          return 0;
        }
      } else {
        if(i==3){
          return 0;
        } else {
          return i;
        }
      }
    }

    function endTrial() {
      mainSketch.remove();
      display_element.innerHTML = ''; // clear everything
      jsPsych.finishTrial(trial_data);
    }

    function allPosteriorsUpdated(){
      var updated = 0;
      thoughts.forEach(function(d,i){
        if(d.updated){
          updated += 1;
        }
      });
      if(updated == thoughts.length & trialState == 'socialInfo'){
        trialState = 'posteriorCheck';
        updateInstructions();
      }
    }

    function checkDisplays(){
      var on = 0;
       displays.forEach(function(d,i){
        if(d.stable){
          on+=1;
        }
      });
      if(on==displays.length & trialState == 'tvStart'){
        trialState = 'tvsOn';
        updateInstructions();
      }
    }

    function updateInstructions(){
      switch(trialState){
        case 'priorConfidence':
          $('#instructions2').html(stateGraph[trialState].instructions());
          $('#instructions').addClass('hidden');
        break;
        case 'tvStart':
          $('#instructions2').html('');
          $('#instructions').removeClass('hidden');
          $('#instructions').html(stateGraph[trialState].instructions());
        break;
        case 'posteriorConfidence':
          $('#instructions2').html(stateGraph[trialState].instructions());
          $('#instructions').addClass('hidden');
        break;
        default:
          console.log('here', trialState)
          $('#instructions').html(stateGraph[trialState].instructions());
      }
    }

    // set up the social data

    function pickMu(){
      // generate a mu parameter for the beta distribution;
      var mu;
      var prior = trial_data.prior_estimate;
      switch(trial.agreement){
        case 'agree':
          mu = prior;
          break;
        case 'disagree':
          if(prior == 0.5){
            // pick a random extreme
            mu = Math.floor(Math.random()*2);
          } else if (prior > 0.5){
            mu = prior - 0.4;
          } else {
            mu = prior + 0.4;
          }
          break;
        case 'neutral':
          mu = 0.5;
          break;
      }
      // avoid a narrow range around extreme estimates, by moving estimates towards the middle of the range;
      if(mu < 0.1){
        mu = 0.1;
      } else if (mu > 0.9){
        mu = 0.1;
      }
      return mu;
    }

    function randomBeta(mu){
      // generate random beta distribution
      var total = 4;
      var alpha = mu*total;
      var beta = total - alpha;
      var random_array = [];
      for(var i = 0; i < trial.agents; i++){
        var random_val = jStat.beta.sample(alpha, beta);
        random_array.push(random_val);
      }
      return random_array;
    }

    function shiftArray(random_array, mu){
      // set mean of random social opinion as close to mu as possible
      var info_mean = _.mean(random_array);
      var diff = mu - info_mean;
      var shifted = weightAdjustments(random_array, diff);
      return shifted;
    }

    function weightAdjustments(array, distance){
        // Distribute the adjustment proportionally (so that the values furthest from the extreme have the most to move)
        // calculate distance to boundary
        var distances;
        if(distance>0){
          distances = _.map(array, function(d){
            return _.max([1 - d, 0]);
          });
        } else {
          distances = _.map(array, function(d){
            return _.min([d, 1]);
          });
        }
        // normalise distances
        var total = _.sum(distances);
        var adjusted = _.map(array, function(d, i){
          return d + array.length*distance*distances[i]/total;
        });
        return adjusted;
    }

    function splitLeaders(array){
      // avoid too close of an overlap between 1st and 2nd highest vals
      var max = _.max(array);
      var second = _.reduce(array, function(acc, val){
        if(val > acc[0] & val < acc[1]){
          acc[0] = val;
        }
        return acc;
      }, [0, max]);
      second = second[0];
      var downward = 0;
      var upward = 0;
      if(max - second < 0.06){
        var diff = 0.06 - (max - second);
        upward = Math.min(1-max,diff/2);
        downward = diff - upward;
      }
      // incorporate above, and avoid any outright zeros (otherwise there will be no bar to display)
      var array_edited = _.map(array, function(d){
        if(d<0.04){
          return 0.04;
        } else if(d==second){
          return d - downward;
        } else if(d==max){
          return d + upward;
        } else {
          return d;
        }
      });
      return array_edited;
    }

    function generateInfo(){
      var mu = pickMu();
      var random_array = randomBeta(mu);
      var centered_array = shiftArray(random_array, mu);
      var final_array = splitLeaders(centered_array);
      return final_array;
    }

    function updateAgentsBeliefs(){
      thoughts.forEach(function(d,i){
        d.belief = social_info[i];
        d.barWidth = d.distance*(d.belief);
        d.red = (1-d.belief)*255;
        d.green = d.belief*255;
      });
    }

/*
 P5.js Pseudo-classes for multiple sketches
*/
  var mainSketch;
  function createSketch(){
    mainSketch = new p5(function( sketch ) {

      // set global vars
      displays = [];
      thoughts = [];
      agents = [];

      // declare sketch variables
      var thought;
      var tvs = [];
      var backgrounds = [];
      var anchors = [];
      var jaws = [];
      var remotesImg = [];
      var remotes = [];

      var agentCount = trial.agents;
      var agentParts = {m: {hair: []}, f: {hair: {}}};
      var sketchWidth = 900;
      var sketchHeight = 600;
      var agentSize = 100;
      var thoughtSize = 100;
      var topMargin = 50;
      var passes = 4;
      var displaySize = {x: 141, y: 88};
      var displayOffset = {x: 10, y: 31};
      var tvSize = {x: 160, y: 160};
      var bodyColors = [{r: 255, g: 30, b: 30}, {r: 51, g: 158, b: 51}, {r: 227, g: 80, b: 234},
          {r: 247, g: 147, b: 35}, {r: 9, g: 202, b: 237}];
      var hairColors = [{r: 236, g: 236, b: 25}, {r: 160, g: 68, b: 11}, {r: 167, g: 113, b: 13},
          {r: 93, g: 51, b: 4}, {r: 39, g: 26, b: 11}];
      var headColors = [{r: 79, g: 44, b: 16}, {r: 220, g: 182, b: 83}, {r: 250, g: 235, b: 173},
          {r: 209, g: 160, b: 69}, {r: 124, g: 93, b: 35}];
      var legColors = [{r: 43, g: 107, b: 171}, {r: 114, g: 181, b: 249}, {r: 41, g: 83, b: 125},
          {r: 130, g: 150, b: 169}, {r: 194, g: 188, b: 175}];
      var feetColors = [{r: 0, g: 0, b: 0}, {r: 90, g: 63, b: 2}, {r: 204, g: 4, b: 4},
          {r: 164, g: 153, b: 169}, {r: 116, g: 87, b: 32}];
      bodyColors = _.shuffle(bodyColors);
      hairColors = _.shuffle(hairColors);
      headColors = _.shuffle(headColors);
      legColors = _.shuffle(legColors);
      feetColors = _.shuffle(feetColors);

      // sketch functions & pseudo-classes

      function barColor(proportion){
        var red = (1-proportion)*255;
        var green = proportion*255;
        var blue = 0;
        var alpha = 180;
        return {red: red, green: green, blue: blue, alpha: alpha};
      }

      function Rating(type){
        this.type = type;
        this.x = 500;
        if(this.type == 'estimate'){
          this.y = 200;
          this.labels = ['Very unlikely', 'Very likely'];
        } else {
          this.y = 350;
          this.labels = ['Very unsure', 'Very sure'];
        }
        this.width = 300;
        this.yOffset = 20;
        this.proportion = null;
        this.xval = null;

        this.displayMode = function(){
          if(this.type == 'confidence'){
            if(/Confidence/.test(trialState)){
              return 'show';
            } else {
              return 'hidden';
            }
          }
          if(this.type == 'estimate'){
            if(/Estimate/.test(trialState)){
              return 'show';
            } else if(/Confidence/.test(trialState)) {
              return 'background';
            } else {
              return 'hidden';
            }
          }
        };

        this.show = function(){
          if(show_bar.indexOf(trialState) != -1 & this.displayMode() != 'hidden'){
            sketch.push();
              sketch.translate(this.x, this.y);
              this.scale();
              this.bar();
              this.label();
            sketch.pop();
          }
        };

        this.scale = function(){
          if(!this.foreground() | this.displayMode() == 'background'){
            sketch.stroke(200);
          } else {
            sketch.stroke(0);
          }
          sketch.strokeWeight(2);
          sketch.line(0, this.yOffset, this.width, this.yOffset);
          for(var p = 0; p <= 1; p += 0.1){
            sketch.line(p*this.width, this.yOffset-6, p*this.width, this.yOffset+4);
          }
        };

        this.bar = function(){
          var color;
          var display = this.displayMode();
          if((this.over() & this.foreground()) | display == 'background'){
              if(display == 'background'){
                sketch.fill(200, 200, 200, 200);
              } else {
                this.xval = sketch.mouseX - this.x;
                if(this.xval < 0){
                  this.xval = 0;
                }
                if(this.xval > this.width){
                  this.xval = this.width;
                }
                this.proportion = this.xval/this.width;
                color = barColor(this.proportion);
                sketch.fill(color.red, color.green, color.blue, color.alpha);
              }
              sketch.rect(0, this.yOffset-5, this.xval, 10);
            }
        };

        this.label = function(){
          sketch.push();
            sketch.textSize(10);
            sketch.strokeWeight(0);
            if(this.proportion){
                if(this.over()){
                  var chance = Math.round(this.proportion*100);
                  var chance_string = chance + '%';
                  sketch.text(chance_string, this.width*this.proportion, 10);
                }
            }
            if(!this.foreground() | this.displayMode() == 'background'){
              sketch.fill(200, 200, 200, 200);
            } else {
              sketch.fill(0);
            }
            sketch.text(this.labels[0], 0, 40);
            sketch.textAlign(sketch.RIGHT);
            sketch.text(this.labels[1], this.width, 40);
          sketch.pop();
        };

        this.foreground = function(){
          if(/Estimate/.test(trialState)){
            if(this.type=='estimate'){
              return true;
            } else {
              return false;
            }
          }
          if(/Confidence/.test(trialState)){
            if(this.type=='confidence'){
              return true;
            } else {
              return false;
            }
          }
        };

        this.clicked = function(){
          if(this.over() & show_bar.indexOf(trialState) != -1){
            switch(trialState){
              case 'priorEstimate':
                trial_data.prior_estimate = this.proportion;
              break;
              case 'priorConfidence':
                trial_data.prior_confidence = this.proportion;
              break;
              case 'posteriorEstimate':
                trial_data.posterior_estimate = this.proportion;
              break;
              case 'posteriorConfidence':
                trial_data.posterior_confidence = this.proportion;
              break;
            }
          }
        };

        this.over = function(){
          if(sketch.mouseX >= this.x - 3 &
            sketch.mouseX <= this.x + this.width + 3 &
            sketch.mouseY >= this.y &
            sketch.mouseY <= this.y+2*this.yOffset){
              return true;
          } else {
            return false;
          }
        };
      }

      function Thought(agentNumber){
        this.x = 70;
        this.y = agentNumber*((sketchHeight-topMargin)/agentCount);
        var start = {x: 10, y: 45};
        var end = {x: 90, y: 45};
        var scaleHeight = 10;
        var barHeight = 19;
        this.distance = end.x - start.x;

        this.show = function() {
          if(['socialInfo', 'posteriorCheck', 'posteriorEstimate', 'posteriorConfidence'].indexOf(trialState) != -1){
            sketch.push();
              sketch.translate(this.x, this.y);
              sketch.image(thought, 0, 0, thoughtSize, thoughtSize);
              this.scale();
              this.bar();
            sketch.pop();
          }
        };

        this.scale = function() {
          sketch.line(start.x, start.y, end.x, end.y);
          for(var p = 0; p <= 1; p += 0.1){
            sketch.line(start.x + p*this.distance, start.y - scaleHeight, start.x + p*this.distance, start.y + scaleHeight);
          }
        };

        this.bar = function(){
              sketch.fill(this.red, this.green, 0, 220);
              sketch.rect(start.x, start.y-barHeight/2, this.barWidth, barHeight);
        };
      }

      function Agent(gender, hairNo, agentNumber){
        this.agentNumber = agentNumber;
        this.y = agentNumber*((sketchHeight-topMargin)/agentCount) + topMargin;
        this.x = 150;

        this.body = agentParts[gender].body;
        this.head = agentParts[gender].head;
        this.hair = agentParts[gender].hair[hairNo];
        this.legs = agentParts[gender].legs;
        this.feet = agentParts[gender].feet;

        this.body.loadPixels();
        this.head.loadPixels();
        this.hair.loadPixels();
        this.legs.loadPixels();
        this.feet.loadPixels();

        this.show = function(){
          if(hide_agents.indexOf(trialState) == -1){
            sketch.push();
              sketch.translate(this.x, this.y);
              sketch.push();
                sketch.tint(bodyColors[this.agentNumber].r, bodyColors[this.agentNumber].g, bodyColors[this.agentNumber].b);
                sketch.image(this.body, 0, 0, agentSize, agentSize);
              sketch.pop();
              sketch.push();
                sketch.tint(headColors[this.agentNumber].r, headColors[this.agentNumber].g, headColors[this.agentNumber].b);
                sketch.image(this.head, 0, 0, agentSize, agentSize);
              sketch.pop();
              sketch.push();
                sketch.tint(hairColors[this.agentNumber].r, hairColors[this.agentNumber].g, hairColors[this.agentNumber].b);
                sketch.image(this.hair, 0, 0, agentSize, agentSize);
              sketch.pop();
              sketch.push();
                sketch.tint(legColors[this.agentNumber].r, legColors[this.agentNumber].g, legColors[this.agentNumber].b);
                sketch.image(this.legs, 0, 0, agentSize, agentSize);
              sketch.pop();
              sketch.push();
                sketch.tint(feetColors[this.agentNumber].r, feetColors[this.agentNumber].g, feetColors[this.agentNumber].b);
                sketch.image(this.feet, 0, 0, agentSize, agentSize);
              sketch.pop();
            sketch.pop();
          }
        };

        this.clicked = function(){
          if(['priorAgents','posteriorCheck'].indexOf(trialState) != -1 & this.over()){
            var supporter = _.reduce(thoughts, function(agg,thought,agentNumber){
              var belief;
              if(trialState == 'priorAgents'){
                belief = thought.prior;
              } else {
                belief = thought.posterior;
              }
              if(belief>agg.max){
                agg.max = belief;
                agg.agentNumber = agentNumber;
              }
              return agg;
            }, {max: 0, agentNumber: null});
            if(this.agentNumber == supporter.agentNumber){
              trial_data.checks[trialState] = true;
            } else {
              alert("No, look closely. Someone else thinks there is an even higher chance.");
            }
          }
        };

        this.over = function(){
          if(sketch.mouseX >= this.x &
             sketch.mouseX <= this.x + agentSize &
             sketch.mouseY >= this.y &
             sketch.mouseY <= this.y + agentSize){
               return true;
             } else {
               return false;
             }
        };
      }

      function Display(agentNumber, channel){
        this.agentNumber = agentNumber;
        this.passes = passes;
        this.tv = tvs[agentNumber];
        this.channel = channel;
        this.on = false;
        this.stable = false;
        this.y = agentNumber*((sketchHeight-topMargin)/agentCount) + topMargin;
        this.x = 290;
        this.jawOffset = 0;

        // for random channels, set up a random sequence of displays
        if(trial.choice_type == 'random'){
          var displaySequence = [];
          for(var i = 0; i<passes; i++){
            trial.anchor_ids.forEach(function(d,i){
              displaySequence.push(i);
            });
          }
          this.displaySequence = _.shuffle(displaySequence);
          this.displayIndex = this.displaySequence.length;
          this.channelIndex = this.displaySequence[this.displayIndex];
        }

        this.blankScreen = function(){
          sketch.push();
            sketch.translate(displayOffset.x, displayOffset.y);
            sketch.rect(0, 0, displaySize.x, displaySize.y);
          sketch.pop();
        };

        this.jawMove = function(){
          if(this.jawOffset == 0){
            this.jawOffset = 1;
          } else {
            this.jawOffset = 0;
          }
        };

        this.spinChannels = function(){
          if(this.displayIndex <= 0){
            this.channelIndex = this.channel;
            this.stable = true;
            if(trialState == 'tvStart' | trialState == 'tvsOn' | trialState == 'socialInfo'){
              this.jawMove();
            }
            if(trialState=='tvStart'){
              checkDisplays();
            }
          } else {
            this.displayIndex -= 1;
            this.channelIndex = this.displaySequence[this.displayIndex];
          }
          sketch.image(backgrounds[this.channelIndex], 0, 0, tvSize.x, tvSize.y);
          sketch.image(anchors[this.channelIndex], 0, 0, tvSize.x, tvSize.y);
          sketch.image(jaws[this.channelIndex], 0, this.jawOffset, tvSize.x, tvSize.y);
        };

        this.showLogo = function(){
          sketch.image(backgrounds[this.channel], 0, 0, tvSize.x, tvSize.y);
          sketch.image(anchors[this.channel], 0, 0, tvSize.x, tvSize.y);
          sketch.image(jaws[this.channel], 0, this.jawOffset, tvSize.x, tvSize.y);
          this.stable = true;
          if(trialState == 'tvStart' | trialState == 'tvsOn' | trialState == 'socialInfo'){
            this.jawMove();
          }
          if(trialState=='tvStart'){
            checkDisplays();
          }
        };

        this.displayTv = function(){
          if(hide_tv.indexOf(trialState) == -1){
            sketch.push();
              sketch.translate(this.x, this.y);
              sketch.scale(0.8);

              sketch.image(this.tv, 0, 0, tvSize.x, tvSize.y);
              sketch.push();
                if(this.on){
                  sketch.fill(255);
                } else {
                  sketch.fill(40);
                }
                // blank screen
                this.blankScreen();
                if(this.on){
                  if(trial.choice_type=='random'){
                    this.spinChannels();
                  } else {
                    this.showLogo();
                  }
                }
              sketch.pop();
            sketch.pop();
          }
        };

        this.clicked = function(e){
          if(trialState == 'tvStart' & trial.choice_type=='random'){
            if(sketch.mouseX >= this.x &
               sketch.mouseX <= this.x + displaySize.x &
               sketch.mouseY >= this.y &
               sketch.mouseY <= this.y + displaySize.y){
               this.on = true;
            }
          }
        };
      }

      function Remote(agentNumber){
        this.index = agentNumber;
        this.y = agentNumber*((sketchHeight-topMargin)/agentCount) + 1.2*agentSize;
        this.x = 150 + 0.85*agentSize;
        this.on = false;

        this.show = function(){
          if(hide_tv.indexOf(trialState) == -1){
            sketch.push();
              sketch.translate(this.x, this.y);
              if(this.on){
                sketch.rotate(0.85);
                this.on = false;
              } else {
                sketch.rotate(0.6);
              }
              sketch.imageMode(sketch.CENTER);
              sketch.image(remotesImg[this.index], 0, 0, 10, 30);
            sketch.pop();
          }
        };

        this.clicked = function(){
          if(trialState == 'tvStart' & trial.choice_type=='intentional'){
            if(sketch.mouseX >= this.x - 35 &
               sketch.mouseX <= this.x + 35 &
               sketch.mouseY >= this.y - 35 &
               sketch.mouseY <= this.y + 35){
                 this.on = true;
                 displays[this.index].on = true;
               }
          }
        };
      }

      // preload images

      sketch.preload = function() {

        thought = sketch.loadImage('img/thought.png');

        agentParts.f.body = sketch.loadImage('img/agents/f_body.png');
        agentParts.f.head = sketch.loadImage('img/agents/f_head.png');
        agentParts.f.hair[0] = sketch.loadImage('img/agents/f_hair_1.png');
        agentParts.f.hair[1] = sketch.loadImage('img/agents/f_hair_2.png');
        agentParts.f.hair[2] = sketch.loadImage('img/agents/f_hair_3.png');
        agentParts.f.feet = sketch.loadImage('img/agents/feet.png');
        agentParts.f.legs = sketch.loadImage('img/agents/f_legs.png');
        agentParts.m.body = sketch.loadImage('img/agents/m_body.png');
        agentParts.m.head = sketch.loadImage('img/agents/m_head.png');
        agentParts.m.hair[0] = sketch.loadImage('img/agents/m_hair_1.png');
        agentParts.m.hair[1] = sketch.loadImage('img/agents/m_hair_2.png');
        agentParts.m.hair[2] = sketch.loadImage('img/agents/m_hair_3.png');
        agentParts.m.feet = sketch.loadImage('img/agents/feet.png');
        agentParts.m.legs = sketch.loadImage('img/agents/m_legs.png');

        var factors = {gender: ['m', 'f'], hair: [0, 1, 2]};
        var ids = jsPsych.randomization.factorial(factors, 1);

        for(var j = 0; j<agentCount; j++){
          tvs[j] = sketch.loadImage('img/tv/tv_'+j+'.png');
          if(trial.choice_type=='intentional'){
            remotesImg[j] = sketch.loadImage('img/remotes/'+j+'.png');
          }
          var gender = ids[j].gender;
          var hair = ids[j].hair;
          agents[j] = new Agent(gender, hair, j);
        }
        trial.anchor_ids.forEach(function(d,i){
          backgrounds[i] = sketch.loadImage('img/tv/channel_'+d+'.png');
          anchors[i] = sketch.loadImage('img/tv/anchor_'+d+'_body.png');
          jaws[i] = sketch.loadImage('img/tv/anchor_'+d+'_jaw.png');
        });
      };

      // set up sketch

      sketch.setup = function() {

        thought.loadPixels();
        backgrounds.forEach(function(d,i){
          backgrounds[i].loadPixels();
          anchors[i].loadPixels();
          jaws[i].loadPixels();
        });
        agents.forEach(function(d,i){
          tvs[i].loadPixels();
          var k = displayId(i);
          displays[i] = new Display(i, k);
          thoughts[i] = new Thought(i, Math.random(), Math.random());
          if(trial.choice_type=='intentional'){
            remotesImg[i].loadPixels();
            remotes[i] = new Remote(i);
          }
        });
        sketch.createCanvas(sketchWidth, sketchHeight);
        sketch.frameRate(10);
        estimate = new Rating('estimate');
        confidence = new Rating('confidence');
        updateInstructions();

      };

      // draw sketch

      sketch.draw = function() {

        sketch.background(255);
        estimate.show();
        confidence.show();
        displays.forEach(function(d,i){
          d.displayTv();
        });
        thoughts.forEach(function(d,i){
          d.show();
        });
        agents.forEach(function(d,i){
          d.show();
        });
        if(trial.choice_type=='intentional'){
          remotes.forEach(function(d,i){
            d.show();
          });
        }
      };

      sketch.mousePressed = function(e){
        displays.forEach(function(display,i){
          display.clicked();
        });
        agents.forEach(function(agent,i){
          agent.clicked();
        });
        remotes.forEach(function(remote,i){
          remote.clicked();
        });
        estimate.clicked();
        confidence.clicked();
        if(['scenario', 'tvsOn'].indexOf(trialState) == -1){
          stateGraph[trialState].onClick();
        }
        console.log(trialState);
      };

    }, 'mainSketchContainer');

    $('body').on('click', function(e){
      if(['scenario', 'tvsOn'].indexOf(trialState) != -1 & e.target.id=='next'){
        stateGraph[trialState].onClick();
      }
    });

  }
};

return plugin;

})();
