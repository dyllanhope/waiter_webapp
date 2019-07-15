'use strict';
module.exports = function(waiterManager){
    
    function isChecked (name, day) {
        let check = waiterManager.returnChosen();
        if (check) {
            let list = waiterManager.waiterInfo(name);
            for (var i = 0; i < list.length; i++) {
                if (day === list[i]) {
                    return true;
                };
            };
            return false;
        } else {
            let list = waiterManager.returnTempDays();
            for (i = 0; i < list.length; i++) {
                if (list[i] === day){
                    return true;
                };
            };
            return false;
        };
    };

    function isBooked (name, day) {
        let weekList = waiterManager.returnWeekdayObject();
        let waiterList = waiterManager.returnWaiterData();
        for (var z = 0; z < waiterList.length; z++) {
            if (waiterList[z].name === name) {
                let daysWorking = (waiterList[z].working).trim();
                daysWorking = daysWorking.split(' ');
                for (var y = 0; y < daysWorking.length; y++) {
                    if (daysWorking[y] === day) {
                        return false;
                    };
                };
            };
        };
        for (var x = 0; x < weekList.length; x++) {
            if (weekList[x].day === day) {
                if (weekList[x].waiters === 3) {
                    return true;
                };
            };
        };
        return false;
    };

    function isAdmin (){
        let check = waiterManager.returnAdminMode();
        return check;
    };

    return {
        isChecked,
        isBooked,
        isAdmin
    }
};