'use strict';
module.exports = function (waiterManager) {
    function index(req, res) {
        res.render('login');
    };

    async function login(req, res) {
        let password = req.body.password;
        let user = req.body.username;
        user = user.trim();

        if (user) {
            let check = await waiterManager.checkLogin(user, password);
            if (check) {
                if (user === 'Admin') {
                    waiterManager.setAdminMode(true);
                    res.redirect('/admin');
                } else {
                    waiterManager.setAdminMode(false);
                    res.redirect('/waiter/' + user);
                }
            } else {
                req.flash('error', 'The username or password entered was incorrect');
                res.render('login', {
                    name: user
                });
            };
        } else {
            req.flash('error', 'Please enter a username');
            res.render('login', {
                name: user
            });
        };
    };

    function adminLogin(req, res) {
        res.render('login', {
            name: 'Admin'
        });
    }

    async function admin (req, res) {
        let workers = await waiterManager.findWaitersFor();
        let notWorking = await waiterManager.notWorking();
        res.render('admin', {
            days: await waiterManager.returnWeekdayObject(),
            notWorking,
            workers
        });
    }

    async function waitersUpdate (req, res) {
        req.flash('confirm', '');
        let user = req.params.username;
        let days = [];
        let type = typeof req.body.chkDay;
    
        if (type === 'string') {
            days.push(req.body.chkDay);
        } else {
            days = req.body.chkDay;
        };
        if (days.length > 3) {
            waiterManager.setCorrectChosen(false);
            waiterManager.tempDays(days);
            req.flash('confirm', 'You have selected too many shifts');
            res.render('days', {
                error: true,
                name: user,
                days: await waiterManager.returnWeekdayObject(),
            });
        } else if (days.length < 3) {
            waiterManager.setCorrectChosen(false);
            waiterManager.tempDays(days);
            req.flash('confirm', 'You have not selected enough shifts');
            res.render('days', {
                error: true,
                name: user,
                days: await waiterManager.returnWeekdayObject(),
            });
        } else {
            waiterManager.setCorrectChosen(true);
            await waiterManager.updateWorkingDays(user, days);
            req.flash('confirm', 'Shifts have been updated successfully!');
            res.render('days', {
                error: false,
                name: user,
                days: await waiterManager.returnWeekdayObject(),
            });
        };
    };

    async function clear (req, res) {
        await waiterManager.clearShiftsTable();
        res.redirect('/admin');
    };

    function back (req, res) {
        if (waiterManager.returnAdminMode() === true) {
            res.redirect('/admin');
        } else {
            waiterManager.tempDays([]);
            res.redirect('/');
        };
    };

    async function deleteWaiter (req, res) {
        let waiter = req.params.waiter;
        let data = waiter.split('-');
        let day = data[1];
        waiter = data[0].split(' ');
        waiter = waiter[0];
    
        await waiterManager.removeWaiterFrom(waiter, day);
    
        res.redirect('/admin');
    };

    async function adminUpdateWaiter (req, res) {
        let user = req.params.worker;
        res.render('days', {
            name: user,
            days: await waiterManager.returnWeekdayObject()
        });
    };

    async function loadSelection (req, res) {
        let user = req.params.username;
    
        res.render('days', {
            name: user,
            days: await waiterManager.returnWeekdayObject()
        });
    };

    return {
        index,
        login,
        adminLogin,
        admin,
        waitersUpdate,
        clear,
        back,
        deleteWaiter,
        adminUpdateWaiter,
        loadSelection
    }
};