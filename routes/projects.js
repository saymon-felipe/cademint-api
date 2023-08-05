const express = require('express');
const router = express.Router();
const mysql = require("../mysql").pool;
const login = require("../middleware/login");
const crypto = require('crypto');
const uploadConfig = require('../config/upload');
const _projectsService = require("../services/projectsService");

function removeGroupFromDefaultMembers(conn, res, group_id) {
    excludeGroupFromUsers(conn, res, 1, group_id);
    excludeGroupFromUsers(conn, res, 2, group_id);
}

router.get("/", (req, res, next) => {
    let response = {
        message: "Retorno de todos os grupos cadastrados",
        returnObj: {},
        request: {
            type: "GET",
            status: 200
        }
    }

    _projectsService.returnAllGroups().then((results) => {
        if (results.length == 0) {
            response.message = "Nenhum grupo cadastrado";
        }

        response.returnObj = results;
    }).catch((error) => {
        return res.status(500).send(error);
    })
});

router.post("/", (req, res, next) => {
    let group_members = "1,2," + req.body.id_usuario;
    _projectsService.createGroup(req.body.group_name, group_members, req.body.id_usuario, req.body.pending_users).then((results) => {
        let response = {
            message: "Grupo criado com sucesso",
            returnObj: results,
            request: {
                type: "POST",
                status: 200
            }
        }
        return res.status(200).send(response);
    }).catch((error) => {
        return res.status(500).send(error);
    })
});

router.patch("/edit_group", login, (req, res, next) => {
    _projectsService.checkIfGroupOwner(req.usuario.id_usuario, req.body.group_id).then().catch(() => {
        return res.status(401).send({ error: "Você não é administrador desse grupo" });
    })

    let newGroupInformations = {
        group_id: req.body.group_id,
        group_name: req.body.group_name,
        group_description: req.body.group_description
    }

    _projectsService.editGroupInformations(newGroupInformations).then((results) => {
        let response = {
            message: "Grupo alterado com sucesso",
            returnObj: {},
            request: {
                type: "PATCH",
                status: 200
            }
        }
        return res.status(200).send(response);
    }).catch((error) => {
        return res.status(500).send(error);
    })
})

router.patch("/group_image/:group_id", login, uploadConfig.upload.single('user_imagem'), (req, res, next) => {
    if (req.file == undefined) {
        return res.status(500).send({ error: "Tipo de arquivo não suportado" });
    }

    _projectsService.checkIfGroupOwner(req.usuario.id_usuario, req.params.group_id).then().catch(() => {
        return res.status(401).send({ error: "Você não é administrador desse grupo" });
    })

    _projectsService.changeGroupImage(req.file.transforms[0].location, req.params.group_id).then((results) => {
        let response = {
            message: "Imagem do grupo alterada com sucesso",
            returnObj: {},
            request: {
                type: "PATCH",
                status: 200
            }
        }
        return res.status(200).send(response);
    }).catch((error) => {
        return res.status(500).send(error);
    })
});

router.patch("/exclude_group_image", login, (req, res, next) => {
    _projectsService.checkIfGroupOwner(req.usuario.id_usuario, req.body.group_id).then().catch(() => {
        return res.status(401).send({ error: "Você não é administrador desse grupo" });
    })

    _projectsService.excludeGroupImage(req.body.group_id).then((results) => {
        let response = {
            message: "Imagem do grupo excluída com sucesso",
            returnObj: {},
            request: {
                type: "PATCH",
                status: 200
            }
        }
        return res.status(200).send(response);
    }).catch((error) => {
        return res.status(500).send(error);
    })
});

router.post("/check_permission", login, (req, res, next) => {
    let response = {
        message: "Permissão concedida",
        returnObj: {},
        request: {
            type: "POST",
            status: 200
        }
    }

    _projectsService.checkIfGroupOwner(req.usuario.id_usuario, req.body.group_id).then(() => {
        return res.status(200).send(response);
    }).catch((error) => {
        response.message = error || "Permissão negada";
        response.request.status = 401;
        return res.status(401).send(response);
    })
});

