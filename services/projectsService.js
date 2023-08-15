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
    createGroup: function (group_name, group_members, id_usuario, pending_users) {
        return new Promise((resolve, reject) => {
            let self = this;
            functions.executeSql(
                `
                    INSERT INTO
                        os_groups
                        (group_name, group_members, group_owner, image)
                    VALUES
                        (?, ?, ?, ?)
                `, [group_name, group_members, id_usuario, process.env.URL_API + '/public/cademint-group.png']
            ).then((results) => {
                let grupo_criado = {
                    groups_id: results.insertId,
                    group_name: group_name,
                    group_members: id_usuario,
                    group_owner: id_usuario,
                    pending_users: pending_users
                }  
                self.addGroupToMember(id_usuario, results.insertId, pending_users, group_name, false).then((results2) => {
                    self.addGroupToDefaultMembers(results.insertId, pending_users, group_name).then((results3) => {
                        resolve(grupo_criado);
                    }).catch((error3) => {
                        console.log(error3)
                        reject(error3);
                    })
                }).catch((error2) => {
                    console.log(error2)
                    reject(error2);
                })
            }).catch((error) => {
                console.log(error)
                reject(error);
            })
        })
    },
    addGroupToDefaultMembers: function (group_id, pending_users, group_name) {
        return new Promise((resolve, reject) => {
            this.addGroupToMember(1, group_id, pending_users, group_name, true).then(() => {
                this.addGroupToMember(2, group_id, pending_users, group_name, true).then(() => {
                    resolve(true);
                }).catch((error2) => {
                    reject(error2);
                })
            }).catch((error) => {
                reject(error);
            })
        })
    },
    addGroupToMember: function (user_id, group_id, pending_users, group_name, from_default) {
        let self = this;
        return new Promise((resolve, reject) => {
            functions.executeSql(
                `
                    SELECT 
                        user_groups
                    FROM
                        usuarios
                    WHERE 
                        id_usuario = ?
                `, [user_id]
            ).then((results) => {
                let user_groups = [];
                let new_user_groups;
                if (results[0].user_groups.indexOf(",") != -1) {
                    user_groups = results[0].user_groups.split(",");
                    user_groups.push(group_id);
                    new_user_groups = user_groups.join(",");
                } else {
                    new_user_groups = results[0].user_groups + "," + group_id;
                    if (results[0].user_groups.length == 0) {
                        new_user_groups = group_id;
                    }
                }

                functions.executeSql(
                    `
                        UPDATE
                            usuarios
                        SET
                            user_groups = ?
                        WHERE
                            id_usuario = ?
                    `, [new_user_groups, user_id]
                ).then((results2) => {
                    if (from_default || pending_users == "") {
                        resolve();
                    }

                    if (pending_users != "") {
                        functions.executeSql(
                            `
                                UPDATE
                                    os_groups
                                SET
                                    pending_users = ?
                                WHERE
                                    groups_id = ?
                            `, [group_id, pending_users]
                        ).then((results3) => {
                            const token = crypto.randomBytes(20).toString('hex');
                            
                            functions.executeSql(
                                `
                                    INSERT INTO
                                        group_tokens
                                        (token, group_id, email_requested, create_date)
                                    VALUES
                                        (?, ?, ?, CURRENT_TIMESTAMP())
                                `, [token, group_id, pending_users]
                            ).then((results4) => {
                                if (!from_default) {
                                    if (self.sendGroupEmail(pending_users, group_name, group_id, token)) {
                                        resolve();
                                    }
                                    console.log("Erro no envio do email durante a criação do grupo");
                                }
                            }).catch((error4) => {
                                reject(error4);
                            })
                        }).catch((error3) => {
                            reject(error3);
                        }) 
                    } 
                }).catch((error2) => {
                    reject(error2);
                })
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
    returnGroup: function (group_id = "", group_name = "") {
        return new Promise((resolve, reject) => {
            let self = this;
            let searchParam = group_id;
            if (group_name != "") {
                searchParam = group_name;
            }
            functions.executeSql(
                `
                    SELECT
                        *
                    FROM
                        os_groups
                    WHERE   
                        groups_id = ?
                `, [searchParam]
            ).then((results) => {
                if (results.length == 0) {
                    reject("Nenhum grupo encontrado");
                }
                let group_members_object = [];
                self.returnGroupMembers(results[0].group_members).then((results2) => {
                    group_members_object = results2;

                    let pending_users = results[0].pending_users;
                    let pending_users_object = "";

                    if (pending_users.indexOf(",") != -1) {
                        pending_users_object = pending_users.split(",");
                    } else if (pending_users.length > 0) {
                        pending_users_object = [pending_users];
                    }

                    let group = {
                        nome: results[0].group_name,
                        group_id: group_id,
                        group_members: results[0].group_members,
                        group_members_objects: group_members_object,
                        group_owner: results[0].group_owner,
                        pending_users: pending_users_object,
                        image: results[0].image,
                        group_description: results[0].group_description
                    }
                    resolve(group);
                }).catch((error2) => {
                    reject(error2);
                })
            }).catch((error) => {
                reject(error);
            })
        })
    },
    returnGroupMembers: function (group_members) {
        return new Promise((resolve, reject) => {
            let group_members_array = group_members.split(",");
            let group_members_object = [];
            for (let i = 0; i < group_members_array.length; i++) {
                functions.executeSql(
                    `
                        SELECT
                            *
                        FROM
                            usuarios
                        WHERE
                            id_usuario = ?
                    `, [group_members_array[i]]
                ).then((results) => {
                    let user = {
                        email: results[0].email,
                        nome: results[0].nome,
                        id_usuario: results[0].id_usuario,
                        profile_photo: results[0].profile_photo,
                        user_groups: results[0].user_groups
                    }
                    group_members_object.push(user);
                    if (i == group_members_array.length - 1) {
                        resolve(group_members_object);
                    }
                }).catch((error) => {
                    reject(error);
                })
            }
        })
    },
    removeGroupPendingUser: function (group_id, email_requested) {
        return new Promise((resolve, reject) => {
            functions.executeSql(
                `
                    SELECT
                        pending_users
                    FROM
                        os_groups
                    WHERE
                        groups_id = ?
                `, [group_id]
            ).then((results) => {
                let pending_users = results[0].pending_users;
                let pending_users_object = [];
                if (pending_users == "") {
                    resolve(false);
                }
                if (pending_users.indexOf(",") != -1) {
                    pending_users_object = pending_users.split(",");
                } else {
                    pending_users_object = [pending_users];
                }

                pending_users_object = pending_users_object.filter(function (user) { return user != email_requested });

                if (pending_users_object.length == 0) {
                    pending_users_object = "";
                }
                if (pending_users_object.length == 1) {
                    pending_users_object = pending_users_object.join();
                }
                if (pending_users_object.length > 1) {
                    pending_users_object = pending_users_object.join(",");
                }

                functions.executeSql(
                    `
                        UPDATE
                            os_groups
                        SET
                            pending_users = ?
                        WHERE
                            groups_id = ?
                    `, [pending_users_object, group_id]
                ).then((results2) => {
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
                }).catch((error2) => {
                    reject(error2);
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
                let message = "Email de solicitação enviado";
                functions.executeSql(
                    `
                        SELECT
                            pending_users
                        FROM
                            os_groups
                        WHERE
                            groups_id = ?
                    `, [group_id]
                ).then((results2) => {
                    if (results2[0].pending_users.indexOf(user_email) != -1) {
                        message = "Esse email já possui um convite para participar do grupo";
                    }

                    let new_pending_users;
                    if (results2[0].pending_users == "") {
                        new_pending_users = user_email;
                    } else {
                        new_pending_users = results2[0].pending_users + ", " + user_email;
                    }

                    functions.executeSql(
                        `
                            UPDATE
                                os_groups
                            SET
                                pending_users = ?
                            WHERE
                                groups_id = ?
                        `, [new_pending_users, group_id]
                    ).then((results3) => {
                        if (self.sendGroupEmail(user_email, group_name, group_id, token)) {
                            resolve(message);
                        } else {
                            reject("Falha no envio do email");
                        }
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
    excludeUser: function (group_id, user_id) {
        return new Promise((resolve, reject) => {
            functions.executeSql(
                `
                    SELECT
                        group_members
                    FROM
                        os_groups
                    WHERE
                        groups_id = ?
                `, [group_id]
            ).then((results) => {
                let group_members = results[0].group_members;
                let group_members_array;

                if (group_members.indexOf(",") != -1) {
                    group_members_array = group_members.split(",");
                } else {
                    reject("Você não pode sair de um grupo em que você é o único participante.");
                }

                group_members_array.splice(group_members_array.findIndex(obj => obj == user_id), 1);
                let newGroupMembers = group_members_array.join(",");

                functions.executeSql(
                    `
                        UPDATE
                            os_groups
                        SET
                            group_members = ?
                        WHERE
                            groups_id = ?
                    `, [newGroupMembers, group_id]
                ).then((results2) => {
                    functions.executeSql(
                        `
                            SELECT 
                                user_groups
                            FROM
                                usuarios
                            WHERE
                                id_usuario = ?
                        `, [user_id]
                    ).then((results3) => {
                        let user_groups = results3[0].user_groups, new_user_groups;
                        new_user_groups = user_groups.split(",");

                        new_user_groups.splice(new_user_groups.findIndex(obj => obj == group_id), 1);

                        new_user_groups = new_user_groups.join(",");

                        functions.executeSql(
                            `
                                UPDATE
                                    usuarios
                                SET
                                    user_groups = ?
                                WHERE 
                                    id_usuario = ?
                            `, [new_user_groups, user_id]
                        ).then((results4) => {
                            resolve("Usuário " + user_id + " removido com sucesso do grupo " + group_id);
                        }).catch((error4) => {
                            reject(error4);
                        }) 
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
    enterGroupWithToken: function (token, group_id, email_requested, user_id) {
        return new Promise((resolve, reject) => {
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
                                *
                            FROM
                                os_groups
                            WHERE
                                groups_id = ?
                        `, [group_id]
                    ).then((results2) => {
                        if (results2[0] == undefined) {
                            reject("Grupo não encontrado!");
                        }

                        let group_members, pending_users;
                        group_members = results2[0].group_members;
                        pending_users = results2[0].pending_users;

                        if (pending_users.indexOf(",") != -1) {
                            pending_users = pending_users.split(",");
                            pending_users.forEach((item, index, array) => {
                                if (array[index] == email_requested) {
                                    pending_users.splice(array[index], 1);
                                }
                            })
                            pending_users.join(",");
                        } else {
                            if (pending_users.indexOf(email_requested) != -1) {
                                pending_users = "";
                            }
                        }
                        group_members += "," + user_id;

                        let user_groups;
                        functions.executeSql(
                            `
                                UPDATE
                                    os_groups
                                SET
                                    group_members = ?, pending_users = ?
                                WHERE
                                    groups_id = ?
                            `, [group_members, pending_users, group_id]
                        ).then((results3) => {
                            functions.executeSql(
                                `
                                    SELECT
                                        user_groups
                                    FROM
                                        usuarios
                                    WHERE
                                        id_usuario = ?
                                `, [user_id]
                            ).then((results4) => {
                                user_groups = results4[0].user_groups;
                                user_groups += "," + group_id;

                                functions.executeSql(
                                    `
                                        UPDATE
                                            usuarios
                                        SET
                                            user_groups = ?
                                        WHERE
                                            id_usuario = ?
                                    `, [user_groups, user_id]
                                ).then((results5) => {
                                    resolve(`Usuário ${user_id} inserido no grupo ${group_id}, e grupo ${group_id} adicionado ao usuário ${user_id}`);
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
                    SELECT
                        group_members
                    FROM
                        os_groups
                    WHERE
                        groups_id = ?
                `, [group_id]
            ).then((results) => {
                let group_members = results[0].group_members, new_group_members;
                let excludePromises = [];

                if (group_members.indexOf(",") != -1) {
                    new_group_members = group_members.split(",");
                    for (let i = 0; i < new_group_members.length; i++) {
                        excludePromises.push(this.excludeUser(group_id, new_group_members[i]));
                    }
                } else {
                    new_group_members = group_members;
                    excludePromises.push(this.excludeUser(group_id, new_group_members));
                }

                excludePromises.push(this.excludeUser(group_id, 1));
                excludePromises.push(this.excludeUser(group_id, 2)); //Remover usuarios default

                Promise.all(excludePromises).then(() => {
                    return functions.executeSql(
                        `
                            DELETE FROM
                                os_groups
                            WHERE
                                groups_id = ?
                        `, [group_id]
                    )
                }).then(() => {
                    resolve("Grupo excluído com sucesso!");
                }).catch((error2) => {
                    reject(error2);
                })

                
            }).catch((error) => {
                reject(error);
            })
        })
    }
}

module.exports = taskService;