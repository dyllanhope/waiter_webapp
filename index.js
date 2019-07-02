'use strict';
const express = require('express');
const exphbs = require('express-handlebars');
const bodyParser = require('body-parser');
const flash = require('express-flash');
const session = require('express-session');
const WaiterManager = require('./waiter-manager');

const app = express();

const pg = require('pg');
const Pool = pg.Pool;

let useSSL = false;
let local = process.env.LOCAL || false;
if (process.env.DATABASE_URL && !local) {
    useSSL = true;
}

const connectionString = process.env.DATABASE_URL || 'postgresql://coder:pg123@localhost:5432/waiter_shifts';

const pool = new Pool({
    connectionString,
    ssl: useSSL
});

const waiterManager = WaiterManager(pool);

app.use(session({
    secret: 'yikes',
    resave: false,
    saveUninitialized: true
}));

app.use(flash());

const handlebarSetup = exphbs({
    partialsDir: './views',
    viewPath: './views',
    layoutsDir: './views/layouts'
});

app.engine('handlebars', handlebarSetup);
app.set('view engine', 'handlebars');

app.use(express.static('public'));

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

buildDBs();

app.get('/', async function (req, res) {
    let list = [];
    let waiters = await pool.query('SELECT waiter_name FROM waiter');
    for (var x = 0; x < waiters.rows.length; x++) {
        if (waiters.rows[x].waiter_name !== 'Admin') {
            list.push(waiters.rows[x]);
        };
    };
    res.render('index', {
        waiters: list,
        days: waiterManager.returnWeekdayObject()
    });
});

app.get('/waiters/:username', async function (req, res) {
    let waiter = req.params.username;
    res.render('login', {
        days: await waiterManager.returnWeekdayObject(),
        name: waiter
    });
});

app.get('/day/:chosenDay', async function (req, res) {
    let day = req.params.chosenDay;
    let workers = await waiterManager.findWaitersFor(day);
    res.render('admin', {
        days: await waiterManager.returnWeekdayObject(),
        workers: workers,
        notWorking: await waiterManager.notWorking()
    });
});

app.post('/login/:user', async function (req, res) {
    let password = req.body.password;
    let user = req.params.user;
    let check = await waiterManager.checkLogin(user, password);

    if (check) {
        if (user === 'Admin') {
            res.render('admin', {
                days: await waiterManager.returnWeekdayObject(),
                notWorking: await waiterManager.notWorking()

            });
        } else {
            res.render('days', {
                name: user,
                days: await waiterManager.returnWeekdayObject(),
                working: await waiterManager.findWorkingDaysFor(user)
            });
        }
    } else {
        req.flash('error', 'The password entered was incorrect');
        res.render('login', {
            name: user
        });
    };

});

app.get('/admin', async function (req, res) {
    res.render('login', {
        name: 'Admin'
    });
});

app.post('/back', function (req, res) {
    res.redirect('/');
});

app.post('/clear', async function (req, res) {
    await waiterManager.clearShiftsTable();
    res.redirect('/');
});

app.post('/waiters/:username', async function (req, res) {
    let user = req.params.username;
    let days = req.body.chkDay;
    await waiterManager.updateWorkingDays(user, days);
    res.redirect('/');
});

async function buildDBs() {
    await waiterManager.buildWaiterTable();
    await waiterManager.buildShiftsTable();
}

const PORT = process.env.PORT || 3014;

app.listen(PORT, function () {
    console.log('app started at port: ' + PORT);
});





// app.post('/account', async function (req, res) {
    //     let name = req.body.name;
    //     name = name.charAt(0).toUpperCase() + (name.slice(1)).toLowerCase();    
    //     let password = req.body.password;
    //     if (await waiterManager.checkLogin(name, password)){
    //         res.render('days', {
    //             days: waiterManager.returnWeekdayObject
    //         });
    //     } else {
    //         res.redirect('/');
    //     };
    // });
