/*
Description: jsPsych plugin for running a decision-making task that tests people's sensitivity to non-independence of information
Preferably load p5.min.js in the main experiment page (otherwise it will be downloaded from cdnjs.cloudflare.com)
Need to load jsStat in main expt page
Todo:
- will need more logos - and check how logocount is used
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
      social_info_initial: {
        type: jsPsych.plugins.parameterType.FLOAT,
        pretty_name: 'Social info: initial values',
        array: true,
        default: [],
        description: 'A list of initial estimates for the social value. Optional; if none provided, random data will be generated based on participant\'s initial estimate'
      },
      social_info_final: {
        type: jsPsych.plugins.parameterType.FLOAT,
        pretty_name: 'Social info: final values',
        array: true,
        default: [],
        description: 'A list of final estimates for the social value. Optional; but do not combine with params "change" and "change_type"'
      },
      change: {
        type: jsPsych.plugins.parameterType.FLOAT,
        pretty_name: 'Change',
        default: null,
        description: 'How much, on average, opinions should change by. Works in combination with parameter change_type. If positive, increase initial estimates; if negative, decrease'
      },
      change_type: {
        type: jsPsych.plugins.parameterType.STRING,
        pretty_name: 'Change type',
        default: 'percent_remaining',
        description: 'If "percent_remaining", then change proportional to gap between estimate and 0/100% (depending on sign of parameter "change").'
      }
    }
  };

  plugin.trial = function(display_element, trial){

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

    // set up basic html for trial

    var css = '<style id="jspsych-source-choice-css">'+
    '#mainSketchContainer {border: 1px solid black; position: relative;}'+
    '.instructions {position: absolute; left: 500px; width: 360px; text-align: left; font-size: 15px}'+
    '#instructions {margin-top: 30px;}'+
    '#instructions2 {margin-top: 260px;}'+
    '.hidden {color: grey;}'+
    // '#next {margin-left: 20px}'+
    '</style>';
    var html = '<div id="mainSketchContainer"><div id="instructions" class="instructions"></div><div id="instructions2" class="instructions"></div></div>';
    var button = '<br><button id="next">Next</button>';

    display_element.innerHTML = css + html;

    // an object for tracking the current state of the animation, and what should happen next

    var stateGraph = {
      'scenario': {
        // describe the problem/topic that is being decided
        instructions: function(){
          return "The town of Smallville is having an election for mayor. Bob Smith is in the running. His platform involves increasing the town's education budget, building more bicycle paths, and instituting equal pay."+
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
          return 'How likely do you think Bob Smith is to win? Rate your belief on the scale below (click scale to confirm).';
        },
        onClick: function(){
          // check if reponse given: advance or remind
          if(trial_data.prior_estimate){
            if(social_info.initial.length==0){
              social_info.initial = generateInitial();
            }
            if(social_info.final.length==0){
              social_info.final = generateFinal();
            }
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
            trialState = 'priorAgents';
            updateInstructions();
          }
        }
      },
      'priorAgents': {
        // see agents' priors
        instructions: function(){
          return 'The people of Smallville have their own opinions. Have a look at how likely they think Bob Smith is to win. Click on the person that thinks he has the highest chance.';
        },
        onClick: function(){
          if(trial_data.checks.priorAgents){
            trialState = 'tvStart';
            updateInstructions();
          }
        }
      },
      'tvStart': {
        // explain how tvs will work
        instructions: function(){
          if(trial.choice_type=='random'){
            return "The people of Smallville get most of their information from TV. Click on each person's TV, which will select a <b>random</b> news channel for them to watch.";
          } else {
            return "The people of Smallville get most of their information from TV. Click on each person's remote control, and they will turn on a trusted news station.";
          }
        },
        onClick: function(){
          $('#instructions').html('');
        }
      },
      'tvsOn': {
        // give posterior rating in response to new data
        instructions: function(){
          return "Based on the news, some of them have changed their minds about Bob Smith's campaign. Click 'next' to see how they've changed their minds."+
          button;
        } ,
        onClick: function(){
            trialState = 'posteriorAgents';
            updateInstructions();
        }
      },
      'posteriorAgents': {
        // give posterior rating in response to new data
        instructions: function(){
          return "";
        },
        onClick: function(){
        }
      },
      'posteriorCheck': {
        // give posterior rating in response to new data
        instructions: function(){
          return "Click on the person that thinks he has the highest chance.";
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
          return "Have a look at people's updated opinions. What do you think Bob Smith's chances are now?  Rate your confidence on the scale below (click scale to confirm).";
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
    var displays = [];
    var thoughts = [];
    var agents = [];
    var hide_agents = ['scenario', 'priorEstimate', 'priorConfidence'];
    var hide_tv = ['scenario', 'priorEstimate', 'priorConfidence', 'priorAgents'];
    var show_bar = ['priorEstimate', 'priorConfidence', 'posteriorEstimate', 'posteriorConfidence'];

    // trial functions

    function endTrial() {
      display_element.innerHTML = ''; // clear everything
      mainSketch.remove();
      jsPsych.finishTrial(trial_data);
    }

    function allPosteriorsUpdated(){
      var updated = 0;
      thoughts.forEach(function(d,i){
        if(d.updated){
          updated += 1;
        }
      });
      if(updated == thoughts.length & trialState == 'posteriorAgents'){
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
        case 'priorAgents':
          $('#instructions2').html('');
          $('#instructions').removeClass('hidden');
          $('#instructions').html(stateGraph[trialState].instructions());
        break;
        case 'posteriorConfidence':
          $('#instructions2').html(stateGraph[trialState].instructions());
          $('#instructions').addClass('hidden');
        break;
        default:
          $('#instructions').html(stateGraph[trialState].instructions());
      }
    }

    // set up the social data
    var social_info = {};
    if(trial.social_info_initial.length>0){
      social_info.initial = trial.social_info_initial;
    } else {
      social_info.initial = [];
    }
    if(trial.social_info_final.length>0){
      social_info.final = trial.social_info_final;
    } else {
      social_info.final = [];
    }

    function generateInitial(){
      var total = 4;
      var mu = trial_data.prior_estimate;
      // avoid a narrow range around extreme estimates, by moving estimates towards the middle of the range;
      if(mu < 0.25){
        mu = 0.25;
      } else if (mu > 0.75){
        mu = 0.75;
      }
      // params for beta distribution
      var alpha = mu*total;
      var beta = total - alpha;
      var random_array = [];
      for(var i = 0; i < trial.agents; i++){
        var random_val = jStat.beta.sample(alpha, beta);
        random_array.push(random_val);
      }

      // avoid too close of an overlap between 1st and 2nd highest vals
      var max = _.max(random_array);
      var second = _.reduce(random_array, function(acc, val){
        if(val > acc[0] & val < acc[1]){
          acc[0] = val;
        }
        return acc;
      }, [0, max]);
      second = second[0];
      var downward = 0;
      var upward = 0;
      if(max - second < 0.05){
        var diff = 0.05 - (max - second);
        upward = Math.min(1-max,diff/2);
        downward = diff - upward;
      }
      // incorporate above, and avoid any outright zeros
      var random_array_edited = _.map(random_array, function(d){
        if(d==0){
          return 0.02;
        } else if(d==second){
          return d - downward;
        } else if(d==max){
          return d + upward;
        } else {
          return d;
        }
      });
      return random_array_edited;
    }

    function generateFinal(){
      var change;
      var updated_vals;
      if(trial.change){
        change = trial.change;
      } else {
        //if none specified, then use 0.5/-0.5
        if(trial_data.prior_estimate>0.5){
          change = -0.5;
        } else if (trial_data.prior_estimate<0.5){
          change = 0.5;
        } else {
          change = jsPsych.randomization.sampleWithoutReplacement([-0.5, 0.5], 1);
        }
      }
      switch(trial.change_type){
        case 'percent_remaining':
          updated_vals = _.map(social_info.initial, function(d,i){
            if(change > 0){
              console.log(d, 1-d, change, (1-d)*change, d+(1-d)*change);
              return d+(1-d)*change;
            } else {
              console.log(d, d+d*change);
              return d + d*change;
            }
          });
        break;
        //no other types implemented yet!
      }
      return updated_vals;
    }

    function updateAgentsBeliefs(){
      thoughts.forEach(function(d,i){
        d.prior = social_info.initial[i];
        d.posterior = social_info.final[i];
        d.change = d.posterior - d.prior;
      });
    }

/*
 P5.js Pseudo-classes for multiple sketches
*/
  var mainSketch;
  function createSketch(){
    mainSketch = new p5(function( sketch ) {



      // declare sketch variables
      var logoCount = 7;
      var thought;
      var logos = [];
      var tvs = [];
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
      var displaySizes = {
        0: {x: 150, y: 100},
        1: {x: 150, y: 92},
        2: {x: 150, y: 81},
        3: {x: 150, y: 93},
        4: {x: 150, y: 87}
      };
      var tvSize = {x: 160, y: 130};
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
            sketch.line(p*this.width, this.yOffset-4, p*this.width, this.yOffset+4);
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
              sketch.rect(0, this.yOffset-4, this.xval, 8);
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

      function Thought(agentNumber, prior, posterior){
        this.x = 70;
        this.y = agentNumber*((sketchHeight-topMargin)/agentCount);
        this.prior = prior;
        this.posterior = posterior;
        this.change = this.posterior - this.prior;
        this.updated = false;
        var start = {x: 10, y: 45};
        var end = {x: 90, y: 45};
        var distance = end.x - start.x;
        this.stage = 'prior';
        var changeStep = 0; // proportion of change to posterior
        var changeProportion = 0;
        this.red = 255/2;
        this.green = 255/2;
        this.barWidth = 0;

        this.show = function() {
          if(hide_agents.indexOf(trialState) == -1){
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
            sketch.line(start.x + p*distance, start.y - 3, start.x + p*distance, start.y + 3);
          }
        };

        this.bar = function(){
            if(trialState == 'posteriorAgents'){
              if(changeStep < 10){// working directly with decimals here leads to unfortunate rounding errors
                changeStep += 1;
                changeProportion = changeStep/10;
              } else {
                this.updated = true;
                allPosteriorsUpdated(); // check they've all been updated
              }
            } else {
              // console.log(trialState)
            }
            this.barWidth = distance*(this.prior + this.change*changeProportion);
            this.red = (1-(this.prior+this.change*changeProportion))*255;
            this.green = (this.prior+this.change*changeProportion)*255;
            sketch.fill(this.red, this.green, 0, 180);
            sketch.rect(start.x, start.y-2, this.barWidth, 4);
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
                // sketch.fill(0);
                // sketch.ellipse(0.58*agentSize, 0.4*agentSize, 6, 12)
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

      function Display(agentNumber, logoNumber){
        this.logoNumber = logoNumber;
        this.agentNumber = agentNumber;
        this.passes = passes;
        this.tv = tvs[agentNumber];
        this.displaySize = displaySizes[agentNumber];
        this.logo = logos[logoNumber];
        this.on = false;
        this.stable = false;
        this.y = agentNumber*((sketchHeight-topMargin)/agentCount) + topMargin;
        this.x = 290;
        this.displayIndex = (logoNumber+1)%logoCount;

        this.spinLogos = function(){
          sketch.image(logos[this.displayIndex],0,0,this.displaySize.x,this.displaySize.y);
          if(this.passes <= 0){
            this.displayIndex = this.logoNumber;
            this.stable = true;
            if(trialState=='tvStart'){
              checkDisplays();
            }
          } else {
            if (this.displayIndex == this.logoNumber){
              this.passes -= 1;
            }
            this.displayIndex = (this.displayIndex+1)%logoCount;
          }
        };

        this.showLogo = function(){
          sketch.image(logos[this.logoNumber],0,0,this.displaySize.x,this.displaySize.y);
          this.stable = true;
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
                sketch.translate(5, 5);
                if(this.on){
                  sketch.fill(255);
                } else {
                  sketch.fill(40);
                }
                sketch.rect(0, 0, this.displaySize.x, this.displaySize.y);
                if(this.on){
                  if(trial.choice_type=='random'){
                    this.spinLogos();
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
               sketch.mouseX <= this.x + this.displaySize.x &
               sketch.mouseY >= this.y &
               sketch.mouseY <= this.y + this.displaySize.y){
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

        for(var i = 0; i<logoCount; i++){
          logos[i] = sketch.loadImage('img/logos/'+i+'.png');
        }

        var factors = {gender: ['m', 'f'], hair: [0, 1, 2]};
        var ids = jsPsych.randomization.factorial(factors, 1);

        for(var j = 0; j<agentCount; j++){
          tvs[j] = sketch.loadImage('img/tvs/'+j+'.png');
          if(trial.choice_type=='intentional'){
            remotesImg[j] = sketch.loadImage('img/remotes/'+j+'.png');
          }
          var gender = ids[j].gender;
          var hair = ids[j].hair;
          agents[j] = new Agent(gender, hair, j);
        }
      };

      // set up sketch

      sketch.setup = function() {

        thought.loadPixels();
        logos.forEach(function(d,i){
          logos[i].loadPixels();
        });
        agents.forEach(function(d,i){
          tvs[i].loadPixels();
          if(trial.diversity == 'high'){
            displays[i] = new Display(i, i);
          } else {
            displays[i] = new Display(i, trial.agents+1);
          }
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
        agents.forEach(function(d,i){
          d.show();
        });
        thoughts.forEach(function(d,i){
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
