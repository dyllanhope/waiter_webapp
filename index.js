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
    },
    isBooked: function (name, day) {
        let weekList = waiterManager.returnWeekdayObject();
        let waiterList = waiterManager.returnWaiterData();
        for (var z = 0; z < waiterList.length; z++) {
            if (waiterList[z].name === name) {
                let daysWorking = (waiterList[z].working).trim();
                daysWorking = daysWorking.split(' ');
                for (var y = 0; y < daysWorking.length; y++) {
                    if (daysWorking[y] === day) {
                        return false;
                    };
                };
            };
        };
        for (var x = 0; x < weekList.length; x++) {
            if (weekList[x].day === day) {
                if (weekList[x].waiters === 3) {
                    return true;
                };
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

app.get('/update/:worker', async function (req, res) {
    let user = req.params.worker;
    res.render('days', {
        name: user,
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
    user = user.trim();

    if (user) {
        let check = await waiterManager.checkLogin(user, password);
        if (check) {
            if (user === 'Admin') {
                waiterManager.setAdminMode(true);
                res.redirect('/admin');
            } else {
                waiterManager.setAdminMode(false);
                res.redirect('/waiter/' + user);
            }
        } else {
            req.flash('error', 'The username or password entered was incorrect');
            res.render('login', {
                name: user
            });
        };
    } else {
        req.flash('error', 'Please enter a username');
        res.render('login', {
            name: user
        });
    }
});

app.get('/waiter/:username', async function (req, res) {
    let user = req.params.username;

    res.render('days', {
        name: user,
        days: await waiterManager.returnWeekdayObject(),
        working: await waiterManager.findWorkingDaysFor(user)
    });
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
    req.flash('confirm', '');
    let user = req.params.username;
    let days = [];
    let type = typeof req.body.chkDay;

    if (type === 'string') {
        days.push(req.body.chkDay);
    } else {
        days = req.body.chkDay;
    };
    if (days.length > 3) {
        req.flash('confirm', 'You have selected too many shifts');
        res.render('days', {
            error: true,
            name: user,
            days: await waiterManager.returnWeekdayObject(),
            working: await waiterManager.findWorkingDaysFor(user)
        });
    } else if (days.length < 3) {
        req.flash('confirm', 'You have not selected enough shifts');
        res.render('days', {
            error: true,
            name: user,
            days: await waiterManager.returnWeekdayObject(),
            working: await waiterManager.findWorkingDaysFor(user)
        });
    } else {
        await waiterManager.updateWorkingDays(user, days);
        req.flash('confirm', 'Shifts have been updated successfully!');
        res.render('days', {
            error: false,
            name: user,
            days: await waiterManager.returnWeekdayObject(),
            working: await waiterManager.findWorkingDaysFor(user)
        });
    }
});

async function buildDBs() {
    await waiterManager.buildWaiterTable();
    await waiterManager.buildShiftsTable();
}

const PORT = process.env.PORT || 3016;

app.listen(PORT, function () {
    console.log('app started at port: ' + PORT);
});
