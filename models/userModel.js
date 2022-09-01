var mongoose = require('mongoose');
// Create the schema
/*
var user_schema = new mongoose.Schema({
    firstName: String,
    lastName: String,
    mail: String,
    password: String,
    city: String,
    birthday: Date
});*/

var user_schema = new mongoose.Schema({
    firstName:{type:String, required:[true,'first name is missing']},
    lastName:{type:String, required:[true,'last name is missing']},
    mail:{type:String,unique:true, required:[true,'mail is missing or already exsist']},
    password:{type:String,required:[true,'password is missing']},
    city:String,
    birthday:Date
});

// Create the model
var user_model = mongoose.model('users', user_schema);
module.exports = user_model;
