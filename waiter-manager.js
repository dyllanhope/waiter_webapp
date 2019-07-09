module.exports = function (pool) {
    var waiterData = [
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
    var adminMode = false;

    async function updateWorkingDays (user, daysList) {
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

        for (var i = 0; i < waiterData.length; i++) {
            if (waiterData[i].name === user) {
                waiterData[i].working = daysToAdd;
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

    function clearNumWeekdaysData () {
        for (var x = 0; x < weekdays.length; x++) {
            weekdays[x].waiters = 0;
            weekdays[x].style = 'under';
        };
    };

    function resetWaiterInfo () {
        for (var x = 0; x < waiterData.length; x++) {
            waiterData[x].working = 'none';
        };
    }

    async function buildWaiterTable () {
        await pool.query('DELETE FROM waiter;');
        for (var x = 0; x < waiterData.length; x++) {
            await pool.query('INSERT into waiter (id, waiter_name, days_working, password) values ($1, $2, $3, $4);', [x + 1, waiterData[x].name, 'none', waiterData[x].password]);
        };
    };

    async function buildShiftsTable () {
        await pool.query('DELETE FROM shifts;');
        for (var x = 0; x < weekdays.length; x++) {
            await pool.query('INSERT into shifts (id, weekday, waiters_on_day) values ($1, $2, $3);', [x + 1, weekdays[x].day, weekdays[x].waiters]);
        };
    }

    function determineStyling () {
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

    async function checkLogin (name, password) {
        let count = await pool.query('SELECT id FROM waiter');
        let result = await pool.query('SELECT waiter_name, password FROM waiter WHERE waiter_name = $1', [name]);
        if (result.rowCount !== 0) {
            if (result.rows[0].password === password) {
                return true;
            } else {
                return false;
            };
        } else {
            let num = Number(count.rows.length);
            num = num + 1
            await pool.query('INSERT into waiter (id, waiter_name, days_working, password) values ($1, $2, $3, $4);', [ num, name, 'none', password]);
            waiterData.push({'name' : name, 'password': password, 'working': 'none'});
            return true;
        };
    };

    function returnWeekdayObject () {
        return weekdays;
    };

    async function clearShiftsTable () {
        clearNumWeekdaysData();
        resetWaiterInfo();
        await pool.query('DELETE FROM shifts');
        let result = await pool.query('SELECT days_working FROM waiter');
        for (var i = 0; i < result.rows.length; i++) {
            await pool.query('UPDATE waiter SET days_working = $1 WHERE id = $2', ['none', i + 1]);
        };
    };

    async function shiftData () {
        let result = await pool.query('SELECT weekday, waiters_on_day FROM shifts');
        return result.rows;
    };

    async function findWorkingDaysFor (waiter) {
        let result = await pool.query('SELECT days_working FROM waiter WHERE waiter_name = $1', [waiter]);
        return result.rows[0].days_working;
    };

    async function findWaitersFor () {
        let names = [
            {
                day: 'Monday',
                waiters: []
            }, {
                day: 'Tuesday',
                waiters: []
            }, {
                day: 'Wednesday',
                waiters: []
            }, {
                day: 'Thursday',
                waiters: []
            }, {
                day: 'Friday',
                waiters: []
            }, {
                day: 'Saturday',
                waiters: []
            }, {
                day: 'Sunday',
                waiters: []
            }
        ];
        let result = await pool.query('SELECT waiter_name, days_working FROM waiter');
        for (var i = 0; i < result.rows.length; i++) {
            let dayList = (result.rows[i].days_working).trim();
            dayList = dayList.split(' ');
            for (var k = 0; k < dayList.length; k++) {
                for (var x = 0; x < names.length; x++) {
                    if (dayList[k] === names[x].day) {
                        names[x].waiters.push(result.rows[i].waiter_name + ' (' + dayList.length + ')');
                    };
                }
            };
        };
        return names;
    };

    async function notWorking () {
        let result = await pool.query('SELECT waiter_name FROM waiter WHERE days_working = $1', ['none']);
        let list = [];
        for (var i = 0; i < result.rows.length; i++) {
            if (result.rows[i].waiter_name !== 'Admin') {
                list.push(result.rows[i].waiter_name);
            }
        };
        return list;
    };

    function waiterInfo (name) {
        let data = 'none';
        
        for (var x = 0; x < waiterData.length; x++) {
            if (waiterData[x].name === name) {
                data = waiterData[x].working;
            };
        };
        let arr = data.split(' ');
        for (var i = 0; i < arr.length; i++) {
            if (arr[i] === '') {
                arr.splice(i, 1);
            };
        };
        return arr;
    };

    async function removeWaiterFrom (waiter, day) {
        let result = await pool.query('SELECT waiter_name, days_working FROM waiter WHERE waiter_name = $1', [waiter]);
        let days = result.rows[0].days_working;
        days = days.trim();

        var newWorking = '';
        days = days.split(' ');
        for (var x = 0; x < days.length; x++) {
            if (day === days[x]) {
                days.splice(x, 1);
            };
        };
        for (var i = 0; i < days.length; i++) {
            newWorking += ' ' + days[i];
        };
        newWorking = newWorking.trim();
        if (newWorking === '') {
            newWorking = 'none';
        };
        let dayNum = await pool.query('SELECT waiters_on_day FROM shifts WHERE weekday = $1', [day]);
        let number = dayNum.rows[0].waiters_on_day;
        for (var k = 0; k < weekdays.length; k++) {
            if (weekdays[k].day === day) {
                weekdays[k].waiters = number - 1;
            };
        };
        for (var y = 0; y < waiterData.length; y++) {
            if (waiterData[y].name === waiter) {
                waiterData[y].working = newWorking;
            };
        };
        determineStyling();
        await pool.query('UPDATE shifts SET waiters_on_day = $1 WHERE weekday = $2', [number - 1, day]);
        await pool.query('UPDATE waiter SET days_working = $1 WHERE waiter_name = $2', [newWorking, waiter]);
    };

    function setAdminMode (state) {
        adminMode = state;
    };

    function returnAdminMode () {
        return adminMode;
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
        waiterInfo,
        removeWaiterFrom,
        setAdminMode,
        returnAdminMode
    };
};
