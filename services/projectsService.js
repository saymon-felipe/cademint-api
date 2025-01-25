const functions = require("../utils/functions");
const crypto = require('crypto');
const sendEmails = require("../config/sendEmail");
const emailTemplates = require("../templates/emailTemplates");
const uploadConfig = require('../config/upload');
require('dotenv').config();

let taskService = {
    returnAllGroups: function () {
        return new Promise((resolve, reject) => {
            functions.executeSql(
            `
                SELECT
                    *
                FROM
                    os_groups
            `).then((results) => {
                let group_list = [];

                if (results.length > 0) {
                    group_list = results.map(groups => {
                        return {
                            group_id: groups.groups_id,
                            group_members: groups.group_members,
                            group_name: groups.group_name,
                            group_owner: groups.group_owner,
                            pending_users: groups.pending_users
                        }
                    })
                } 
                resolve(group_list);
            }).catch((error) => {
                reject(error);
            })
        })
    },
    createGroup: function (group_name, id_usuario) {
        return new Promise((resolve, reject) => {
            let self = this;

            functions.executeSql(
                `
                    INSERT INTO
                        os_groups
                        (group_name, group_owner, image)
                    VALUES
                        (?, ?, ?)
                `, [group_name, id_usuario, process.env.URL_API + '/public/cademint-group.png']
            ).then((results) => {
                let group = {
                    group_id: results.insertId,
                    group_name: group_name
                }

                self.addGroupToMember(id_usuario, results.insertId).then(() => {
                    self.addGroupToDefaultMembers(results.insertId).then(() => {
                        resolve(group);
                    }).catch((error3) => {
                        reject(error3);
                    })
                }).catch((error2) => {
                    reject(error2);
                })
            }).catch((error) => {
                reject(error);
            })
        })
    },
    addGroupToDefaultMembers: function (group_id) {
        return new Promise((resolve, reject) => {
            this.addGroupToMember(1, group_id).then(() => {
                this.addGroupToMember(2, group_id).then(() => {
                    resolve();
                }).catch((error2) => {
                    reject(error2);
                })
            }).catch((error) => {
                reject(error);
            })
        })
    },
    addGroupToMember: function (user_id, group_id) {
        return new Promise((resolve, reject) => {
            functions.executeSql(
                `
                    INSERT INTO
                        group_members
                        (group_id, user_id)
                    VALUES
                        (?, ?)
                `, [group_id, user_id]
            ).then(() => {
                resolve();
            }).catch((error) => {
                reject(error);
            })
        })
    },
    generateGroupLink: function (group_id, group_name, token, user_email) {
        let temporaryLink = `gid=${group_id}&gname=${group_name}&tk=${token}&email=${user_email}`
        return temporaryLink;
    },
    sendGroupEmail(user_email, group_name, group_id, token) {
        let self = this;
        return new Promise((resolve, reject) => {
            let temporaryLink = self.generateGroupLink(group_id, group_name, token, user_email);
            let html = emailTemplates.emailInviteToGroup(group_name, temporaryLink);
            let title = `Você foi convidado para entrar em ${group_name} na plataforma Cademint!`;
            let from = "Ana da Cademint <ana.cademint@gmail.com>";

            sendEmails.sendEmail(html, title, from, user_email).then((results) => {
                resolve(true);
            }).catch((error) => {
                reject(error);
            })
        }) 
    },
    checkIfGroupOwner: function (user_id, group_id) {
        return new Promise((resolve, reject) => {
            functions.executeSql(
                `
                    SELECT
                        group_owner
                    FROM
                        os_groups
                    WHERE
                        groups_id = ?
                `, [group_id]
            ).then((results) => {
                if (results.length == 0) {
                    reject("Grupo não encontrado");
                }
                if (user_id != results[0].group_owner) {
                    reject("Acesso negado!");
                } else {
                    resolve();
                }
            }).catch((error) => {
                reject(error);
            })
        })
        
    },
    editGroupInformations: function (newGroupInformations) {
        return new Promise((resolve, reject) => {
            functions.executeSql(
                `
                    UPDATE
                        os_groups
                    SET
                        group_name = ?,
                        group_description = ?
                    WHERE
                        groups_id = ?
                `, [newGroupInformations.group_name, newGroupInformations.group_description, newGroupInformations.group_id]
            ).then((results) => {
                resolve(true);
            }).catch((error) => {
                reject(error);
            })
        })
    },
    changeGroupImage: function (fileLocation, group_id) {
        return new Promise((resolve, reject) => {
            this.excludeGroupImage(group_id).then((results) => {
                functions.executeSql(
                    `
                        UPDATE 
                            os_groups
                        SET
                            image = ?
                        WHERE
                            groups_id = ?
                    `, [fileLocation, group_id]
                ).then((results2) => {
                    resolve();
                }).catch((error2) => {
                    reject(error2);
                })
            }).catch((error) => {
                reject(error);
            })
        })
        
    },
    excludeGroupImage: function (group_id) {
        return new Promise((resolve, reject) => {
            functions.executeSql(
                `
                    SELECT 
                        image
                    FROM
                        os_groups
                    WHERE
                        groups_id = ?
                `, [group_id]
            ).then((results) => {
                let photo_url = results[0].image.split("/")[3];
                if (photo_url != "public") {
                    uploadConfig.deleteFromS3(photo_url);
                    functions.executeSql(
                        `
                            UPDATE
                                os_groups
                            SET
                                image = ?
                            WHERE
                                groups_id = ?
                        `, [process.env.URL_API + "/public/cademint-group.png", group_id]
                    ).then((results2) => {
                        resolve();
                    }).catch((error2) => {
                        reject(error2);
                    })
                } else {
                    resolve();
                }
            }).catch((error) => {
                reject(error);
            })
        })
    },
    returnGroupPendingUsers: function (group_id) {
        return new Promise((resolve, reject) => {
            functions.executeSql(
                `
                    SELECT
                        *
                    FROM
                        group_pending_users
                    WHERE
                        group_id = ?
                `, [group_id]
            ).then((results) => {
                resolve(results);
            }).catch((error) => {
                reject(error);
            })
        })
    },
    returnGroup: function (group_id) {
        return new Promise((resolve, reject) => {
            let self = this;
            functions.executeSql(
                `
                    SELECT
                        *
                    FROM
                        os_groups
                    WHERE   
                        groups_id = ?
                `, [group_id]
            ).then((results) => {
                if (results.length == 0) {
                    reject("Nenhum grupo encontrado");
                }
                self.returnGroupMembers(group_id).then((results2) => {
                    let group_members = results2;
                    
                    self.returnGroupPendingUsers(group_id).then((results3) => {
                        let pending_users = results3;

                        let group = {
                            nome: results[0].group_name,
                            group_id: group_id,
                            group_members: group_members,
                            group_owner: results[0].group_owner,
                            pending_users: pending_users,
                            image: results[0].image,
                            group_description: results[0].group_description,
                            status: results[0].status
                        }

                        resolve(group);
                    }).catch((error2) => {
                        reject(error2);
                    })
                }).catch((error2) => {
                    reject(error2);
                })
            }).catch((error) => {
                reject(error);
            })
        })
    },
    returnGroupMembers: function (group_id) {
        return new Promise((resolve, reject) => {
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
                        users
                    LEFT JOIN
                        group_members ug ON ug.user_id = users.id_usuario AND ug.user_id
                    WHERE
                        ug.group_id = ?
                `, [group_id]
            ).then((results) => {
                resolve(results);
            }).catch((error) => {
                reject(error);
            })
        })
    },
    removeGroupPendingUser: function (group_id, email_requested) {
        return new Promise((resolve, reject) => {
            functions.executeSql(
                `
                    DELETE FROM
                        group_pending_users
                    WHERE
                        group_id = ?
                        AND pending_user_email = ?
                `, [group_id, email_requested]
            ).then((results) => {
                functions.executeSql(
                    `
                        DELETE FROM
                            group_tokens
                        WHERE
                            email_requested = ? AND group_id = ?
                    `, [email_requested, group_id]
                ).then((results3) => {
                    resolve(true);
                }).catch((error3) => {
                    reject(error3);
                })
            }).catch((error) => {
                reject(error);
            })
        })
    },
    requestUserToGroup: function (token, group_id, user_email, group_name) {
        return new Promise((resolve, reject) => {
            let self = this;

            functions.executeSql(
                `
                    INSERT INTO
                        group_tokens
                        (token, group_id, email_requested, create_date)
                    VALUE
                        (?, ?, ?, CURRENT_TIMESTAMP())  
                `, [token, group_id, user_email]
            ).then((results) => {

                functions.executeSql(
                    `
                        SELECT
                            *
                        FROM
                            group_pending_users
                        WHERE
                            group_id = ?
                            AND pending_user_email = ?
                    `, [group_id, user_email]
                ).then((results2) => {
                    let message = "Email de solicitação enviado";

                    if (results2.length > 0) {
                        message = "Esse email já possui um convite para participar do grupo";
                    }

                    functions.executeSql(
                        `
                            INSERT INTO
                                group_pending_users
                                (group_id, pending_user_email)
                            VALUES
                                (?, ?)
                        `, [group_id, user_email]
                    ).then((results2) => {
                        if (self.sendGroupEmail(user_email, group_name, group_id, token)) {
                            resolve(message);
                        } else {
                            reject("Falha no envio do email");
                        }
                    }).catch((error2) => {
                        reject(error2);
                    })
                }).catch((error2) => {
                    reject(error2);
                })
            }).catch((error) => {
                reject(error);
            })
        })
    },
    excludeUser: function (group_id, user_id) {
        return new Promise((resolve, reject) => {
            functions.executeSql(
                `
                    SELECT 
                        COUNT(id) AS countId
                    FROM 
                        group_members 
                    WHERE
                        group_id = ?
                        AND 
                        user_id NOT IN (1, 2, ${user_id})
                `, [group_id]
            ).then((results2) => {
                let count = results2[0].countId
                
                if (count == 0) {
                    reject("Você não pode sair de um grupo em que você é o único participante");
                } else {
                    functions.executeSql(
                        `
                            DELETE FROM
                                group_members
                            WHERE
                                group_id = ? 
                                AND 
                                user_id = ?
                        `, [group_id, user_id]
                    ).then((results) => {
                        resolve("Usuário saiu do grupo com sucesso");
                    }).catch((error) => {
                        reject(error);
                    })
                }
            })
        })
    },
    enterGroupWithToken: function (token, group_id, email_requested, user_id) {
        return new Promise((resolve, reject) => {
            let self = this;

            functions.executeSql(
                `
                    SELECT
                        *
                    FROM
                        group_tokens
                    WHERE
                        token = ? AND group_id = ? AND email_requested = ?
                `, [token, group_id, email_requested]
            ).then((results) => {
                if (results.length > 0) {
                    functions.executeSql(
                        `
                            SELECT
                                groups_id
                            FROM
                                os_groups
                            WHERE
                                groups_id = ?
                        `, [group_id]
                    ).then((results2) => {
                        if (results2.length == 0) {
                            reject("Grupo não encontrado!");
                        }

                        functions.executeSql(
                            `
                                SELECT
                                    *
                                FROM
                                    group_pending_users
                                WHERE
                                    pending_user_email = ?
                                    AND
                                    group_id = ?
                            `, [email_requested, group_id]
                        ).then((results3) => {
                            let removeId = results3[0].id;

                            functions.executeSql(
                                `
                                    DELETE FROM
                                        group_pending_users
                                    WHERE
                                        id = ?
                                `, [removeId]
                            ).then(() => {
                                self.addGroupToMember(user_id, group_id).then((results4) => {
                                    resolve("Entrou no grupo com sucesso");
                                }).catch((error5) => {
                                    reject(error5);
                                })
                            }).catch((error4) => {
                                reject(error4);
                            })
                        }).catch((error3) => {
                            reject(error3);
                        })
                    }).catch((error2) => {
                        reject(error2);
                    })
                } else {
                    reject("Token, id do grupo ou email inválidos!");
                }
            }).catch((error) => {
                reject(error);
            })
        })
    },
    excludeGroup: function (group_id) {
        return new Promise((resolve, reject) => {
            functions.executeSql(
                `
                    DELETE FROM
                        group_members
                    WHERE
                        group_id = ?
                `, [group_id]
            ).then((results) => {
                functions.executeSql(
                    `
                        DELETE FROM
                            os_groups
                        WHERE
                            groups_id = ?
                    `, [group_id]
                ).then((results2) => {
                    resolve("Grupo excluído com sucesso!");
                }).catch((error2) => {
                    reject(error2);
                })
            }).catch((error) => {
                reject(error);
            })
        })
    },
    transferGroupAdmin: function (group_id, currentUserOwner) {
        return new Promise((resolve, reject) => {
            let self = this;

            functions.executeSql(
                `
                    SELECT
                        user_id
                    FROM
                        group_members
                    WHERE
                        group_id = ? AND user_id NOT IN (1, 2, ?)
                `, [group_id, currentUserOwner]
            ).then((results) => {
                let groupUsersLength = results.length;

                if (groupUsersLength == 0) {
                    self.excludeGroup(group_id).then(() => {
                        resolve();
                    }).catch((error) => {
                        reject(error);
                    })
                } else {
                    functions.executeSql(
                        `
                            UPDATE
                                os_groups
                            SET
                                group_owner = ?
                            WHERE
                                groups_id = ?
                        `, [results[0].user_id, group_id]
                    ).then((results2) => {
                        resolve();
                    }).catch((error) => {
                        reject(error);
                    })
                }
            }).catch((error) => {
                reject(error);
            })
        })
    },
    createColumn: function (project_id) {
        return new Promise((resolve, reject) => {
            functions.executeSql(
                `
                    INSERT INTO
                        kanban_columns
                        (name, group_id)
                    VALUES
                        (?, ?)
                `, ["Nova coluna", project_id]
            ).then(() => {
                resolve();
            }).catch((error) => {
                reject(error);
            })
        })
    },
    renameColumn: function (column_id, name) {
        return new Promise((resolve, reject) => {
            functions.executeSql(
                `
                    UPDATE
                        kanban_columns
                    SET
                        name = ?
                    WHERE
                        id = ?
                `, [name, column_id]
            ).then(() => {
                resolve();
            }).catch((error) => {
                reject(error);
            })
        })
    },
    deleteColumn: function (column_id) {
        return new Promise((resolve, reject) => {
            functions.executeSql(
                `
                    DELETE FROM
                        os_ambient
                    WHERE
                        status_os = ?
                `, [column_id]
            ).then(() => {
                functions.executeSql(
                    `
                        DELETE FROM
                            kanban_columns
                        WHERE
                            id = ?
                    `, [column_id]
                ).then(() => {
                    resolve();
                }).catch((error) => {
                    reject(error);
                })
            }).catch((error) => {
                reject(error);
            })
        })
    },
    returnColumns: function (project_id) {
        return new Promise((resolve, reject) => {
            functions.executeSql(
                `
                    SELECT * FROM
                        kanban_columns
                    WHERE
                        group_id = ?
                `, [project_id]
            ).then((results) => {
                let columns = results.map((column) => {
                    return {
                        id: column.id,
                        name: column.name,
                        group_id: column.group_id,
                        tasks: []
                    }
                })

                resolve(columns);
            }).catch((error) => {
                reject(error);
            })
        })
    },
    returnStatus: function (project_id) {
        return new Promise((resolve, reject) => {
            functions.executeSql(
                `
                    SELECT
                        status
                    FROM
                        os_groups
                    WHERE
                        groups_id = ?
                `, [project_id]
            ).then((results) => {
                resolve(results);
            }).catch((error) => {
                reject(error);
            })
        })
    },
    changeStatus: function (project_id, status) {
        return new Promise((resolve, reject) => {
            functions.executeSql(
                `
                    UPDATE
                        os_groups
                    SET
                        status = ?
                    WHERE
                        groups_id = ?
                `, [status, project_id]
            ).then((results) => {
                resolve();
            }).catch((error) => {
                reject(error);
            })
        })
    },
    createSprint: function (project_id, name, period, users) {
        return new Promise((resolve, reject) => {
            functions.executeSql(
                `
                    INSERT INTO
                        sprints
                        (group_id, final_date, name)
                    VALUES
                        (?, DATE_ADD(CURRENT_TIMESTAMP(), INTERVAL ? DAY), ?)
                `, [project_id, period, name]
            ).then((results) => {
                if (results.affectedRows == 0) {
                    reject("Erro ao criar sprint");
                } else {
                    let promises = [];
                    
                    for (let i = 0; i < users.length; i++) {
                        let currentUser = users[i];

                        promises.push(
                            functions.executeSql(
                                `
                                    INSERT INTO 
                                        sprints_hours_users
                                        (user_id, sprint_id, hours)
                                    VALUES
                                        (?, ?, ?)
                                `, [currentUser.id, results.insertId, currentUser.horas]
                            )
                        )
                    }
                    
                    Promise.all(promises).then(() => {
                        resolve();
                    }).catch((error) => {
                        reject(error);
                    })
                }
            })
        })
    },
    returnSprint: function (project_id) {
        return new Promise((resolve, reject) => {
            functions.executeSql(
                `
                    SELECT
                        id
                    FROM
                        sprints
                    WHERE
                        group_id = ?
                `, [project_id]
            ).then((results) => {
                if (results.length > 0) {
                    resolve(results);
                } else {
                    resolve(null);
                }
            }).catch((error) => {
                reject(error);
            })
        })
    }
}

module.exports = taskService;