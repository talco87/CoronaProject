const express = require('express');
const SQLdb = require('../connectionsToDBs/mySQL')
const Mongodb = require('../connectionsToDBs/mongoDB')
const coronaRoutes = express.Router();
const user_model = require('../models/userModel');
const log_model = require('../models/logModel');
var bodyParser = require('body-parser');
const session = require('express-session');
var urlencodedParser = bodyParser.urlencoded({ extended: false });
const bcrypt = require('bcrypt');// להצפנת הסיסמה
const BASE_URL = '/corona';
const nodemailer = require('nodemailer');
const myFunctions = require('./myFunctions');
const Axios = require('axios'); // משמש לביצוע פניות לשרתים נוספים וקבלת תשובה
const transporter = nodemailer.createTransport({
    host: "outlook.office365.com",
    port: 587,
    auth: {
        user: 'CoronaProjectBIU@outlook.com',
        pass: 'Corona1234',
    },
    tls: {
        rejectUnauthorized: false
    }
});
var options = {
    from: 'CoronaProjectBIU@outlook.com',
    text: 'היי, תודה שבחרת להשתמש בשירות שלנו, הנה הנתונים שביקשת!'
}

coronaRoutes.use(
    session({
        secret: "key that will sign cookie",
        resave: false,
        saveUninitialized: false,
    })
);


var mylog = function (req, res, next) { // log function
    console.log(res.status)
    var newLog = new log_model({
        method: req.method,
        path: req.path,
        userMail: req.session.userMail,
        statusCode: res.statusCode
    })
    newLog.save(function (err, the_log) {
        if (!err)
            console.log('Successfully stored the log:', the_log);
        else
            console.log('Could not Save the log', the_log)
    });
    next();
}

coronaRoutes.use(mylog) // ביצוע הלוג בכל נתיב

//HOME
citys_list = '';
coronaData = '';
flag = true;
sentStatus = false;
last_date_db = '';
let first_date_db = '2020-03-11';
SQLdb.query('select * from cities_names_codes ORDER BY City_Name', (err, result) => {
    if (err) {
        flag = false;
        return console.log(err);
    }
    else {
        citys_list = Object.values(JSON.parse(JSON.stringify(result)));
    }
});
SQLdb.query('select max(Date) as Date from city_status_vaccine_total', (err, result) => {
    if (err) {
        flag = false;
        return console.log(err);
    }
    else {
        last_date_db = myFunctions.dateFormat(result[0]['Date'], 'form');
    }
});
coronaRoutes.get('/', function (req, res) {
    let city = req.session.userCity ? req.session.userCity : 472
    res.render('home.pug', { base_url: BASE_URL, citys_list: citys_list, userFirstName: req.session.firstName, askedForData: false, rows: [], Last_date_db: last_date_db, city_code: city, first_date_db: first_date_db })
});

