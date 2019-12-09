
const _  = require('./libraries/lodash.min.js');

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

function inRange(array){
  // check if all values in range (0, 1)
  var in_range = _.reduce(array, function(acc, d){
    if(d >= 0 & d <= 1){
      acc += 1;
    }
    return acc;
  }, 0);
  return in_range;
}

function shiftArray(random_array, mu){
  // set mean of random social opinion as close to mu as possible
  console.log('input:', random_array);
  console.log('mu:', mu);
  var info_mean = _.mean(random_array);
  var diff = mu - info_mean;
  console.log('diff:', diff);
  var shifted = weightAdjustments(random_array, diff);
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
    console.log('distances:', distances);
    // normalise distances
    var total = _.sum(distances);
    console.log('total:', total);
    var adjusted = _.map(array, function(d, i){
      return d + array.length*distance*distances[i]/total;
    });
    console.log('adjusted:', adjusted)
    return adjusted
  }
