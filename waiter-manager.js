module.exports = function (pool) {
    var waiterData = [
        { name: 'Dyllan' },
        { name: 'Sam' },
        { name: 'Mark' },
        { name: 'Kayla' },
        { name: 'Shane' }
    ];
    var weekdays = [
        { day: 'Monday', waiters: 0 },
        { day: 'Tuesday', waiters: 0 },
        { day: 'Wednesday', waiters: 0 },
        { day: 'Thursday', waiters: 0 },
        { day: 'Friday', waiters: 0 },
        { day: 'Saturday', waiters: 0 },
        { day: 'Sunday', waiters: 0 }

    ];

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
                for (var i = 0; i < weekdays.length; i++) {
                    if (daysList[x] === weekdays[i].day) {
                        weekdays[i].waiters++;
                    }
                };
                daysToAdd += ' ' + daysList[x];
            };
        } else {
            daysToAdd = 'none';
        }
        await pool.query('UPDATE waiter SET days_working = $1 WHERE waiter_name = $2', [daysToAdd, user]);
        await buildShiftsTable();
    };

    async function buildWaiterTable () {
        await pool.query('DELETE FROM waiter');
        for (var x = 0; x < waiterData.length; x++) {
            await pool.query('INSERT into waiter (id, waiter_name, days_working) values ($1, $2, $3)', [x + 1, waiterData[x].name, 'none']);
        };
    };

    async function buildShiftsTable () {
        await pool.query('DELETE FROM shifts');
        for (var x = 0; x < weekdays.length; x++) {
            await pool.query('INSERT into shifts (id, weekday, waiters_on_day) values ($1, $2, $3)', [x + 1, weekdays[x].day, weekdays[x].waiters]);
        };
    }

    return {
        updateWorkingDays,
        buildWaiterTable,
        buildShiftsTable
    };
};
