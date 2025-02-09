const functions = require("../utils/functions");
const whatsappTemplates = require("../templates/whatsappTemplates");
const _userService = require("../services/userService");

let jobs = {
    init: function () {
        jobs.executeJobs();

        setInterval(() => {
            jobs.executeJobs(); // Dez minutos de intervalo;
        }, 10 * 60 * 1000)
    },
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
        let usersIdArray = [];

        for (let i = 0; i < idArray.length; i++) {
            usersIdArray.push(idArray[0].id);
        }

        _userService.returnUsersById(usersIdArray).then((users) => {
            users.forEach(user => {
                let message = whatsappTemplates.notificacaoUso(user.nome);

                functions.insertWhatsappQueue(message, user.tel);
            });
        })
    }
}

module.exports = jobs;