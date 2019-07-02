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
    let waiters = await pool.query('SELECT waiter_name FROM waiter');
    console.log(waiters.rows)
    res.render('index', {
        waiters: waiters.rows,
        days: waiterManager.returnWeekdayObject() 
    });
});

app.get('/waiters/:username', async function (req, res) {
    let waiter = req.params.username;
    res.render('days', {
        days: waiterManager.returnWeekdayObject(),
        name: waiter,
        working : await waiterManager.findWorkingDaysFor(waiter)
    });
});

app.post('/back', function (req,res){
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

async function buildDBs(){
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
