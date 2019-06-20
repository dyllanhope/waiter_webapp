module.exports = function (pool) {
    var waiterData = [
        { name: 'Dyllan' },
        { name: 'Sam' },
        { name: 'Mark' },
        { name: 'Kayla' },
        { name: 'Shane' },
        { name: 'Amy' },
        { name: 'Chris' }
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
        };
    };

    async function buildWaiterTable () {
        await pool.query('DELETE FROM waiter;');
        for (var x = 0; x < waiterData.length; x++) {
            await pool.query('INSERT into waiter (id, waiter_name, days_working) values ($1, $2, $3);', [x + 1, waiterData[x].name, 'none']);
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

    function returnWeekdayObject () {
        return weekdays;
    };

    return {
        updateWorkingDays,
        buildWaiterTable,
        buildShiftsTable,
        returnWeekdayObject
    };
};
