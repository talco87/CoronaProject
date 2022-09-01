module.exports = {
    dateFormat(input_date, date_use) {    // המרת תאריך לתצוגה ישראלית כסטרינג
        input_date = input_date + 'UTC';
        input_date = new Date(input_date);

        if (date_use == 'tbl') {
            format_date = input_date.getDate() + '/' + (input_date.getMonth() + 1) + '/' + input_date.getFullYear();
            str_date = format_date.toString();
            return str_date;
        }
        if (date_use == 'form') {
            month = (input_date.getMonth() + 1).toString();
            day = input_date.getDate().toString();
            if (month.length == 1){
                month = '0' + month;
            }
            if (day.length == 1){
                day = '0' + day;
            }
            last_date_db = input_date.getFullYear() + '-' + month + '-' + day;
            return last_date_db;
        }
        if (date_use == 'grph') {
            format_date = input_date.getDate() + '.' + (input_date.getMonth() + 1);
            grph_date = format_date.toString();
            return grph_date;
        }
    },
    futureDates(last_date_db) {
        
        last_date_db_dt = new Date(last_date_db);
        futureDatesArr = [];
        for (i = 0; i < 14; i++) {
            last_date_db_dt.setDate(last_date_db_dt.getDate() + 1);
            futureDatesArr[i] = last_date_db_dt.getDate() + '.' + (last_date_db_dt.getMonth() + 1);
        }
        return futureDatesArr;
    },
    pushDataToCsv(coronaData, city_code, path, citys_list) {
        csvText = '';
        const city = citys_list.find(({ City_Code }) => City_Code == city_code);
        if (path == '/') {
            csvText = `${[
                'City_Name',
                'Date',
                'Accumulated_Verified_Cases',
                'Accumulated_Recovered',
                'Accumulated_Deaths',
                'Accumulated_Number_Of_Tests',
                'Accumulated_Vaccination_First_Dose',
                'Accumulated_Vaccination_Second_Dose',
                'Accumulated_Vaccination_Third_Dose',
                'City_Color',
                'Final_Score'
            ].join(',')}\r\n`;
            coronaData.forEach((row) => {
                const properValues = [city.City_Name_English, row.Date, row.Accumulated_Verified_Cases, row.Accumulated_Recovered, row.Accumulated_Deaths, row.Accumulated_Number_Of_Tests, row.Accumulated_Vaccination_First_Dose, row.Accumulated_Vaccination_Second_Dose, row.Accumulated_Vaccination_Third_Dose, row.City_Color];
                row.Final_Score == -1 ? properValues.push('Irrelevant') : properValues.push(row.Final_Score)
                csvText += `${properValues.join(',')}\r\n`;
            })
        }
        else { //futureVal
            csvText = `${[
                'City_Name',
                'Date',
                'New_Verified_Cases',
            ].join(',')}\r\n`;
            var last_date_db_dt = new Date(last_date_db);
            coronaData.forEach((row) => {
                last_date_db_dt.setDate(last_date_db_dt.getDate() + 1);
                next_day_string = last_date_db_dt.getDate() + '/' + (last_date_db_dt.getMonth() + 1) + '/' + last_date_db_dt.getFullYear();
                const properValues = [city.City_Name_English, next_day_string, row];
                csvText += `${properValues.join(',')}\r\n`;
            })
        }
        return csvText;
    },
    sendMail(coronaData, city_code, path, citys_list,transporter,options){
        var sentStatus = true;
        let csvText=""
        csvText += this.pushDataToCsv(coronaData, city_code, path, citys_list);
        if(path =="/"){
            options.attachments = [
                {
                    filename: 'coronaData.csv',
                    content: csvText
                }]
            options.subject = 'הנתונים שביקשת- קורונה נתוני עבר';
        }
        else{
            options.attachments = [
                {
                    filename: 'coronaDataFutureVal.csv',
                    content: csvText
                }]
            options.subject = 'הנתונים שביקשת- קורונה נתונים עתידיים';
        }

            console.log('sending the data')
       transporter.sendMail(options, function (err, info) {// השליחה עצמה
            if (err) {
                console.log(err);
                console.log('mail not send');
                console.log("sentStatus",sentStatus)
                sentStatus = false;
            }
            
            //return sentStatus;
        })
        return sentStatus
    },
    checkIfUserLogedIn(req, res, next) {
        if (req.session.userMail) {
            next()
        } else {
            BASE_URL = '/corona';
            res.redirect(BASE_URL + '/login')
        };
    },
    dateValidator(start_date, end_date, last_date_db) {
        // start_date = start_date.trim();
        // end_date = end_date.trim();
        if(start_date ==''){
            error = "נא להזין תאריך התחלה מבוקש";
            return error;
        }
        else if(end_date ==''){
            error = "נא להזין תאריך סיום מבוקש";
            return error;
        }
        else if (start_date > end_date) {
            error = "תאריך הסיום לא יכול להיות מוקדם מתאריך ההתחלה, נסה שנית";
            return error;
        }
        else if (start_date < '2020-03-11') {
            error = 'אין נתונים על מגפת הקורונה לפני ה 11/3/2020, אנא בחר תאריך מאוחר יותר';
            return error;
        }
        else if (new Date(end_date) > last_date_db) { 
            error = 'התאריך המעודכן ביותר לפי משרד הבריאות הוא ' + last_date_db + ' אנא בחר תאריך סיום מוקדם יותר'
            return error;
        }
        else {
            error = '';
            return error;
        }
    },
    birthdayValidator(userBirthday) {
        userBirthday = userBirthday.trim();
        if (isNaN(Date.parse(userBirthday))) {
            error = 'התאריך הוקלד בפורמט לא תקין';
            return error;
        } else {
            var birthdayDT = new Date(userBirthday);
            var currentDate = new Date();
            var mostOldDate = currentDate.getFullYear() - 120;
            var birthdayYear = birthdayDT.getFullYear();
            if (birthdayYear < mostOldDate) {
                error = 'תאריך הלידה לא יכול להיות זקן מ-120 שנה';
                return error;
            }
            else if (userBirthday > currentDate) {
                error = 'תאריך הלידה לא יכול להיות עתידי';
                return error;
            }
            return "";
        }
    },
    mailValidator(userMail) {
        userMail=userMail.trim();
        if (userMail.length < 9 || userMail.length > 45) {
            error = 'אורך מייל לא תקין';
            return error;
        }
        else if (userMail.includes('@') == true) {
            var email_parts = userMail.split('@', 2);
            if (email_parts.length > 2) {
                error = 'המייל לא יכול להכיל יותר מ-@ אחד';
                return error;
            }
            else if (email_parts[0].length < 2) {
                error = 'תחילית מייל קצרה מדי';
                return error;
            }
            else if (email_parts[1].length < 6) {
                error = 'סופית המייל קצרה מדי';
                return error;
            }
            else if (!(email_parts[1].includes('co')) || !(email_parts[1].includes('com'))) {
                error = 'סיומת המייל לא תקינה';
                return error;
            }
        }
        else {
            error = 'מייל חייב להכיל @';
            return error;
        }
        return "";
    },
    passwordValidatior(userPassword) {
        userPassword=userPassword.trim();
         if (userPassword.length < 6) {
            error = 'הסיסמא חייבת להכיל לפחות 6 תווים';
            return error;
        }
        let regex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{6,}$/gi;
        var checkPwd = regex.test(userPassword);
       console.log(checkPwd)
        if (checkPwd != true) {
            error = 'הסיסמא חייבת לכלול לפחות מספר אחד ולפחות אות אחת באנגלית';
            return error;
        }
        return "";
    },
    nameValidator(name, type) {
        name=name.trim();
        if (name.length < 2) {
            error = `שם ${type} חייב להיות מורכב לפחות מ-2 אותיות`;
            return error;
        }
        else if (type = "משפחה") {
            if (name.length > 20) {
                error = 'שם משפחה ארוך מדי';
                return error;
            }
            return ""
        }
        else {
            if (name.length > 15) {
                error = 'שם פרטי ארוך מדי';
                return error;
            }
            return ""
        }
    },
    mylog(req, res, next) {
        var newLog = new log_model({
            method: req.method,
            path: req.path,
            userMail: req.session.userMail,
            statusCode:res.statusCode
        })
        newLog.save(function (err, the_log) {
            if (!err)
                console.log('Successfully stored the log:', the_log);
            else
                console.log('Could not Save the log', the_log)
        });
        next();
    },
    async getLastDataAboutCity(city_code, SQLdb) {
        SQLdb.query(`select distinct * from city_status_vaccine_total where city_code=? and Date= (select max(Date) from city_status_vaccine_total)`, city_code, (err, result) => {
            if (err) {
                return console.log(err);
            }
            else {
                LastDataAboutCity = Object.values(JSON.parse(JSON.stringify(result)));
                return LastDataAboutCity;
            }
        })
    },
};
