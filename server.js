const express = require('express');
const coronaRoutes = require('./routes/coronaRouts');
var app = express();
app.set('view engine', 'pug');
app.use('/corona', coronaRoutes);
app.use(express.static('public'));
app.listen(8080, function () {
    console.log("conection was created to port: 8080");
});