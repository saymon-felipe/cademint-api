const functions = require("../utils/functions");

let jobs = {
    executeJobs: function () {
        functions.executeSql(
            `
                SELECT
                    *
                FROM
                    jobs;
            `, []
        ).then((results) => {
            for (let i = 0; i < results.length; i++) {
                let currentJob = results[i];

                functions.executeSql(currentJob.script_sql, []).then((results2) => {
                    jobs[currentJob.function_name](results2[0]);
                })
            }
        })
    },
    sendNotifications: function (idArray) {
        let array = [];

        for (let i = 0; i < idArray.length; i++) {
            array.push(idArray[0].id)
        }

        functions.executeSql(
            `
                SELECT
                    id_usuario,
                    tel,
                    nome
                FROM
                    users
                WHERE id_usuario IN (?)
            `, [array.join(",")]
        ).then((results) => {
            for (let i = 0; i < results.length; i++) {
                let currentUser = results[i];

                //TODO: Fazer envio de whatsapp para o numero com notificação de uso da plataforma
            }
        })
    }
}

module.exports = jobs;