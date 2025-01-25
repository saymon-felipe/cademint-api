const functions = require("../utils/functions");

let userId;
let user_level;
let level_progress;

function calculateUserLevelProgress(current_level, current_level_progress, progress_add) {
    let newProgress = 0;
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
    setUser: function (user_id) {
        return new Promise((resolve, reject) => {
            userId = user_id;

            functions.executeSql(
                `
                    SELECT
                        level_progress,
                        user_level
                    FROM
                        users
                    WHERE
                        id_usuario = ?
                `, [user_id]
            ).then((results) => {
                if (results[0] != undefined) {
                    user_level = results[0].user_level,
                    level_progress = results[0].level_progress
                }

                resolve();
            }).catch((error) => {
                reject(error);
            })
        })
        
    },
    add: function (number_received) {
        return new Promise((resolve, reject) => {
            let level = calculateUserLevelProgress(user_level, level_progress, number_received);

            functions.executeSql(
                `
                    UPDATE
                        users
                    SET
                        user_level = ?, level_progress = ?
                    WHERE
                        id_usuario = ?
                `, [level.new_level, level.new_progress, userId]
            ).then((results) => {
                resolve();
            }).catch((error) => {
                reject(error);
            })
        })
        
    }
}

module.exports = userLevel;