coronaRoutes.post('/', urlencodedParser, async function (req, res) {
    var error = "";
    var { city_code, start_date, end_date, sendToMail } = req.body;
    error = myFunctions.dateValidator(start_date, end_date, last_date_db);
    if (error == "" && !sendToMail) { // first POST
        SQLdb.query(`select * from city_status_vaccine_total where city_code=? and date >= ? and date <= ? ORDER BY Date`, [city_code, start_date, end_date], (err, result) => {
            if (err) {
                return console.log(err);
            }
            else {
                coronaData = Object.values(JSON.parse(JSON.stringify(result)));
                DatesData = [];
                for (let i = 0; i < coronaData.length; i++) {// החלפת התצוגה לתצוגה ישראלית
                    coronaData[i].Date = new Date(coronaData[i].Date);
                    DatesData.push(parseFloat(myFunctions.dateFormat(coronaData[i].Date, 'grph')));
                    coronaData[i].Date = myFunctions.dateFormat(coronaData[i].Date, 'tbl');
                }

                //Graphs data
                Dates = [];
                Accumulated_Verified_Cases_graph = [];
                Accumulated_Recovered_graph = [];
                Accumulated_Deaths_graph = [];
                Accumulated_Number_Of_Tests_graph = [];

                for (i = 0; i < coronaData.length; i++) {
                    Accumulated_Verified_Cases_graph.push(coronaData[i].Accumulated_Verified_Cases);
                    Accumulated_Recovered_graph.push(coronaData[i].Accumulated_Recovered);
                    Accumulated_Deaths_graph.push(coronaData[i].Accumulated_Deaths);
                    Accumulated_Number_Of_Tests_graph.push(coronaData[i].Accumulated_Number_Of_Tests);
                    coronaData[i].index=i
                }
                res.render('home.pug', { base_url: BASE_URL, DatesData: DatesData, Accumulated_Verified_Cases: Accumulated_Verified_Cases_graph, Accumulated_Recovered: Accumulated_Recovered_graph, Accumulated_Deaths: Accumulated_Deaths_graph, Accumulated_Number_Of_Tests: Accumulated_Number_Of_Tests_graph, userFirstName: req.session.firstName, citys_list: citys_list, city_code: city_code, Start_date: start_date, end_date: end_date, Last_date_db: last_date_db, askedForData: true, rows: coronaData, first_date_db: first_date_db, coronaDataLength:coronaData.length })
            }
        });
    }
    else if (error != "") { // found error
        res.render('home.pug', { base_url: BASE_URL, userFirstName: req.session.firstName, citys_list: citys_list, city_code: city_code, Start_date: start_date, end_date: end_date, Last_date_db: last_date_db, error: error, askedForData: false, rows: coronaData, first_date_db: first_date_db })
    }
    else {// send to mail
        let Status = false
        if (sendToMail) {//שליחת מייל
            Status = await myFunctions.sendMail(coronaData, city_code, req.path, citys_list, transporter,options);
        }
        res.render('home.pug', { base_url: BASE_URL, DatesData: DatesData, Accumulated_Verified_Cases: Accumulated_Verified_Cases_graph, Accumulated_Recovered: Accumulated_Recovered_graph, Accumulated_Deaths: Accumulated_Deaths_graph, Accumulated_Number_Of_Tests: Accumulated_Number_Of_Tests_graph, userFirstName: req.session.firstName, citys_list: citys_list, city_code: city_code, Start_date: start_date, end_date: end_date, Last_date_db: last_date_db, askedForData: true, rows: coronaData, first_date_db: first_date_db, sentStatus: Status })
    }
});

// LOGIN
coronaRoutes.get('/login', function (req, res) {
    var error = "";
    res.render('login.pug', { base_url: BASE_URL })
});
coronaRoutes.post('/login', urlencodedParser, async function (req, res) {
    var error = "";
    const { userMail, userPassword } = req.body;// ייבוא בפקודה אחת
    const user = await user_model.findOne({ 'mail': userMail });
    if (!user) {// לא נמצא משתמש במסד
        console.log('there is no user')
        error = "שם המשתמש או הסיסמה שגויים";
        res.render('login.pug', { base_url: BASE_URL, error, userMail: userMail })
        return;
    }
    const isMatch = await bcrypt.compare(userPassword, user.password);
    if (isMatch) {
        // שמירת נתוני המשתמש בסשן
        req.session.firstName = user.firstName;
        req.session.userMail = user.mail;
        req.session.userCity = user.city
        options.to = user.mail,
            res.redirect(BASE_URL);
    }
    else {
        error = "שם המשתמש או הסיסמה שגויים";
        res.render('login.pug', { base_url: BASE_URL, error, userMail: userMail })
    }
});

// REGISTER 
coronaRoutes.get('/register', function (req, res) {
    var error = "";
    res.render('register.pug', { base_url: BASE_URL, citys_list: citys_list, error })
});

