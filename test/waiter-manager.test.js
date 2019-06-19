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
                { 'waiter_name': 'Shane' }
            ]);
        });
    });
    describe('Testing shifts table building', function () {
        it('Should return list of weekdays and 1 waiter working on Monday, Tuesday and Sunday', async function () {
            let shiftInstance = WaiterManager(pool);
            await shiftInstance.buildShiftsTable();

            await shiftInstance.updateWorkingDays('Dyllan', ['Monday', 'Wednesday', 'Sunday']);
            let result = await pool.query('SELECT weekday, waiters_on_day FROM shifts;');
            assert.strict.deepEqual(result.rows, [
                { 'weekday': 'Monday', 'waiters_on_day': 1 },
                { 'weekday': 'Tuesday', 'waiters_on_day': 0 },
                { 'weekday': 'Wednesday', 'waiters_on_day': 1 },
                { 'weekday': 'Thursday', 'waiters_on_day': 0 },
                { 'weekday': 'Friday', 'waiters_on_day': 0 },
                { 'weekday': 'Saturday', 'waiters_on_day': 0 },
                { 'weekday': 'Sunday', 'waiters_on_day': 1 }
            ]);
        });
        it('Should return list of weekdays and 1 waiter working on Monday, Tuesday, Friday, Sunday and 2 on Wednesday', async function () {
            let shiftInstance = WaiterManager(pool);
            await shiftInstance.buildShiftsTable();

            await shiftInstance.updateWorkingDays('Dyllan', ['Monday', 'Wednesday', 'Sunday']);
            await shiftInstance.updateWorkingDays('Dyllan', ['Tuesday', 'Wednesday', 'Friday']);

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

    after(function () {
        pool.end();
    });
});
