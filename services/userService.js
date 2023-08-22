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

        })
    },
    returnUserOccupations: function (userId) {
        return new Promise((resolve, reject) => {
            functions.executeSql(
                `
                    SELECT
                        *
                    FROM
                        user_occupations
                    WHERE
                        user_id = ?
                `, [userId]
            ).then((results) => {
                resolve(results);
            }).catch((error) => {
                reject(error);
            })
        })
    },
    addOccupation: function (userId, occupation) {
        return new Promise((resolve, reject) => {
            functions.executeSql(
                `
                    SELECT
                        count(id)
                    FROM
                        user_occupations
                    WHERE
                        user_id = ?
                `, [userId]
            ).then((results) => {
                if (results.length == 5) {
                    reject("Você já possui o numero máximo de cargos permitidos");
                } else {
                    functions.executeSql(
                        `
                            INSERT INTO
                                user_occupations
                                (user_id, occupation_name)
                            VALUES
                                (?, ?)
                        `, [userId, occupation]
                    ).then((results2) => {
                        resolve();
                    }).catch((error2) => {
                        reject(error2);
                    })
                }
            }).catch((error) => {
                reject(error);
            })
        })
    },
    returnSingleUser: function (userId) {
        return new Promise((resolve, reject) => {
            let userAchievements;
            let userMedals = [];
            let userOccupations = [];

            let promises = [];

            promises.push(
                this.returnUserAchievements(userId).then((results) => {
                    userAchievements = results;
                })
            )

            promises.push(
                this.returnUserMedals(userId).then((results) => {
                    userMedals = results;
                })
            )

            promises.push(
                this.returnUserOccupations(userId).then((results) => {
                    userOccupations = results;
                })
            )

            Promise.all(promises).then(() => {
                functions.executeSql(
                    `
                        SELECT
                            id_usuario,
                            email,
                            nome,
                            profile_photo,
                            user_level,
                            level_progress,
                            user_cover_image,
                            user_bio
                        FROM
                            usuarios
                        WHERE
                            id_usuario = ?
                    `, [userId]
                ).then((results) => {
                    let user = {
                        id_usuario: results[0].id_usuario,
                        email: results[0].email,
                        nome: results[0].nome,
                        profile_photo: results[0].profile_photo,
                        user_level: results[0].user_level,
                        level_progress: results[0].level_progress,
                        user_cover_image: results[0].user_cover_image,
                        user_bio: results[0].user_bio,
                        user_achievements: userAchievements,
                        user_medals: userMedals,
                        user_occupations: userOccupations
                    }
                    resolve(user);
                }).catch((error) => {
                    reject(error);
                })
            })
        })
    },
    returnGroupUsers: function (group_id) {
        return new Promise((resolve, reject) => {
            functions.executeSql(
                `
                    SELECT
                        id_usuario
                    FROM
                        usuarios u
                    LEFT JOIN
                        group_members gm ON gm.user_id = u.id_usuario
                    WHERE
                        gm.group_id = ?
                `, [group_id]
            ).then((results) => {
                let promises = [];
                let users = [];

                for (let i = 0; i < results.length; i++) {
                    let currentUserId = results[i].id_usuario;

                    promises.push(
                        this.returnSingleUser(currentUserId).then((results2) => {
                            users.push(results2);
                        })
                    )
                } 

                Promise.all(promises).then(() => {
                    resolve(users);
                })                
            }).catch((error) => {
                reject(error);
            })
        })
    },
    returnGroupPendingUsers: function (groupId) {
        return new Promise((resolve, reject) => {
            functions.executeSql(
                `
                    SELECT
                        pending_user_email
                    FROM
                        group_pending_users
                    WHERE
                        group_pending_users.group_id = ?
                `, [groupId]
            ).then((results) => {
                resolve(results);
            }).catch((error) => {
                reject(error);
            })
        })
    },
    returnUserGroups: function (userId) {
        return new Promise((resolve, reject) => {
            functions.executeSql(
                `
                    SELECT
                        *
                    FROM
                        os_groups
                    LEFT JOIN
                        user_groups ug ON ug.group_id = os_groups.groups_id
                    WHERE
                        ug.user_id = ?
                `, [userId]
            ).then((results) => {
                let groups = results;
                let promises = [];

                for (let i = 0; i < groups.length; i++) {
                    let currentGroup = groups[i];

                    promises.push(
                        this.returnGroupUsers(currentGroup.groups_id).then((results2) => {
                            currentGroup['group_members'] = results2;
                        })
                    )

                    promises.push(
                        this.returnGroupPendingUsers(currentGroup.groups_id).then((results2) => {
                            currentGroup['pending_users'] = results2;
                        })
                    )
                }

                Promise.all(promises).then(() => {
                    resolve(groups);
                })
            }).catch((error) => {
                reject(error);
            })
        })
    },
    returnUserMedals: function (userId) {
        return new Promise((resolve, reject) => {
            functions.executeSql(
                `
                    SELECT
                        *
                    FROM
                        medals m
                    LEFT JOIN
                        user_medals um ON um.medal_id = m.id
                    WHERE
                        um.user_id = ?
                `, [userId]
            ).then((results) => {
                resolve(results);
            }).catch((error) => {
                reject(error);
            })
        })
    },
    returnUserAchievements: function (userId) {
        return new Promise((resolve, reject) => {
            functions.executeSql(
                `
                    SELECT
                        *
                    FROM
                        achievements a
                    LEFT JOIN
                        user_achievements ua ON ua.achievement_id = a.id
                    WHERE
                        ua.user_id = ?
                `, [userId]
            ).then((results) => {
                resolve(results);
            }).catch((error) => {
                reject(error);
            })
        })
    },
    returnUser: function (userId, userEmail = "") {
        return new Promise((resolve, reject) => {
            let userGroups;
            let singleUser;

            let promises = [];
            let userIdPromisse = [];

            if (userEmail != "") {
                userIdPromisse.push(functions.executeSql(
                    `
                        SELECT
                            id_usuario
                        FROM
                            usuarios
                        WHERE 
                            email = ?
                    `, [userEmail]
                ).then((results) => {
                    if (results.length == 0) {
                        resolve("Usuário não cadastrado");
                    } else {
                        userId = results[0].id_usuario;
                    }
                }))
            } else {
                userIdPromisse.push(
                    new Promise((resolve2) => {
                        resolve2();
                    })
                )
            }

            Promise.all(userIdPromisse).then(() => {
                promises.push(this.returnUserGroups(userId).then((results) => {
                    userGroups = results;
                }).catch((error) => {
                    reject(error);
                }))
    
                promises.push(
                    this.returnSingleUser(userId).then((results) => {
                        singleUser = results;
                    })
                )
    
                Promise.all(promises).then(() => {
                    singleUser["user_groups"] = userGroups;
                    resolve(singleUser);
                })
            })
        })
    }
}

module.exports = userService;