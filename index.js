'use strict';
const express = require('express');
const exphbs = require('express-handlebars');
const bodyParser = require('body-parser');
const flash = require('express-flash');
const session = require('express-session');
const WaiterManager = require('./waiter-manager');
const WaiterManangerRoutes = require('./waiter-manager-routes');
const Helpers = require('./waiter-manager-helpers');

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
const waiterManangerRoutes = WaiterManangerRoutes(waiterManager);
const helpers = Helpers(waiterManager);

app.use(session({
    secret: 'yikes',
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 60000 }
}));

app.use(flash());

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

const buildDBs = async () => {
    await waiterManager.buildWaiterTable();
    await waiterManager.buildShiftsTable();
};

const checkAdmin = (req, res, next) => {
    if (req.session.username) {
        if (req.session.username === 'Admin') {
            return next();
        } else {
            return res.redirect('/waiters/' + req.session.username);
        };
    }
    res.redirect('/');
};
const checkUser = (req, res, next) => {
    if (req.session.username) {
        return next();
    }
    res.redirect('/');
};

buildDBs();

app.get('/', waiterManangerRoutes.index);
app.get('/waiters/update/:username', checkAdmin, waiterManangerRoutes.loadSelection);
app.get('/waiters/:username', checkUser, waiterManangerRoutes.loadSelection);
app.get('/admin', checkAdmin, waiterManangerRoutes.admin);
app.get('/back', checkAdmin, waiterManangerRoutes.back);
app.get('/logout', checkUser, waiterManangerRoutes.logout);
app.post('/waiters/delete/:waiter', checkAdmin, waiterManangerRoutes.deleteWaiter);
app.post('/login', waiterManangerRoutes.login);
app.post('/clear', checkAdmin, waiterManangerRoutes.clear);
app.post('/waiters/:username', waiterManangerRoutes.waitersUpdate);

const PORT = process.env.PORT || 3000;

app.listen(PORT, function () {
    console.log('app started at port: ' + PORT);
});
