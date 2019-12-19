/*
 * plugin based on Molleman et al. (2019). Unleashing the BEAST: a brief measure of human social information use. Evolution & Human Behaviour.
 */

jsPsych.plugins["beast"] = (function() {

  var plugin = {};

  plugin.info = {
    name: "beast",
    parameters: {
      trials: {
        type: jsPsych.plugins.parameterType.INT, // BOOL, STRING, INT, FLOAT, FUNCTION, KEYCODE, SELECT, HTML_STRING, IMAGE, AUDIO, VIDEO, OBJECT, COMPLEX
        default: 5
      },
      counts: {
        type: jsPsych.plugins.parameterType.INT,
        array: true,
        default: [98, 78, 59, 74, 69]
      },
      animals: {
        type: jsPsych.plugins.parameterType.STRING,
        array: true,
        default: ['bear', 'hamster', 'kangaroo', 'koala', 'lion', 'rabbit']
      },
      displayTime: {
        type: jsPsych.plugins.parameterType.INT,
        default: 6000,
        description: "How long the animals will be displayed for"
      },
      responseTime: {
        type: jsPsych.plugins.parameterType.INT,
        default: 1500000,
        description: "How long participants have to respond"
      }
    }
  };

  plugin.trial = function(display_element, trial) {

    //shuffle orders
    // console.log(trial.animals)
    var animals = jsPsych.randomization.shuffle(trial.animals);
    var counts = jsPsych.randomization.shuffle(trial.counts);

    plurals = {'walrus': 'walruses', 'fox': 'foxes'};

    // data saving
    var trial_data = {
      trials: trial.trials,
      counts: counts,
      animals: animals,
      responses: [],
    };

    // trial parameters
    var trial_count = 0;
    var sketchHeight = 480;
    var sketchWidth = 800;
    var buffer = 30;
    var potentialPositions = {x: 25, y: 15};
    var stage = 'initial';

    // set up html

    var css = '<style>';
    css += '.low {height: 50px; margin: auto;}';
    css += '#instructions-container {width: '+sketchWidth+'px; font-size: 12px}';
    css += '#beast-container {height: '+sketchHeight+'px; width: '+sketchWidth+'px; border: 1px solid black}';
    css += '.response {margin-right: 10px}';
    css += '</style>';
    var html = '<div id="instructions-container" class="low"></div>';
    html += '<div id="response-container" class="low"></div>';
    html += '<div id="beast-container"></div>';
    display_element.innerHTML = css + html;

    // trial vars
    var animalImgs = {};
    var animalPositions;
    var animal;
    var count;
    var display_start_time;
    var response_time;
    var time_on_screen;
    var social_info;
    var plural;

    // trial functions

    function getPlurals(animal){
      if(plurals[animal]){
        return plurals[animal];
      } else {
        return animal + 's';
      }
    }

    function displayAnimals(){
      display_start_time = Date.now();
      animalPositions = [];
      animal = animals[trial_count];
      count = counts[trial_count];
      plural = getPlurals(animal);
      $('#instructions-container').html('How many ' + plural + '?');
      $('#response-container').html('<input id="'+stage+'-response" class="response" type="text"></input><button id="submit">Submit</button>');
      $('#initial-response').focus();
      var actualPositions = _.sampleSize(_.range(potentialPositions.x*potentialPositions.y), count);
      actualPositions.forEach(function(d){
        var x = d%potentialPositions.x * ((sketchWidth-buffer)/potentialPositions.x)+12*Math.random()-6+buffer/2;
        var y = Math.floor(d/potentialPositions.x) * ((sketchHeight-buffer)/potentialPositions.y)+12*Math.random()-6+buffer/2;
        animalPositions.push({x: x, y: y});
      });
    }

    var beast_sketch = new p5(function( sketch ) {

      sketch.preload = function(){
        animals.forEach(function(animal){
          animalImgs[animal]= sketch.loadImage('img/beast/'+animal+'.png');
        });
      };

      sketch.setup = function(){
        sketch.createCanvas(sketchWidth, sketchHeight);
        sketch.frameRate(10);
        animals.forEach(function(animal){
          animalImgs[animal].loadPixels();
        });
        displayAnimals();
      };

      sketch.draw = function(){
        sketch.background(255);
        var time_on_screen = Date.now() - display_start_time;
        if(time_on_screen < trial.displayTime & stage == 'initial'){
          animalPositions.forEach(function(position){
            sketch.image(animalImgs[animal], position.x, position.y, 30, 30);
          });
        }
        if(time_on_screen > trial.responseTime){
          if(time_on_screen < trial.responseTime - 1000){
            sketch.textSize(20);
            sketch.text("Time out!", sketchWidth/2, sketchHeight/2, 80, 80);
          } else {
            timeOut();
          }
        }
      };

    }, 'beast-container');

    $('#response-container').on('click', function(e){
      if(e.target.id=='submit'){
        getResponse();
      }
    });

    $('body').keypress(function(e){
      if(e.which==13){
        getResponse();
      }
    });

    function timeOut(){
      var response = $('.response').val();
      saveResponse('timeout_'+response, stage);
      alert("You didn't answer within the 15 second time limit. You're meant to just estimate the number of animals, not count them one by one.");

      advanceTrial();
    }

    function socialStage(response){
      display_start_time = Date.now();
      stage = 'social';
      var direction;
      if(response < count){
        direction = 1;
      } else if (response > count){
        direction = -1;
      } else {
        direction = _.sample([-1, 1]);
      }
      var delta = _.sample([0.16, 0.18, 0.20, 0.22, 0.24]);
      social_info = Math.floor((1+direction*delta)*response);
      plural = getPlurals(animal);
      $('#instructions-container').html('You guessed <b>'+response+'</b>. Previously, another Turker guessed <b>'+ social_info + '</b>. You can stick with your initial guess or change it. How many ' + plural + ' do you think there were?');
      $('#response-container').html('<input id="'+stage+'-response" class="response" type="text"></input><button id="submit">Submit</button>');
      $('#social-response').focus();
    }

    function advanceTrial(){
      if(trial_count < animals.length-1){
        stage = 'initial';
        trial_count += 1;
        displayAnimals();
      } else {
        finish_trial();
      }
    }

    function saveResponse(response,stage,social='NA'){
      var rt = Date.now() - display_start_time;
      trial_data.responses.push({count: count, response: response, animal: animal, stage: stage, social: social, rt: rt});
    }

    function getResponse(){
      var response = $('.response').val();
      var re = /^ *\d+ *$/;
      if(re.test(response)){
        if(response >= 50 & response <= 130){

          if(stage == 'initial'){
            saveResponse(response,stage);
            socialStage(response);
          } else {
            advanceTrial();
            saveResponse(response,stage,social_info);
          }
        } else {
          alert("There are between 50 and 130 animals. Please enter a number in that rage.");
        }
      } else {
        alert("You've entered something other than a number. Please - only use numbers in the response. Perhaps you've accidentally added a space or punctuation.");
      }
    }

    function finish_trial(){
      $('body').unbind();
      trial_data.task_end_time = Date.now();
      trial_data.duration = trial_data.task_end_time - trial_data.task_start_time;
      beast_sketch.remove();
      display_element.innerHTML = '';
      jsPsych.finishTrial(trial_data);
      console.log(trial_data);
    }

    $( document ).ready(function() {
      // trial_start = Date.now(); // tracking each separate trial
      trial_data.task_start_time = Date.now(); // tracking overall time
    });

  };

  return plugin;
})();