router.post("/return_group", (req, res, next) => {
    _projectsService.returnGroup(req.body.group_id).then((results) => {
        let response = {
            message: "Retorno do grupo " + req.body.group_id,
            returnObj: results,
            request: {
                type: "POST",
                status: 200
            }
        }
        return res.status(200).send(response);
    }).catch((error) => {
        console.log(error)
        return res.status(500).send(error);
    })
});

router.post("/remove_invitation", login, (req, res, next) => {
    mysql.getConnection((error, conn) => {
        if (error) { return res.status(500).send(error) };
        conn.query('select group_owner from os_groups where groups_id = ?',
        [req.body.group_id],
            (err, results) => {
                if (err) { return res.status(500).send({ error: err }) };
                if (req.usuario.id_usuario != results[0].group_owner) {
                    const error = {
                        message: "Você não é o dono desse grupo"
                    }
                    return res.status(401).send(error);
                } else {
                    conn.query('select pending_users from os_groups where groups_id = ?',
                    [req.body.group_id],
                        (err, results) => {
                            if (err) { return res.status(500).send({ error: err }) };
                            let pending_users = results[0].pending_users;
                            let pending_users_object = [];
                            if (pending_users == "") {
                                return res.status(204).send({ message: "Não existem convites pendentes para esse grupo" });
                            }
                            if (pending_users.indexOf(",") != -1) {
                                pending_users_object = pending_users.split(",");
                            } else {
                                pending_users_object = [pending_users];
                            }
                            pending_users_object = pending_users_object.filter(function (user) { return user != req.body.email });
                            if (pending_users_object.length == 0) {
                                pending_users_object = "";
                            }
                            if (pending_users_object.length == 1) {
                                pending_users_object = pending_users_object.join();
                            }
                            if (pending_users_object.length > 1) {
                                pending_users_object = pending_users_object.join(",");
                            }
                            conn.query('update os_groups set pending_users = ? where groups_id = ?',
                            [pending_users_object, req.body.group_id],
                                (err2, results2) => {
                                    if (err2) { return res.status(500).send({ error: err2 }) };
                                    conn.query('delete from group_tokens where email_requested = ? and group_id = ?',
                                    [req.body.email, req.body.group_id],
                                        (err3, results3) => {
                                            if (err3) { return res.status(500).send({ error: err3 }) };
                                            conn.release();
                                            console.log(results3)
                                            if (results3.affectedRows != 0) {
                                                const response = {
                                                    message: "Solicitação excluida com sucesso!"
                                                }
                                                return res.status(200).send(response);
                                            } else {
                                                return res.status(404).send({ error: "Esse grupo não possui nenhuma solicitação para o email informado" });
                                            }
                                        }
                                    )
                                }
                            )
                        }
                    )
                }
            }
        )
    });
});

router.post("/return_group_by_name", (req, res, next) => {
    mysql.getConnection((error, conn) => {
        if (error) { return res.status(500).send(error) }
        conn.query('select * from os_groups where group_name = ?',
        [req.body.group_name], 
            (error, results) => {
                conn.release();
                if (error) { return res.status(500).send(error) }
                if (results.length > 0) {
                    const response = {
                        mensagem: "Retorno do grupo " + req.body.group_id,
                        nome: results[0].group_name,
                        group_id: results[0].groups_id,
                        group_members: results[0].group_members,
                        group_owner: results[0].group_owner,
                        pending_users: results[0].pending_users
                    }
                    return res.status(200).send({ response });
                } else {
                    return res.status(404).send({ mensagem: "Nenhum grupo com esse id" });
                }
            }
        )
    });
});

