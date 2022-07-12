const mysql = require("../mysql").pool;

let userId;
let user_level;
let level_progress;

function calculateUserLevelProgress(current_level, current_level_progress, progress_add) {
    let newProgress;
    let newLevel = user_level;
    if (current_level > 0 && current_level <= 9) {
        newProgress = new Number(parseFloat(current_level_progress) + parseFloat(progress_add) + (parseFloat(progress_add) * (250 / 100))).toFixed(4);
    }

    if (current_level > 9 && current_level <= 19) {
        newProgress = new Number(parseFloat(current_level_progress) + parseFloat(progress_add) + (parseFloat(progress_add) * (150 / 100))).toFixed(4);
    }

    if (current_level > 19 && current_level <= 30) {
        newProgress = new Number(parseFloat(current_level_progress) + parseFloat(progress_add) + (parseFloat(progress_add) * (100 / 100))).toFixed(4);
    }

    if (current_level > 30 && current_level < 999) {
        newProgress = new Number(parseFloat(current_level_progress) + parseFloat(progress_add) + (parseFloat(progress_add) * (50 / 100))).toFixed(4);
    }

    if (newProgress > Number(100.0000)) {
        newLevel = user_level + 1;
        newProgress = new Number(1.0000).toFixed(4);
    }

    let level = {
        new_level: newLevel,
        new_progress: newProgress
    }

    return level;
}

let userLevel = {
    setUser: async function (user_id) {
        userId = user_id;
        mysql.getConnection((error, conn) => {
            if (error) { console.log(error) };
            conn.query('select level_progress, user_level from usuarios where id_usuario = ?',
            [user_id],
                (err, results) => {
                    if (err) { console.log(err) };
                    conn.release();
                    user_level = results[0].user_level;
                    level_progress = results[0].level_progress;
                }
            )
        })
    },
    add: function (number_received) {
        let level = calculateUserLevelProgress(user_level, level_progress, number_received);
        mysql.getConnection((error, conn) => {
            if (error) { console.log(error) };
            conn.query('update usuarios set user_level = ? where id_usuario = ?',
            [level.new_level, userId],
                (err, results) => {
                    if (err) { console.log(err) };
                    conn.query('update usuarios set level_progress = ? where id_usuario = ?',
                    [level.new_progress, userId],
                        (err2, results2) => {
                            if (err2) { console.log(err2) };
                            conn.release();
                        }
                    )
                }
            )
        })
    }
}

module.exports = userLevel;