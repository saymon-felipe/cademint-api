const functions = require("../utils/functions");
const bcrypt = require('bcrypt');

let userService = {
    checkResetPasswordToken: function (token) {
        return new Promise((resolve, reject) => {
            functions.executeSql(
                `
                    SELECT
                        reset_password_token
                    FROM
                        usuarios
                    WHERE
                        reset_password_token = ? AND reset_password_require_date >= DATE_SUB(CURRENT_TIMESTAMP(), INTERVAL 30 MINUTE)
                `, [token]
            ).then((results) => {
                if (results.length == 0) {
                    reject("Token para redefinição de senha inválido ou expirado");
                }
                resolve("Token para redefinição de senha válido");
            }).catch((error) => {
                reject(error);
            })
        })
    },
    resetPassword: function (token, password) {
        return new Promise((resolve, reject) => {
            this.checkResetPasswordToken(token).then((results) => {
                functions.executeSql(
                    `
                        SELECT
                            senha, id_usuario
                        FROM
                            usuarios
                        WHERE
                            reset_password_token = ?
                    `, [token]
                ).then((results2) => {
                    bcrypt.compare(password, results2[0].senha, (errCompare, result) => {
                        if (!result) {
                            bcrypt.hash(password, 10, (errBcrypt, hash) => {
                                if (errBcrypt) {
                                    reject(errBcrypt);
                                }

                                functions.executeSql(
                                    `
                                        UPDATE
                                            usuarios
                                        SET
                                            senha = ?, reset_password_token = ""
                                        WHERE
                                            id_usuario = ?
                                    `, [hash, results2[0].id_usuario]
                                ).then((results3) => {
                                    resolve("Senha alterada com sucesso!");
                                }).catch((error3) => {
                                    reject(error3);
                                })
                            });
                        } else {
                            reject("A senha não pode ser igual a anterior");
                        }
                    });
                }).catch((error2) => {
                    reject(error2);
                })
            }).catch((error) => {
                reject(error);
            })
        })
    },
    returnUsers: function () {
        return new Promise((resolve, reject) => {

            functions.executeSql(
                `
                    SELECT
                        email,
                        nome,
                        id_usuario,
                        profile_photo,
                        user_groups,
                        user_level, 
                        level_progress,
                        user_cover_image,
                        user_medals,
                        user_achievements,
                        user_bio,
                        user_occupation
                    FROM
                        usuarios
                `
            ).then((results) => {
                if (results.length > 0) {
                    resolve(results);
                } else {
                    reject("Nenhum usuário cadastrado");
                }
            }).catch((error) => {
                reject(error);
            })
        })
    },
    returnUserOccupations: function (userId) {
        return new Promise((resolve, reject) => {
            functions.executeSql(
                `
                    SELECT
                        user_occupation
                    FROM
                        usuarios
                    WHERE
                        id_usuarios = ?
                `, [userId]
            ).then((results) => {
                resolve(results[0].user_occupation);
            }).catch((error) => {
                reject(error);
            })
        })
    },
    returnUser: function (userId) {
        return new Promise((resolve, reject) => {
            functions.executeSql(
                `
                    SELECT
                        *
                    FROM
                        usuarios
                    WHERE
                        id_usuario = ?
                `, [userId]
            ).then((results) => {
                if (results.length > 0) {
                    let user_groups = results[0].user_groups.split(",");
                    let user_groups_object = [];
                    let user_groups_id = "";
                    let promises = [];
                    for (let i in user_groups) {
                        promises.push(
                            functions.executeSql(
                                `
                                    SELECT
                                        *
                                    FROM
                                        os_groups
                                    WHERE
                                        groups_id = ?
                                `, [user_groups[i]]
                            ).then((results2) => {
                                if (results2[0] != undefined) {
                                    let group_members_object = [], pending_users = results2[0].pending_users, pending_members_array = [];
                                    if (pending_users.indexOf(",")) { //Se entrar aqui significa que existe mais de um email na lista de usuarios pendentes
                                        pending_members_array = pending_users.split(",");
                                    } else {
                                        pending_members_array.push(results2[0].pending_users);
                                    }
                                    let resultsGroupMembers = results2[0].group_members.split(",");
                                    let promises2 = [];
                                    for (let j in resultsGroupMembers) {
                                        promises2.push(
                                            functions.executeSql(
                                                `
                                                    SELECT
                                                        *
                                                    FROM
                                                        usuarios
                                                    WHERE
                                                        id_usuario = ?
                                                `, [resultsGroupMembers[j]]
                                            ).then((results3) => {
                                                group_members_object[j] = {
                                                    nome: results3[0].nome,
                                                    email: results3[0].email,
                                                    id_usuario: results3[0].id_usuario,
                                                    profile_photo: results3[0].profile_photo,
                                                    user_groups: results3[0].user_groups
                                                }
                                            }).catch((error3) => {
                                                reject(error3);
                                            })
                                        )
                                    }

                                    Promise.all(promises2).then(() => {
                                        user_groups_object[i] = {
                                            groups_id: results2[0].groups_id,
                                            group_name: results2[0].group_name,
                                            group_members: group_members_object,
                                            group_owner: results2[0].group_owner,
                                            pending_users: pending_members_array,
                                            image: results2[0].image,
                                            group_description: results2[0].group_description
                                        }

                                        if (i == 0) {
                                            user_groups_id = results2[0].groups_id;
                                        } else {
                                            user_groups_id += "," + results2[0].groups_id;
                                        }
                                    }).catch((error2) => {
                                        reject(error2);
                                    })
                                }
                            }).catch((error2) => {
                                reject(error2);
                            })
                        )
                    }

                    Promise.all(promises).then(() => {
                        let user_medals = results[0].user_medals;
                        let user_achievements = results[0].user_achievements;
                        let user_achievements_object = [];
                        let user_medals_object = [];
                        
                        if (user_medals.indexOf(",") != -1) {
                            user_medals = user_medals.split(",");
                        } 

                        if (user_achievements.indexOf(",") != -1) {
                            user_achievements = user_achievements.split(",");
                        } 

                        let promises3 = [];

                        if (user_achievements != "") {
                            for (let i = 0; i < user_achievements.length; i++) {
                                promises3.push(
                                    functions.executeSql(
                                        `
                                            SELECT
                                                *
                                            FROM
                                                achievements
                                            WHERE
                                                id = ?
                                        `, [user_achievements[i]]
                                    ).then((results4) => {
                                        let achievements = {
                                            id: results4[0].id,
                                            achievements_name: results4[0].achievements_name,
                                            achievements_description: results4[0].achievements_description
                                        }
                                        user_achievements_object.push(achievements);
                                    }).catch((error4) => {
                                        reject(error4);
                                    })
                                )
                            }
                        }

                        if (user_medals != "") {
                            for (let i = 0; i < user_medals.length; i++) {
                                promises3.push(
                                    functions.executeSql(
                                        `
                                            SELECT
                                                *
                                            FROM
                                                medals
                                            WHERE
                                                id = ?
                                        `, [user_medals[i]]
                                    ).then((results5) => {
                                        let medal = {
                                            id: results[0].id,
                                            medal_name: results[0].medal_name,
                                            medal_description: results[0].medal_description
                                        }

                                        user_medals_object.push(medal);
                                    }).catch((error5) => {
                                        reject(error5);
                                    })
                                )
                            }
                        }

                        Promise.all(promises3).then(() => {
                            let user = {
                                id_usuario: userId,
                                email: results[0].email,
                                nome: results[0].nome,
                                profile_photo: results[0].profile_photo,
                                user_groups: user_groups_object,
                                user_groups_id: user_groups_id,
                                user_medals: user_medals_object,
                                user_achievements: user_achievements_object,
                                user_level: results[0].user_level,
                                level_progress: results[0].level_progress,
                                user_cover_image: results[0].user_cover_image,
                                user_occupation: results[0].user_occupation,
                                user_bio: results[0].user_bio
                            }
                            resolve(user);
                        }).catch((error2) => {
                            reject(error2);
                        })
                    }).catch((error2) => {
                        reject(error2);
                    })
                } else {
                    reject("Nenhum usuário com esse ID");
                }
            }).catch((error) => {
                reject(error);
            })
        })
    }
}

module.exports = userService;