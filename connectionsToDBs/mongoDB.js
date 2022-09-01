const mongoose = require('mongoose');
const mongoURI = 'mongodb+srv://coronaproject:corona1234@cluster0.yl8g2.mongodb.net/myFirstDatabase?retryWrites=true&w=majority';
options = { useNewUrlParser: true };
mongoose.connect(mongoURI, options);
const Mongodb = mongoose.connection;
Mongodb.on('error', function (err) {
    console.log("error connecting to server/db");
});
Mongodb.once('open', function () {
    console.log('connected to clould MongoDB-Atlas databse');
});

module.exports=Mongodb;
