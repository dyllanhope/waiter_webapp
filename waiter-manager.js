module.exports = function (pool) {
    var waiterData = [
        { name: 'Dyllan', password: '123', working: 'none' },
        { name: 'Sam', password: '123', working: 'none' },
        { name: 'Mark', password: '123', working: 'none' },
        { name: 'Kayla', password: '123', working: 'none' },
        { name: 'Shane', password: '123', working: 'none' },
        { name: 'Amy', password: '123', working: 'none' },
        { name: 'Chris', password: '123', working: 'none' },
        { name: 'Admin', password: 'admin', working: 'none' }
    ];
    var weekdays = [
        { day: 'Monday', waiters: 0, style: 'under' },
        { day: 'Tuesday', waiters: 0, style: 'under' },
        { day: 'Wednesday', waiters: 0, style: 'under' },
        { day: 'Thursday', waiters: 0, style: 'under' },
        { day: 'Friday', waiters: 0, style: 'under' },
        { day: 'Saturday', waiters: 0, style: 'under' },
        { day: 'Sunday', waiters: 0, style: 'under' }
    ];

    async function updateWorkingDays(user, daysList) {
        var list;
        if (daysList) {
            list = daysList.length;
        } else {
            list = '';
        }

        if (list) {
            var daysToAdd = '';
            for (var x = 0; x < daysList.length; x++) {
                daysToAdd += ' ' + daysList[x];
            };
        } else {
            daysToAdd = 'none';
        }

        for (var x = 0; x < waiterData.length; x++) {
            if(waiterData[x].name === user){
                waiterData[x].working = daysToAdd
            };
        };
        await pool.query('UPDATE waiter SET days_working = $1 WHERE waiter_name = $2;', [daysToAdd, user]);

        let result = await pool.query('SELECT waiter_name, days_working FROM waiter;');
        clearNumWeekdaysData();

        for (var k = 0; k < waiterData.length; k++) {
            if (result.rows[k].days_working !== 'none') {
                let days = (result.rows[k].days_working).split(' ');
                for (var z = 0; z < days.length; z++) {
                    for (var y = 0; y < weekdays.length; y++) {
                        if (days[z] === weekdays[y].day) {
                            weekdays[y].waiters++;
                        };
                    };
                };
            };
        };

        determineStyling();
        await buildShiftsTable();
    };

    function clearNumWeekdaysData() {
        for (var x = 0; x < weekdays.length; x++) {
            weekdays[x].waiters = 0;
            weekdays[x].style = 'under';
        };
    };

    async function buildWaiterTable() {
        await pool.query('DELETE FROM waiter;');
        for (var x = 0; x < waiterData.length; x++) {
            await pool.query('INSERT into waiter (id, waiter_name, days_working, password) values ($1, $2, $3, $4);', [x + 1, waiterData[x].name, 'none', waiterData[x].password]);
        };
    };

    async function buildShiftsTable() {
        await pool.query('DELETE FROM shifts;');
        for (var x = 0; x < weekdays.length; x++) {
            await pool.query('INSERT into shifts (id, weekday, waiters_on_day) values ($1, $2, $3);', [x + 1, weekdays[x].day, weekdays[x].waiters]);
        };
    }

    function determineStyling() {
        for (var i = 0; i < weekdays.length; i++) {
            if (weekdays[i].waiters === 3) {
                weekdays[i].style = 'good';
            } else if (weekdays[i].waiters > 3) {
                weekdays[i].style = 'over';
            } else {
                weekdays[i].style = 'under';
            }
        };
    };

    async function checkLogin(name, password) {
        let result = await pool.query('SELECT waiter_name, password FROM waiter WHERE waiter_name = $1', [name]);
        if (result.rowCount !== 0) {
            if (result.rows[0].password === password) {
                return true;
            } else {
                return false;
            };
        } else {
            return false;
        };
    };

    function returnWeekdayObject() {
        return weekdays;
    };

    async function clearShiftsTable() {
        clearNumWeekdaysData();
        await pool.query('DELETE FROM shifts');
        let result = await pool.query('SELECT days_working FROM waiter');
        for (var i = 0; i < result.rows.length; i++) {
            await pool.query('UPDATE waiter SET days_working = $1 WHERE id = $2', ['none', i + 1]);
        };
    };

    async function shiftData() {
        let result = await pool.query('SELECT weekday, waiters_on_day FROM shifts');
        return result.rows;
    };

    async function findWorkingDaysFor(waiter) {
        let result = await pool.query('SELECT days_working FROM waiter WHERE waiter_name = $1', [waiter]);
        return result.rows[0].days_working;
    };

    async function findWaitersFor(day) {
        let names = [];
        let result = await pool.query('SELECT waiter_name, days_working FROM waiter');
        for (var i = 0; i < result.rows.length; i++) {
            let dayList = (result.rows[i].days_working).trim();
            dayList = dayList.split(' ');
            for (var k = 0; k < dayList.length; k++) {
                if (day === dayList[k]) {
                    names.push(result.rows[i].waiter_name + ' ( shifts: ' + dayList.length + ')');
                };
            };
        };
        return names;
    };

    async function notWorking() {
        let result = await pool.query('SELECT waiter_name FROM waiter WHERE days_working = $1', ['none']);
        let list = [];
        for (var i = 0; i < result.rows.length; i++) {
            if (result.rows[i].waiter_name !== 'Admin') {
                list.push(result.rows[i].waiter_name);
            }
        };
        return list;
    };

    function waiterInfo(name){
        let data = 'none';
        for (var x = 0; x < waiterData.length; x++) {
            if(waiterData[x].name === name){
                data = waiterData[x].working;
            };
        };
        let arr = data.split(' ');
        return arr;
    };

    return {
        updateWorkingDays,
        buildWaiterTable,
        buildShiftsTable,
        returnWeekdayObject,
        clearShiftsTable,
        shiftData,
        checkLogin,
        findWorkingDaysFor,
        findWaitersFor,
        notWorking,
        waiterInfo
    };
};
