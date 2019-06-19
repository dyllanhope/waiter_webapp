module.exports = function (pool) {
    var waiterData = [
        { name: 'Dyllan' },
        { name: 'Sam' },
        { name: 'Mark' },
        { name: 'Kayla' },
        { name: 'Shane' }
    ];

    async function updateWorkingDays (user, daysList) {
        var list;
        if (daysList) {
            list = daysList.length;
        } else {
            list = '';
        }
        if (list) {
            var daysToAdd = daysList[0];
            for (var x = 1; x < daysList.length; x++) {
                daysToAdd += ', ' + daysList[x];
            };
        } else {
            daysToAdd = 'none';
        }
        await pool.query('UPDATE waiter SET days_working = $1 WHERE waiter_name = $2', [daysToAdd, user]);
    };

    async function buildWaiterTable () {
        await pool.query('DELETE FROM waiter');
        for (var x = 0; x < waiterData.length; x++) {
            await pool.query('INSERT into waiter (id, waiter_name, days_working) values ($1, $2, $3)', [x + 1, waiterData[x].name, 'none']);
        };
    };

    return {
        updateWorkingDays,
        buildWaiterTable
    };
};
