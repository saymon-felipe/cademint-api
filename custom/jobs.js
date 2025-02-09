const functions = require("../utils/functions");
const whatsappTemplates = require("../templates/whatsappTemplates");
const _userService = require("../services/userService");
const axios = require('axios');

let jobs = {
    init: function () {
        this.executeJobs();

        setInterval(() => {
            this.executeJobs(); // Dez minutos de intervalo;
        }, 10 * 60 * 1000)

        this.sendPendentMessagesFromWhatsappQueue();
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
    },
    sendPendentMessagesFromWhatsappQueue: function () {
        return new Promise((resolve, reject) => {
            functions.executeSql(
                `
                    SELECT
                        *
                    FROM
                        whatsapp_fila
                    WHERE
                        status = "pendente" LIMIT 10
                `, []
            ).then((results) => {
                axios.post(process.env.URL_WHATSAPP_BOT + "/whatsapp/send_messages", results, {
                    headers: {
                      'Authorization': `Bearer ${process.env.WHATSAPP_BOT_ACCESS_KEY}`
                    }
                })
                .then()
                .catch()
                .then(() => {
                    setTimeout(() => {
                        this.sendPendentMessagesFromWhatsappQueue();
                    }, 10000)
                })
            }).catch(((error) => {
                reject(error);
            }))
        })
    }
}

module.exports = jobs;