coronaRoutes.post('/register', urlencodedParser, function (req, res) {
    var error = "";
    const { userFirstName, userLastName, userMail, userPassword, city_code, userBirthday } = req.body;
    var note = "משתמש נוסף בהצלחה, נא לעבור להתחברות";
    error = myFunctions.nameValidator(userFirstName, "פרטי")
    if (error == "") {
        error = myFunctions.nameValidator(userLastName, "משפחה")
        if (error == "") {
            error = myFunctions.mailValidator(userMail)
            if (error == "") {
                error = myFunctions.passwordValidatior(userPassword)
                if (error == "") {
                    if (userBirthday)
                        error = myFunctions.birthdayValidator(userBirthday)
                }
            }
        }
    }
    // שיש שגיאה הוא לא נכנס ועובר לסיום עם הודעת שגיאה
    if (error == "") {
        // לא נמצאה שגיאה בטופס
        user_model.findOne({ mail: userMail }, async function (err, the_user) { // אם הוא לא מוצא זה אומר שהערך של נתון יהיה null
            if (err) {
                console.log(err)
                return;
            }
            else if (the_user) {
                error = "נסה שוב, יש משתמש רשום עם המייל הזה";
                res.render('register.pug', {
                    base_url: BASE_URL, citys_list: citys_list, FirstName: userFirstName, lastName: userLastName, mail: userMail,
                    password: userPassword, city_code: city_code, birthday: userBirthday, error
                })
            }
            else {// אין מייל שמור במערכת, הטופס תקין
                const hashedPass = await bcrypt.hash(userPassword, 12);// הצפנת הסיסמה 12 פעמים
                var user = new user_model({
                    firstName: userFirstName, lastName: userLastName, mail: userMail,
                    password: hashedPass, city: city_code, birthday: userBirthday
                });
                user.save(function (err, the_user) {
                    if (err) {
                        console.log(err)
                        return;
                    }
                    console.log('saved:', the_user);
                    res.render('register.pug', {
                        base_url: BASE_URL, citys_list: citys_list, FirstName: userFirstName, lastName: userLastName, mail: userMail,
                        city_code: city_code, birthday: userBirthday, note, status: true, error
                    })
                })
            }
        })
    }
    else // הטופס לא תקין
    {
        res.render('register.pug', {
            base_url: BASE_URL, citys_list: citys_list, FirstName: userFirstName, lastName: userLastName, mail: userMail,
            password: userPassword, city_code: city_code, birthday: userBirthday, error
        })
    }
});

//UPDATE USER
coronaRoutes.get('/updateuser', myFunctions.checkIfUserLogedIn, function (req, res) {
    var error = "";
    // הוצאת הנתון מהסשן
    let userMail = req.session.userMail;
    user_model.findOne({ mail: userMail }, function (err, user) {
        if (err)
            console.log(err);
        else {
            console.log(user);
            let userFirstName = user.firstName;
            let userLastName = user.lastName;
            let userMail = user.mail;
            let userCity = user.city;
            let userBirthday2 = new Date(user.birthday);
            let userBirthday = userBirthday2.toISOString().split('T')[0];

            res.render('updateUser.pug', {
                base_url: BASE_URL, citys_list: citys_list, changingPassword: false, userFirstName: userFirstName, userLastName: userLastName,
                userMail: userMail, userCity: userCity, userBirthday: userBirthday, error
            })
        }
    });
});

