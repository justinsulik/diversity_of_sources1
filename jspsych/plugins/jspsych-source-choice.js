/*
Description: jsPsych plugin for running a decision-making task that tests people's sensitivity to non-independence of information
Preferably load p5.min.js in the main experiment page (otherwise it will be downloaded from cdnjs.cloudflare.com)

Author: Justin Sulik
Contact:
 justin.sulik@gmail.com
 justinsulik.com,
 twitter.com/justinsulik
 github.com/justinsulik
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

/*
 P5.js Pseudo-classes for multiple sketches
*/

  function createSketch(){
    var mainSketch = new p5(function( sketch ) {

      // declare sketch variables
      var logoCount = 7;
      var logos = [];
      var tvs = [];
      var agentCount = 5;
      var agents = {};
      var logoSize = {width: 100, height: 40};
      var logoOffset = 0;
      var logoVelocity = 40;
      var sketchWidth = 800;
      var sketchHeight = 600;
      var endIndex = 6;
      var passes = 5*logoCount + endIndex;

      // sketch functions & pseudo-classes

      function spinLogos(endIndex){
          if (passes > endIndex) {
            passes -= 1;
          }
          sketch.push();
            sketch.translate(0, 2*logoSize.height);
            sketch.push();
              sketch.translate(0, ((-1*passes)%logoCount)*logoSize.height);
              logos.forEach(function(d,i){
                sketch.image(logos[i], 0, i*logoSize.height, logoSize.width, logoSize.height);
              });
            sketch.pop();
          sketch.pop();
      }

      function bandit(agentNumber, endIndex){
        sketch.push();
        sketch.translate(agentNumber*(sketch.width/agentCount),0);
        spinLogos(endIndex);
        sketch.fill(255);
        sketch.stroke(255);
        sketch.rect(0,0,logoSize.width,logoSize.height*2);
        sketch.rect(0,logoSize.height*3,logoSize.width,logoSize.height*4);
        sketch.pop();

      }

      // preload images

      sketch.preload = function() {
        for(var i = 0; i<logoCount; i++){
          logos[i] = sketch.loadImage('img/logos/'+i+'.png');
        }
      };

      // set up sketch

      sketch.setup = function() {
        logos.forEach(function(d,i){
          logos[i].loadPixels();
        });
        sketch.createCanvas(sketchWidth, sketchHeight);
        sketch.frameRate(15);
      };

      // draw sketch

      sketch.draw = function() {

        sketch.background(255);
        bandit(0, endIndex);



        // sketch.image(, 25, 25);

        // sketch.fill(255);
        // sketch.rect()

      };

    }, 'mainSketchContainer');

  }
};

  return plugin;

})();
