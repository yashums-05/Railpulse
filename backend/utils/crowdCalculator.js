
function calculateCrowd(passengers){
 return passengers > 500 ? "High" : "Normal";
}

module.exports = calculateCrowd;
