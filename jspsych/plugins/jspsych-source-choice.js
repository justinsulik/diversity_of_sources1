/*
Description: jsPsych plugin for running a decision-making task that tests people's sensitivity to non-independence of information
Preferably load p5.min.js in the main experiment page (otherwise it will be downloaded from cdnjs.cloudflare.com)

Todo:
- redo pseudo-classes as actual classes
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
    '#mainSketchContainer {border: 1px solid black;}'+
    '</style>';
    var html = '<div id="mainSketchContainer"></div>';

    display_element.innerHTML = css + html;


    // an object for tracking the current state of the animation, and what should happen next
    var stateGraph = {
      'scenario': {
        // describe the problem/topic that is being decided
        next: 'priorsOwn',
        onClick: function(){
          trialState = 'priorsOwn';
        }
      },
      'priorsOwn': {
        // give prior rating in response to scenario
        next: 'priorsOther',
        onClick: function(){
          // check if reponse given: advance or remind
        }
      },
      'priorsOther': {
        // see agents' priors
        next: 'tvCondition',
        onClick: function(){

        }
      },
      'tvCondition': {
        // explain how tvs will work
        next: 'tvOn',
        onClick: function(){

        }
      },
      'tvOn': {
        // turn tvs on
        next: 'posterior',
        onClick: function(){

        }
      },
      'posterior': {
        // give posterior rating in response to new data
        next: 'priorsOwn',
        onClick: function(){

        }
      }

    };

    var trialState = 'scenario';

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
      var displays = [];
      var thoughts = [];
      var agentCount = 5;
      var agents = [];
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

      function Thought(agentNumber, prior, posterior){
        this.x = 70;
        this.y = agentNumber*((sketchHeight-topMargin)/agentCount);
        this.prior = prior;
        this.posterior = posterior;
        var start = {x: 10, y: 45};
        var end = {x: 90, y: 45};
        var distance = end.x - start.x;
        this.stage = 'prior';
        var change = this.posterior - this.prior;
        var changeStep = 0; // proportion of change to posterior
        var changeProportion = 0;
        this.red = 255/2;
        this.green = 255/2;
        this.barWidth = 0;

        this.show = function() {
          // if(['scenario', 'priorsOwn'].indexOf(trialState) == -1){
            sketch.push();
              sketch.translate(this.x, this.y);
              sketch.image(thought, 0, 0, thoughtSize, thoughtSize);
              this.scale();
              this.bar();
            sketch.pop();
          // }
        };

        this.scale = function() {
          sketch.line(start.x, start.y, end.x, end.y);
          for(var p = 0; p <= 1; p += 0.1){
            sketch.line(start.x + p*distance, start.y - 3, start.x + p*distance, start.y + 3);
          }
        };

        this.bar = function(){
            if(this.stage=='posterior'){
              if(changeStep < 10){// working directly with decimals here leads to unfortunate rounding errors
                changeStep += 1;
                changeProportion = changeStep/10;
              }
            }
            this.barWidth = distance*(this.prior + change*changeProportion);
            this.red = (1-(this.prior+change*changeProportion))*255;
            this.green = (this.prior+change*changeProportion)*255;
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
          // if(['scenario', 'priorsOwn'].indexOf(trialState) == -1){
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
          // }
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
        this.y = agentNumber*((sketchHeight-topMargin)/agentCount) + topMargin;
        this.x = 290;
        this.displayIndex = (logoNumber+1)%logoCount;

        this.spinLogos = function(){
          sketch.image(logos[this.displayIndex],0,0,this.displaySize.x,this.displaySize.y);
          if(this.passes <= 0){
            this.displayIndex = this.logoNumber;
            thoughts[agentNumber].stage = 'posterior';
          } else {
            if (this.displayIndex == this.logoNumber){
              this.passes -= 1;
            }
            this.displayIndex = (this.displayIndex+1)%logoCount;
          }
        };

        this.displayTv = function(){
          // if(['scenario', 'priorsOwn', 'priorsAgent'].indexOf(trialState) == -1){
            sketch.push();
              sketch.translate(this.x, this.y);
              sketch.scale(0.8);

              sketch.image(this.tv, 0, 0, tvSize.x, tvSize.y);
              sketch.push();
                sketch.translate(5, 5);
                sketch.fill(255);
                sketch.rect(0, 0, this.displaySize.x, this.displaySize.y);
                if(this.on){
                  this.spinLogos();
                }
              sketch.pop();
            sketch.pop();
          // }
        };

        this.clicked = function(e){
          if(sketch.mouseX >= this.x &
             sketch.mouseX <= this.x + this.displaySize.x &
             sketch.mouseY >= this.y &
             sketch.mouseY <= this.y + this.displaySize.y ){
             this.on = true;
          } else {
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

        for(var j = 0; j<agentCount; j++){
          tvs[j] = sketch.loadImage('img/tvs/'+j+'.png');
          var gender = _.sample(['m', 'f']);
          var hair = _.sample([0, 1, 2]);
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
          displays[i] = new Display(i, i);
          thoughts[i] = new Thought(i, Math.random(), Math.random());
        });
        sketch.createCanvas(sketchWidth, sketchHeight);
        sketch.frameRate(15);
      };

      // draw sketch

      sketch.draw = function() {

        sketch.background(255);
        displays.forEach(function(d,i){
          d.displayTv();
        });
        agents.forEach(function(d,i){
          d.show();
        });
        thoughts.forEach(function(d,i){
          d.show();
        });
      };

      sketch.mousePressed = function(e){
        displays.forEach(function(display,i){
          display.clicked();
        });
      };

    }, 'mainSketchContainer');

  }


};

  return plugin;

})();