coronaRoutes.post('/updateuser', myFunctions.checkIfUserLogedIn, urlencodedParser, function (req, res) {
    var error = "";
    const { userFirstName, userLastName, city_code, userBirthday } = req.body;
    console.log(req.body)
    // הוצאת המייל מהסשן
    let userMail = req.session.userMail;
    var error = "";
    var note = "משתמש עודכן בהצלחה";
    error = myFunctions.nameValidator(userFirstName, "פרטי")
    if (error == "") {
        error = myFunctions.nameValidator(userLastName, "משפחה")
        if (error == "") {
            if (userBirthday)
                error = myFunctions.birthdayValidator(userBirthday)
        }
    }
    user_model.findOneAndUpdate({ mail: userMail }, { mail: userMail, firstName: userFirstName, lastName: userLastName, city: city_code, birthday: userBirthday }, function (err) {
        if (err || error != "") {
            res.render('updateUser.pug', {
                base_url: BASE_URL, citys_list: citys_list, userFirstName: userFirstName, userLastName: userLastName,
                userMail: userMail, userCity: city_code, userBirthday: userBirthday, error
            })
        }
        else {
            console.log('user updated successfuly...')
            req.session.firstName = userFirstName;
            req.session.userCity = city_code;
            res.render('updateUser.pug', {
                base_url: BASE_URL, citys_list: citys_list, userFirstName: userFirstName, userLastName: userLastName,
                userMail: userMail, userCity: city_code, userBirthday: userBirthday, note, error
            })
        }
    });
});
//LOG OUT
coronaRoutes.get('/logout', function (req, res) {
    req.session.destroy((err) => {
        if (err) throw err;
        res.redirect(BASE_URL);
    })
});
//FUTURE VAL
coronaRoutes.get('/futureValue', myFunctions.checkIfUserLogedIn, (req, res) => {
    var error = "";
    res.render('futureValue.pug', { base_url: BASE_URL, citys_list: citys_list, city_code: req.session.userCity, userFirstName: req.session.firstName, sentStatus: false, askedForData: false, error})
})

coronaRoutes.post('/futureValue', myFunctions.checkIfUserLogedIn, urlencodedParser,  async function (req, res) {
    var error = "";
    var { city_code, sendToMail } = req.body;
    last_date_db_fut = myFunctions.dateFormat(last_date_db, 'tbl');
    Future_dates = myFunctions.futureDates(last_date_db);
    if (!sendToMail) {
        Axios.get(`http://127.0.0.1:5000/?cityCode=${city_code}`).then((response) => {
            Accumulated_Verified_Cases2Split = response.data;
            Accumulated_Verified_Cases2_Pred=[];
            Accumulated_Verified_Cases2=[];

            for(let i=0; i<Accumulated_Verified_Cases2Split.length;){
                if(i <14){
                        Accumulated_Verified_Cases2[i] = Accumulated_Verified_Cases2Split[i]
                        Accumulated_Verified_Cases2_Pred[i] =Accumulated_Verified_Cases2Split[i]
                        i++
                }
                else{
                    Accumulated_Verified_Cases2_Pred[i] = Accumulated_Verified_Cases2Split[i]
                    i++
                    }
              }
            res.render('futureValue.pug', { base_url: BASE_URL, Accumulated_Verified_Cases22: Accumulated_Verified_Cases2, Accumulated_Verified_Cases22Pred: Accumulated_Verified_Cases2_Pred, last_date_db_fut: last_date_db_fut, askedForData: true, sentStatus: false, userFirstName: req.session.firstName, citys_list: citys_list, city_code: city_code, Future_dates: Future_dates, error })
        })
    }
    else {//שליחת מייל
            let Status = false
            if (sendToMail) {//שליחת מייל
                Status = await myFunctions.sendMail(Accumulated_Verified_Cases2, city_code, req.path, citys_list, transporter,options);
            }
            res.render('futureValue.pug', { base_url: BASE_URL, Accumulated_Verified_Cases22: Accumulated_Verified_Cases2, last_date_db_fut: last_date_db_fut, Accumulated_Verified_Cases22Pred: Accumulated_Verified_Cases2_Pred, askedForData: true, sentStatus: Status, userFirstName: req.session.firstName, citys_list: citys_list, city_code: city_code, Future_dates: Future_dates, error  })
    }
})
coronaRoutes.all('*', function (req, res) {// טיפול בנתיב שלא מוגדר
    if (res.status(404))
        res.render('pageNotFound.pug', { base_url: BASE_URL })
})
module.exports = coronaRoutes;
