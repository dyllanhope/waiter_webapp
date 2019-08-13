'use strict';
module.exports = (waiterManager) => {
    const index = (req, res) => {
        if (req.session.username) {
            let user = req.session.username;
            if (user === 'Admin') {
                res.redirect('/admin');
            } else {
                res.redirect('/waiters/' + user);
            }
        } else {
            res.render('login');
        }
    };

    const login = async (req, res) => {
        let password = req.body.password;
        let user = req.body.username;
        if (password && user) {
            user = user.trim();
            if (user && !req.session.username) {
                req.session.username = user;
                let check = await waiterManager.checkLogin(user, password);
                if (check) {
                    if (user === 'Admin') {
                        waiterManager.setAdminMode(true);
                        res.redirect('/admin');
                    } else {
                        waiterManager.setAdminMode(false);
                        res.redirect('/waiters/' + user);
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
        } else {
            req.flash('error', 'Please enter a username');
            res.render('login', {
                name: user
            });
        };
    };

    const adminLogin = (req, res) => {
        res.render('login', {
            name: 'Admin'
        });
    };

    const admin = async (req, res) => {
        let workers = await waiterManager.findWaitersFor();
        let notWorking = await waiterManager.notWorking();
        res.render('admin', {
            days: await waiterManager.returnWeekdayObject(),
            notWorking,
            workers
        });
    };

    const waitersUpdate = async (req, res) => {
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
                days: await waiterManager.returnWeekdayObject()
            });
        } else if (days.length < 3) {
            waiterManager.setCorrectChosen(false);
            waiterManager.tempDays(days);
            req.flash('confirm', 'You have not selected enough shifts');
            res.render('days', {
                error: true,
                name: user,
                days: await waiterManager.returnWeekdayObject()
            });
        } else {
            waiterManager.setCorrectChosen(true);
            await waiterManager.updateWorkingDays(user, days);
            req.flash('confirm', 'Shifts have been updated successfully!');
            res.render('days', {
                error: false,
                name: user,
                days: await waiterManager.returnWeekdayObject()
            });
        };
    };

    const clear = async (req, res) => {
        await waiterManager.clearShiftsTable();
        res.redirect('/admin');
    };

    const back = (req, res) => {
        res.redirect('/admin');
    };

    const logout = (req, res) => {
        delete req.session.username;
        waiterManager.tempDays([]);
        res.redirect('/');
    };

    const deleteWaiter = async (req, res) => {
        let waiter = req.params.waiter;
        let data = waiter.split('-');
        let day = data[1];
        waiter = data[0].split(' ');
        waiter = waiter[0];

        await waiterManager.removeWaiterFrom(waiter, day);

        res.redirect('/admin');
    };

    const loadSelection = async (req, res) => {
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
        loadSelection,
        logout
    };
};