router.post("/request_user_to_group", login, (req, res, next) => {
    const token = crypto.randomBytes(20).toString('hex');
    mysql.getConnection((error, conn) => {
        if (error) { return res.status(500).send({error: error})};
        conn.query('insert into group_tokens(token, group_id, email_requested, create_date) values (?, ?, ?, CURRENT_TIMESTAMP())',
            [token, req.body.group_id, req.body.user_email], 
            (err, results) => {
                if (err) { return res.status(500).send({ error: err })};
                const response = {
                    mensagem: {
                        message_email: `Email de solicitação enviado`,
                        message_token: "Token inserido com sucesso! Validade de 7 dias"
                    },
                    pending_group_id: req.body.group_id
                }
                conn.query('select pending_users from os_groups where groups_id = ?',
                [req.body.group_id],
                    (err2, results2) => {
                        if (err2) { return res.status(500).send({ error: err2 })};
                        if (results2[0].pending_users.indexOf(req.body.user_email) != -1) {
                            return res.status(409).send({ message: "Esse email já possui um convite para participar do grupo." });
                        }
                        let new_pending_users;
                        if (results2[0].pending_users == "") {
                            new_pending_users = req.body.user_email;
                        } else {
                            new_pending_users = results2[0].pending_users + ", " + req.body.user_email;
                        }
                        conn.query('update os_groups set pending_users = ? where groups_id = ?',
                        [new_pending_users, req.body.group_id],
                            (err3, results3) => {
                                if (err3) { return res.status(401).send({ error: err3 })};
                                conn.release();
                                if (_projectsService.sendGroupEmail(req.body.user_email, req.body.group_name, req.body.group_id, token)) {
                                    return res.status(200).send({ response });
                                } else {
                                    return res.status(500).send({error: "Falha no envio do email"});
                                }
                            }    
                        )
                    }    
                )
            }
        )
    }); 
});

router.post("/exclude_user", login, (req, res, next) => {
    let group_id = req.body.group_id;
    let user_id = req.body.id_usuario == null ? req.usuario.id_usuario : req.body.id_usuario;
    let newGroupMembers;
    mysql.getConnection((error, conn) => {
        if (error) { return res.status(500).send({error: error})};
        conn.query('select group_members from os_groups where groups_id = ?',
        [group_id], 
            (err2, results2) => {
                if (err2) { return res.status(500).send({ error: err2 }) };
                let group_members = results2[0].group_members;
                let group_members_array;
                if (group_members.indexOf(",") != -1) {
                    group_members_array = group_members.split(",");
                } else {
                    return res.status(401).send({ response: "Você não pode sair de um grupo em que você é o único participante!" });
                }
                group_members_array.splice(group_members_array.findIndex(obj => obj == user_id), 1);
                newGroupMembers = group_members_array.join(",");
                conn.query('update os_groups set group_members = ? where groups_id = ?',
                [newGroupMembers, group_id],
                (err3, results3) => {
                    if (err3) { return res.status(500).send({ error: err3 }) };
                    conn.query('select user_groups from usuarios where id_usuario = ?',
                    [user_id],
                        (err4, results4) => {
                            if (err4) { return res.status(500).send({ error: err4 }) };

                            let user_groups = results4[0].user_groups, new_user_groups;
                            new_user_groups = user_groups.split(",");
                            new_user_groups.splice(new_user_groups.findIndex(obj => obj == group_id), 1);
                            new_user_groups = new_user_groups.join(",");
                            conn.query('update usuarios set user_groups = ? where id_usuario = ?',
                            [new_user_groups, user_id],
                                (err5, results5) => {
                                    if (err5) { return res.status(500).send({ error: err5 }) };
                                    conn.release();
                                    const response = {
                                        message: `Usuário ${user_id} removido com sucesso do grupo ${group_id}`
                                    }
                                    return res.status(200).send(response);
                                }   
                            )
                        }
                    )
                })
            }
        )
    });
});

