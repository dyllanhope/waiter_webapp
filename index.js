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
    saveUninitialized: true
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

buildDBs();

app.get('/', waiterManangerRoutes.index);
app.get('/waiters/update/:username', waiterManangerRoutes.loadSelection);
app.get('/waiters/:username', waiterManangerRoutes.loadSelection);
app.get('/admin', waiterManangerRoutes.admin);
app.get('/adminLogin', waiterManangerRoutes.adminLogin);
app.post('/waiters/delete/:waiter', waiterManangerRoutes.deleteWaiter);
app.post('/login', waiterManangerRoutes.login);
app.post('/back', waiterManangerRoutes.back);
app.post('/clear', waiterManangerRoutes.clear);
app.post('/waiters/:username', waiterManangerRoutes.waitersUpdate);

async function buildDBs () {
    await waiterManager.buildWaiterTable();
    await waiterManager.buildShiftsTable();
}

const PORT = process.env.PORT || 3016;

app.listen(PORT, function () {
    console.log('app started at port: ' + PORT);
});
