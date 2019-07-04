/* eslint-disable no-undef */
'use strict';

const assert = require('assert');
const WaiterManager = require('../waiter-manager');
const pg = require('pg');
const Pool = pg.Pool;

const connectionString = process.env.DATABASE_URL || 'postgresql://coder:pg123@localhost:5432/waiter_shifts_tests';

let useSSL = false;
let local = process.env.LOCAL || false;
if (process.env.DATABASE_URL && !local) {
    useSSL = true;
}
const pool = new Pool({
    connectionString,
    ssl: useSSL
});

describe('Testing waiter shifts manager', function () {
    beforeEach(async function () {
        // clean the tables before each test run
        await pool.query('delete from shifts;');
        await pool.query('delete from waiter;');
    });
    describe('Testing waiter table building', function () {
        it('Should return list of waiter names', async function () {
            let shiftInstance = WaiterManager(pool);

            await shiftInstance.buildWaiterTable();
            let result = await pool.query('SELECT waiter_name FROM waiter;');
            assert.strict.deepEqual(result.rows, [
                { 'waiter_name': 'Dyllan' },
                { 'waiter_name': 'Sam' },
                { 'waiter_name': 'Mark' },
                { 'waiter_name': 'Kayla' },
                { 'waiter_name': 'Shane' },
                { 'waiter_name': 'Amy' },
                { 'waiter_name': 'Chris' },
                { 'waiter_name': 'Admin' }

            ]);
        });
    });
    describe('Testing shifts table building', function () {
        it('Should return list of weekdays and 1 waiter working on Monday, Wednesday and Sunday', async function () {
            let shiftInstance = WaiterManager(pool);
            await shiftInstance.buildWaiterTable();
            await shiftInstance.buildShiftsTable();

            await shiftInstance.updateWorkingDays('Dyllan', ['Monday', 'Wednesday', 'Sunday']);
            let result = await pool.query('SELECT * FROM waiter');
            result = await pool.query('SELECT weekday, waiters_on_day FROM shifts;');
            assert.strict.deepEqual(result.rows, [
                { weekday: 'Monday', waiters_on_day: 1 },
                { weekday: 'Tuesday', waiters_on_day: 0 },
                { weekday: 'Wednesday', waiters_on_day: 1 },
                { weekday: 'Thursday', waiters_on_day: 0 },
                { weekday: 'Friday', waiters_on_day: 0 },
                { weekday: 'Saturday', waiters_on_day: 0 },
                { weekday: 'Sunday', waiters_on_day: 1 }
            ]);
        });
        it('Should return list of weekdays and 1 waiter working on Monday, Tuesday, Friday, Sunday and 2 on Wednesday', async function () {
            let shiftInstance = WaiterManager(pool);
            await shiftInstance.buildWaiterTable();
            await shiftInstance.buildShiftsTable();

            await shiftInstance.updateWorkingDays('Dyllan', ['Monday', 'Wednesday', 'Sunday']);
            await shiftInstance.updateWorkingDays('Sam', ['Tuesday', 'Wednesday', 'Friday']);
            let result = await pool.query('SELECT weekday, waiters_on_day FROM shifts;');

            assert.strict.deepEqual(result.rows, [
                { 'weekday': 'Monday', 'waiters_on_day': 1 },
                { 'weekday': 'Tuesday', 'waiters_on_day': 1 },
                { 'weekday': 'Wednesday', 'waiters_on_day': 2 },
                { 'weekday': 'Thursday', 'waiters_on_day': 0 },
                { 'weekday': 'Friday', 'waiters_on_day': 1 },
                { 'weekday': 'Saturday', 'waiters_on_day': 0 },
                { 'weekday': 'Sunday', 'waiters_on_day': 1 }
            ]);
        });
        it('Should return list of weekdays and 0 waiters working after a waiter chose 3 days then updated to working none', async function () {
            let shiftInstance = WaiterManager(pool);
            await shiftInstance.buildWaiterTable();
            await shiftInstance.buildShiftsTable();

            await shiftInstance.updateWorkingDays('Dyllan', ['Monday', 'Wednesday', 'Sunday']);
            await shiftInstance.updateWorkingDays('Dyllan', []);
            let result = await pool.query('SELECT weekday, waiters_on_day FROM shifts;');

            assert.strict.deepEqual(result.rows, [
                { 'weekday': 'Monday', 'waiters_on_day': 0 },
                { 'weekday': 'Tuesday', 'waiters_on_day': 0 },
                { 'weekday': 'Wednesday', 'waiters_on_day': 0 },
                { 'weekday': 'Thursday', 'waiters_on_day': 0 },
                { 'weekday': 'Friday', 'waiters_on_day': 0 },
                { 'weekday': 'Saturday', 'waiters_on_day': 0 },
                { 'weekday': 'Sunday', 'waiters_on_day': 0 }
            ]);
        });
    });
    describe('Styling tests', function () {
        it('Should return all the days having "under" as their styling with 1 waiter working on all days', async function () {
            let shiftInstance = WaiterManager(pool);
            await shiftInstance.buildWaiterTable();
            await shiftInstance.buildShiftsTable();

            assert.strict.deepEqual(shiftInstance.returnWeekdayObject(), [
                { day: 'Monday', waiters: 0, style: 'under' },
                { day: 'Tuesday', waiters: 0, style: 'under' },
                { day: 'Wednesday', waiters: 0, style: 'under' },
                { day: 'Thursday', waiters: 0, style: 'under' },
                { day: 'Friday', waiters: 0, style: 'under' },
                { day: 'Saturday', waiters: 0, style: 'under' },
                { day: 'Sunday', waiters: 0, style: 'under' }
            ]);
        });
        it('Should return Wednesday as being "Over" as there are 4 waiters working Wednesday', async function () {
            let shiftInstance = WaiterManager(pool);
            await shiftInstance.buildWaiterTable();
            await shiftInstance.buildShiftsTable();

            await shiftInstance.updateWorkingDays('Dyllan', ['Monday', 'Wednesday', 'Friday']);
            await shiftInstance.updateWorkingDays('Sam', ['Monday', 'Wednesday', 'Saturday']);
            await shiftInstance.updateWorkingDays('Kayla', ['Monday', 'Wednesday', 'Thursday']);
            await shiftInstance.updateWorkingDays('Chris', ['Wednesday', 'Sunday']);

            assert.strict.deepEqual(shiftInstance.returnWeekdayObject(), [
                { day: 'Monday', waiters: 3, style: 'good' },
                { day: 'Tuesday', waiters: 0, style: 'under' },
                { day: 'Wednesday', waiters: 4, style: 'over' },
                { day: 'Thursday', waiters: 1, style: 'under' },
                { day: 'Friday', waiters: 1, style: 'under' },
                { day: 'Saturday', waiters: 1, style: 'under' },
                { day: 'Sunday', waiters: 1, style: 'under' }
            ]);
        });
        it('Should return Monday, Wednesday and Friday as being "good" as there are the right amount of waiters working that day', async function () {
            let shiftInstance = WaiterManager(pool);
            await shiftInstance.buildWaiterTable();
            await shiftInstance.buildShiftsTable();

            await shiftInstance.updateWorkingDays('Dyllan', ['Monday', 'Wednesday', 'Friday']);
            await shiftInstance.updateWorkingDays('Sam', ['Monday', 'Wednesday', 'Saturday']);
            await shiftInstance.updateWorkingDays('Kayla', ['Monday', 'Thursday', 'Friday']);
            await shiftInstance.updateWorkingDays('Chris', ['Tuesday', 'Wednesday', 'Sunday']);
            await shiftInstance.updateWorkingDays('Mark', ['Tuesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']);

            assert.strict.deepEqual(shiftInstance.returnWeekdayObject(), [
                { day: 'Monday', waiters: 3, style: 'good' },
                { day: 'Tuesday', waiters: 2, style: 'under' },
                { day: 'Wednesday', waiters: 3, style: 'good' },
                { day: 'Thursday', waiters: 2, style: 'under' },
                { day: 'Friday', waiters: 3, style: 'good' },
                { day: 'Saturday', waiters: 2, style: 'under' },
                { day: 'Sunday', waiters: 2, style: 'under' }
            ]);
        });
    });
    describe('Update working days to table testing', function () {
        it('Should return waiter_name as Dyllan and the days_working should be updated to "Monday, Tuesday, Friday" ', async function () {
            let shiftInstance = WaiterManager(pool);
            await shiftInstance.buildWaiterTable();

            await shiftInstance.updateWorkingDays('Dyllan', ['Monday', 'Tuesday', 'Friday']);
            let result = await pool.query('SELECT waiter_name, days_working FROM waiter WHERE waiter_name = $1', ['Dyllan']);
            assert.strict.deepEqual(result.rows, [
                { 'waiter_name': 'Dyllan', 'days_working': ' Monday Tuesday Friday' }
            ]);
        });
        it('Should return waiter_name as Sam and the days_working should be updated to "Monday Tuesday Friday Saturday" ', async function () {
            let shiftInstance = WaiterManager(pool);
            await shiftInstance.buildWaiterTable();

            await shiftInstance.updateWorkingDays('Sam', ['Monday', 'Tuesday', 'Friday', 'Saturday']);
            let result = await pool.query('SELECT waiter_name, days_working FROM waiter WHERE waiter_name = $1', ['Sam']);
            assert.strict.deepEqual(result.rows, [
                { 'waiter_name': 'Sam', 'days_working': ' Monday Tuesday Friday Saturday' }
            ]);
        });
        it('Should return waiter_name as Dyllan and the days_working should be updated to "none" with an empty array of days ', async function () {
            let shiftInstance = WaiterManager(pool);
            await shiftInstance.buildWaiterTable();

            await shiftInstance.updateWorkingDays('Dyllan', []);
            let result = await pool.query('SELECT waiter_name, days_working FROM waiter WHERE waiter_name = $1', ['Dyllan']);
            assert.strict.deepEqual(result.rows, [
                { 'waiter_name': 'Dyllan', 'days_working': 'none' }
            ]);
        });
        it('Should return waiter_name as Dyllan and the days_working should be updated to "none" with undefined days ', async function () {
            let shiftInstance = WaiterManager(pool);
            await shiftInstance.buildWaiterTable();

            await shiftInstance.updateWorkingDays('Dyllan');
            let result = await pool.query('SELECT waiter_name, days_working FROM waiter WHERE waiter_name = $1', ['Dyllan']);
            assert.strict.deepEqual(result.rows, [
                { 'waiter_name': 'Dyllan', 'days_working': 'none' }
            ]);
        });
    });
    describe('Week shift control testing', function () {
        it('Should return a table of data for the weeks shifts', async function () {
            let shiftInstance = WaiterManager(pool);
            await shiftInstance.buildWaiterTable();
            await shiftInstance.buildShiftsTable();

            await shiftInstance.updateWorkingDays('Dyllan', ['Monday', 'Wednesday', 'Friday']);
            await shiftInstance.updateWorkingDays('Sam', ['Monday', 'Wednesday', 'Saturday']);
            await shiftInstance.updateWorkingDays('Kayla', ['Monday', 'Thursday', 'Friday']);
            await shiftInstance.updateWorkingDays('Chris', ['Tuesday', 'Wednesday', 'Sunday']);
            await shiftInstance.updateWorkingDays('Mark', ['Tuesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']);

            let result = await shiftInstance.shiftData(); 

            assert.strict.deepEqual(result, [
                { weekday: 'Monday', waiters_on_day: 3 },
                { weekday: 'Tuesday', waiters_on_day: 2 },
                { weekday: 'Wednesday', waiters_on_day: 3 },
                { weekday: 'Thursday', waiters_on_day: 2 },
                { weekday: 'Friday', waiters_on_day: 3 },
                { weekday: 'Saturday', waiters_on_day: 2 },
                { weekday: 'Sunday', waiters_on_day: 2 }
            ]);
        });
        it('Should return an empty list of shift data', async function () {
            let shiftInstance = WaiterManager(pool);
            await shiftInstance.buildWaiterTable();
            await shiftInstance.buildShiftsTable();

            await shiftInstance.updateWorkingDays('Dyllan', ['Monday', 'Wednesday', 'Friday']);
            await shiftInstance.clearShiftsTable();

            let result = await pool.query('SELECT * FROM shifts');
            assert.strict.deepEqual(result.rows, []);
        });
        it('Should return "Monday Tuesday Friday" as "Chris" has chosen those days to work', async function () {
            let shiftInstance = WaiterManager(pool);
            await shiftInstance.buildWaiterTable();
            await shiftInstance.buildShiftsTable();

            await shiftInstance.updateWorkingDays('Chris', ['Monday', 'Tuesday', 'Friday']);

            let days = await shiftInstance.findWorkingDaysFor('Chris');
            assert.strict.equal(days, ' Monday Tuesday Friday');
        });
        it('Should return "none" as "Chris" has not updated his shifts to work any days', async function () {
            let shiftInstance = WaiterManager(pool);
            await shiftInstance.buildWaiterTable();
            await shiftInstance.buildShiftsTable();

            let days = await shiftInstance.findWorkingDaysFor('Chris');
            assert.strict.equal(days, 'none');
        });
        it('Should return a list of names that have not selected shifts (Shane and Amy)', async function () {
            let shiftInstance = WaiterManager(pool);
            await shiftInstance.buildWaiterTable();
            await shiftInstance.buildShiftsTable();

            await shiftInstance.updateWorkingDays('Dyllan', ['Monday', 'Wednesday', 'Friday']);
            await shiftInstance.updateWorkingDays('Sam', ['Monday', 'Wednesday', 'Saturday']);
            await shiftInstance.updateWorkingDays('Kayla', ['Monday', 'Thursday', 'Friday']);
            await shiftInstance.updateWorkingDays('Chris', ['Tuesday', 'Wednesday', 'Sunday']);
            await shiftInstance.updateWorkingDays('Mark', ['Tuesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']);

            let notWorking = await shiftInstance.notWorking();
            assert.strict.deepEqual(notWorking, ['Shane','Amy']);
        });
        it('Should return a list of names that are shifted for Friday', async function () {
            let shiftInstance = WaiterManager(pool);
            await shiftInstance.buildWaiterTable();
            await shiftInstance.buildShiftsTable();

            await shiftInstance.updateWorkingDays('Dyllan', ['Monday', 'Wednesday', 'Friday']);
            await shiftInstance.updateWorkingDays('Sam', ['Monday', 'Wednesday', 'Saturday']);
            await shiftInstance.updateWorkingDays('Kayla', ['Monday', 'Thursday', 'Friday']);
            await shiftInstance.updateWorkingDays('Chris', ['Tuesday', 'Wednesday', 'Sunday']);
            await shiftInstance.updateWorkingDays('Mark', ['Tuesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']);

            let workers = await shiftInstance.findWaitersFor('Friday');
            assert.strict.deepEqual(workers, ['Dyllan (shifts: 3)','Kayla (shifts: 3)','Mark (shifts: 5)']);
        });
        it('Should return the days that Dyllan is working (Monday, Wednesday and Friday)', async function () {
            let shiftInstance = WaiterManager(pool);
            await shiftInstance.buildWaiterTable();
            await shiftInstance.buildShiftsTable();

            await shiftInstance.updateWorkingDays('Dyllan', ['Monday', 'Wednesday', 'Friday']);
            await shiftInstance.updateWorkingDays('Sam', ['Monday', 'Wednesday', 'Saturday']);
            await shiftInstance.updateWorkingDays('Kayla', ['Monday', 'Thursday', 'Friday']);
            await shiftInstance.updateWorkingDays('Chris', ['Tuesday', 'Wednesday', 'Sunday']);
            await shiftInstance.updateWorkingDays('Mark', ['Tuesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']);

            let workers = await shiftInstance.waiterInfo('Dyllan');
            assert.strict.deepEqual(workers, ['Monday', 'Wednesday', 'Friday']);
        });
    });
    describe('Login tests', function (){
        it('should return "true" as the password is correct for the selected username', async function (){
            let shiftInstance = WaiterManager(pool);
            await shiftInstance.buildWaiterTable();
            await shiftInstance.buildShiftsTable();

            let check = await shiftInstance.checkLogin('Dyllan','123');

            assert.strict.equal(check, true);
        });
        it('should return "false" as the password is incorrect for the selected username', async function (){
            let shiftInstance = WaiterManager(pool);
            await shiftInstance.buildWaiterTable();
            await shiftInstance.buildShiftsTable();

            let check = await shiftInstance.checkLogin('Dyllan','house');

            assert.strict.equal(check, false);
        });
        it('should return "true" as the password for the admin user is "admin"', async function (){
            let shiftInstance = WaiterManager(pool);
            await shiftInstance.buildWaiterTable();
            await shiftInstance.buildShiftsTable();

            let check = await shiftInstance.checkLogin('Admin','admin');

            assert.strict.equal(check, true);
        });
        it('should return "false" as the entered user does not exist', async function (){
            let shiftInstance = WaiterManager(pool);
            await shiftInstance.buildWaiterTable();
            await shiftInstance.buildShiftsTable();

            let check = await shiftInstance.checkLogin('Michael','123');

            assert.strict.equal(check, false);
        });
    });
});

after(function () {
    pool.end();
});