router.post("/enter_group_with_token", (req, res, next) => {
    let user_id = req.body.user_id;
    let group_id = req.body.group_id;
    let email_requested = req.body.email_requested;
    let token = req.body.token;

    mysql.getConnection((error, conn) => {
        if (error) { return res.status(500).send({error: error})};
        conn.query('select * from group_tokens where token = ? and group_id = ? and email_requested = ?',
            [token, group_id, email_requested], 
            (err, results) => {
                if (err) { return res.status(500).send({ error: err }) }
                if (results.length != 0) {
                    let group_members, pending_users;
                    conn.query('select * from os_groups where groups_id = ?',
                    [group_id], 
                        (err2, results2) => {
                            if (err2) { return res.status(500).send({ error: err2 }) };
                            if (results2[0] == undefined) {
                                return res.status(404).send({ message: "Grupo não encontrado!" });
                            }
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
                            conn.query('update os_groups set group_members = ?, pending_users = ? where groups_id = ?',
                            [group_members, pending_users, group_id],
                            (err3, results3) => {
                                if (err3) { return res.status(500).send({ error: err3 }) };
                                conn.query('select user_groups from usuarios where id_usuario = ?',
                                [user_id],
                                (err4, results4) => {
                                    if (err4) { return res.status(500).send({ error: err4 }) };
                                    user_groups = results4[0].user_groups;
                                    user_groups += "," + group_id;
                                    conn.query('update usuarios set user_groups = ? where id_usuario = ?',
                                    [user_groups, user_id],
                                    (err5, results5) => {
                                        if (err5) { return res.status(500).send({ error: err5 }) };
                                        conn.release();
                                        const response = {
                                            mensagem: `Usuário ${user_id} inserido no grupo ${group_id}, e grupo ${group_id} adicionado ao usuário ${user_id}` 
                                        }
                                        return res.status(200).send({ response });
                                    })
                                })
                            })
                        }
                    )
                } else {
                    return res.status(400).send({ error: "Token, id do grupo e email inválidos!"});
                }
            }
        )
    });
});

function excludeGroupFromUsers(conn, res, user_id, group_id) {
    conn.query('select * from usuarios where id_usuario = ?',
    [user_id], 
        (err, results) => {
            if (err) { return res.status(500).send({ error: err }) };
            if (results[0] != undefined) {
                let user_groups = [];
                if (results[0].user_groups.indexOf(",") != -1) {
                    user_groups = results[0].user_groups.split(",");
                } 
                user_groups.splice(user_groups.indexOf(group_id), 1);
                let new_user_groups;
                for (let i in user_groups) {
                    if (i > 0) {
                        new_user_groups += "," + user_groups[i];
                    } else { 
                        new_user_groups = user_groups[i];
                    }
                }
                conn.query('update usuarios set user_groups = ? where id_usuario = ?',
                [new_user_groups, user_id], 
                    (err2, results2) => { 
                        if (err2) { return res.status(500).send({ error: err2 }) };
                        return true;
                    }
                )
            } else {
                return res.status(404).send({ error: "Nenhum usuário com esse id" });
            }
        }
    )
}

router.delete('/delete_group', login, (req, res, next) => {
    mysql.getConnection((error, conn) => {
        if (error) { return res.status(500).send(error) };
        conn.query(
            'select group_members from os_groups where groups_id = ?',
            [req.body.groups_id],
            (err, results) => {
                if (err) { return res.status(500).send({ error: err }) };
                let group_members = results[0].group_members, new_group_members;
                
                if (group_members.indexOf(",") != -1) {
                    new_group_members = group_members.split(",");
                    for (let i = 0; i < new_group_members.length; i++) {
                        excludeGroupFromUsers(conn, res, new_group_members[i], req.body.groups_id);
                    }
                } else {
                    new_group_members = group_members;
                    excludeGroupFromUsers(conn, res, new_group_members, req.body.groups_id);
                }
                removeGroupFromDefaultMembers(conn, res, req.body.groups_id);
                conn.query(
                    'delete from os_groups where groups_id = ?',
                    [req.body.groups_id],
                    (err2, results2) => {
                        conn.release();
                        if (err2) { return res.status(500).send({ error: err2 }) }
                        const response = {
                            feedback: "Grupo removido com sucesso!"
                        }
                        return res.status(202).send(response);
                    }
                );
            }
        );
        
    });
});

module.exports = router;