const mongoose = require('mongoose');
// Create the schema
var log_schema = new mongoose.Schema({
    method:{type:String, 
        enum:{values:['GET','POST'], // req.body return uppercase value
        message:'Undefined Method value {VALUE}'}}, 
    when:{type:Date,default: Date.now()},
    path:String,
    userMail:{type:String,default:'User Do Not Sign In Yet'},
    statusCode: {type:Number}
    
});

// Create the model
var log_model = mongoose.model('log',log_schema);
module.exports = log_model;
        