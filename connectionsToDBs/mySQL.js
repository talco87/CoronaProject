const mysql = require('mysql');
const SQLdb = mysql.createConnection({
    host: 'localhost',
    user: 'sqlUser',
    port: '3306',
    password: 'Corona1234!',
    database: 'corona',
});
SQLdb.connect((err) => {
    if (err){
        console.log(err.message);
        return;
    }
    else{
        console.log("connected to MYSQL database");
    }
});

module.exports=SQLdb;
