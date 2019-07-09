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

const helpers = {
    isChecked: function (name, day) {
        let list = waiterManager.waiterInfo(name);
        for (var i = 0; i < list.length; i++) {
            if (day === list[i]) {
                return true;
            };
        };
        return false;
    }
};

const handlebarSetup = exphbs({
    partialsDir: './views',
    viewPath: './views',
    layoutsDir: './views/layouts',
    helpers
});

app.engine('handlebars', handlebarSetup);
app.set('view engine', 'handlebars');

app.use(express.static('public'));

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

buildDBs();

app.get('/', async function (req, res) {
    res.render('login');
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
    let workers = await waiterManager.findWaitersFor();
    res.render('admin', {
        days: await waiterManager.returnWeekdayObject(), 
        workers: workers,
        notWorking: await waiterManager.notWorking(),
        day
    });
});

app.get('/update/:worker', async function (req, res) {
    let user = req.params.worker;
    let name = user.split(' ');
    name = name[0];
    res.render('days', {
        name: name,
        days: await waiterManager.returnWeekdayObject()
    });
});

app.post('/deleteWaiter/:waiter', async function (req, res) {
    let waiter = req.params.waiter;
    let data = waiter.split('-');
    let day = data[1];
    waiter = data[0].split(' ');
    waiter = waiter[0];

    await waiterManager.removeWaiterFrom(waiter, day);

    res.redirect('/admin');
});

app.post('/login', async function (req, res) {
    let password = req.body.password;
    let user = req.body.username;
    let check = await waiterManager.checkLogin(user, password);

    if (check) {
        if (user === 'Admin') {
            waiterManager.setAdminMode(true);
            res.redirect('/admin');
        } else {
            waiterManager.setAdminMode(false);
            res.render('days', {
                name: user,
                days: await waiterManager.returnWeekdayObject(),
                working: await waiterManager.findWorkingDaysFor(user)
            });
        }
    } else {
        req.flash('error', 'The username or password entered was incorrect');
        res.render('login', {
            name: user
        });
    };
});

app.get('/admin', async function (req, res) {
    let workers = await waiterManager.findWaitersFor();
    let notWorking = await waiterManager.notWorking();
    res.render('admin', {
        days: await waiterManager.returnWeekdayObject(),
        notWorking,
        workers
    });
});

app.get('/adminLogin', async function (req, res) {
    res.render('login', {
        name: 'Admin'
    });
});

app.post('/back', async function (req, res) {
    if (waiterManager.returnAdminMode() === true) {
        res.redirect('/admin');
    } else {
        res.redirect('/');
    };
});

app.post('/clear', async function (req, res) {
    await waiterManager.clearShiftsTable();
    res.redirect('/admin');
});

app.post('/waiters/:username', async function (req, res) {
    let user = req.params.username;
    let days = [];
    let type = typeof req.body.chkDay;

    if (type === 'string') {
        days.push(req.body.chkDay);
    } else {
        days = req.body.chkDay;
    };
    await waiterManager.updateWorkingDays(user, days);
    if (waiterManager.returnAdminMode() === true) {
        res.redirect('/admin');
    } else {
        res.redirect('/');
    };
});

async function buildDBs () {
    await waiterManager.buildWaiterTable();
    await waiterManager.buildShiftsTable();
}

const PORT = process.env.PORT || 3016;

app.listen(PORT, function () {
    console.log('app started at port: ' + PORT);
});
