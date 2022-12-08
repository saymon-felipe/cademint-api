const express = require('express');
const router = express.Router();
const mysql = require("../mysql").pool;
const login = require("../middleware/login");
const email = require('../config/email');
const crypto = require('crypto');
const uploadConfig = require('../config/upload');

async function sendGroupEmail(user_email, group_name, group_id, token) {
    const mailSent = await email.sendMail({
        html: createEmailInviteUserToGroup(group_name, group_id, token, user_email),
        subject: `Você foi convidado para entrar em ${group_name} na plataforma Cademint!`,
        from: "Ana da Cademint <ana.cademint@gmail.com>",
        to: [user_email]
    }).then(message => {
        console.log(message)
        return true;
    }).catch(err => {
        console.log(err);
        return false;
    })
}

function generateGroupLink(group_id, group_name, token, user_email) {
    let temporaryLink = `gid=${group_id}&gname=${group_name}&tk=${token}&email=${user_email}`
    return temporaryLink;
}

function createEmailInviteUserToGroup(group_name, group_id, token, user_email) {
    let email = `
    <div style="width: 100%; height: 100%; font-family: Arial, Helvetica, sans-serif;">
        <p>Oi tudo bem? Meu nome é Ana Clara, assistente virtual da <strong>Cademint</strong>.</p>
        <p>Fiquei sabendo que você recebeu uma solicitação para fazer parte do grupo <i>${group_name}</i></p>
        <p>Para entrar no grupo e criar uma conta caso você ainda não seja cadastrado em nossa plataforma, clique no botão abaixo!</p>
        
        <br>
        <a href="${process.env.URL_SITE}/enter-group?${generateGroupLink(group_id, group_name, token, user_email)}" style="text-decoration: none; color: rgb(0, 162, 232); font-weight: 600; font-size: 20px; background: #FFCA37; padding: 10px 15px; border-radius: 10px;">
            ENTRAR NO GRUPO
        </a>
        <br>
        <br>
        <a href="${process.env.URL_SITE}" target="_blank">
            <img src="https://lh3.googleusercontent.com/nSELc2XaAc7vhthJSOiS-JPx2iH_PSDocmJhncmQycotrygh1y_i1dRk-nEU1_bG6I1OZvxWjcNvhPaN=w616-h220-rw" style="width: 400px;">
        </a>
        <hr>
        <h6>
            Este é um email automático enviado por ana.cademint@gmail.com, não responda.
            Caso queira enviar um email para nós <a href="mailto:contato.scrumcademint@gmail.com">clique aqui</a>.
        </h6>
    </div>
    `
    return email;
}

router.get("/", (req, res, next) => {
    mysql.getConnection((error, conn) => {
        if (error) { return res.status(500).send({ error: error }) }
        conn.query('select * from os_groups', 
            (error, results) => {
                conn.release();
                if (error) { return res.status(500).send({ error: error }) }
                if (results.length > 0) {
                    const response = {
                        mensagem: "Retorno de todos os grupos",
                        lista_de_grupos: results.map(groups => {
                            return {
                                group_id: groups.groups_id,
                                group_members: groups.group_members,
                                group_name: groups.group_name,
                                group_owner: groups.group_owner,
                                pending_users: groups.pending_users
                            }
                        })
                        
                    }
                    return res.status(200).send({ response });
                } else {
                    return res.status(404).send({ mensagem: "Nenhum grupo cadastrado" });
                }
            }
        )
    });
});

function insertGroupInDefaultMembers(group_id) {
    return new Promise((resolve, reject) => {
        mysql.getConnection((error, conn) => {
            if (error) { console.log(error) };
            for (let i = 1; i <= 2; i++) {
                conn.query(`
                    SELECT 
                        user_groups
                    FROM 
                        usuarios
                    WHERE 
                        id_usuario = ?
                `, [i],
                    (err, results) => {
                        if (err) {
                            reject()
                        } else {
                            let currentUser = results[0];
                            let newUserGroups = currentUser + "," + group_id;
                            conn.query(`
                                UPDATE
                                    usuarios
                                SET
                                    user_groups = ?
                                WHERE
                                    id_usuario = ?
                            `, [newUserGroups, i],
                                (err2, results2) => {
                                    conn.release();
                                    if (err2) { 
                                        reject();
                                    } else {
                                        resolve();
                                    }
                                }
                            )
                        }
                    }
                )
            }
        })
    })
}

function removeGroupFromDefaultMembers(conn, res, group_id) {
    excludeGroupFromUsers(conn, res, 1, group_id);
    excludeGroupFromUsers(conn, res, 2, group_id);
}

function addGroupToDefaultMembers(conn, res, req, group_id) {
    addGroupToMember(conn, res, req, 1, group_id, true, false);
    addGroupToMember(conn, res, req, 2, group_id, true, true);
}

function addGroupToMember(conn, res, req, user_id, group_id, from_default = false, releaseConn = false) {
    conn.query('select user_groups from usuarios where id_usuario = ?',
        [user_id],
            (err, results) => {
                if (err) { return res.status(500).send({ error: err }) };
                let user_groups = [], new_user_groups;
                if (results[0].user_groups.indexOf(",") != -1) {
                    user_groups = results[0].user_groups.split(",");
                    user_groups.push(group_id);
                    new_user_groups = user_groups.join(",");
                } else {
                    if (results[0].user_groups.length != 0) {
                        new_user_groups = results[0].user_groups + "," + group_id;
                    } else {
                        new_user_groups = group_id;
                    }
                }

                conn.query('update usuarios set user_groups = ? where id_usuario = ?',
                [new_user_groups, user_id],
                    (err2, results2) => {
                        if (err2) { return res.status(500).send({ error: err2 }) };
                        const response = {
                            mensagem: "Novo grupo criado",
                            grupo_criado: {
                                groups_id: group_id,
                                group_name: req.body.group_name,
                                group_members: req.body.id_usuario,
                                group_owner: req.body.id_usuario,
                                pending_users: req.body.pending_users
                            }      
                        }
                        if (req.body.pending_users != "") {
                            conn.query('update os_groups set pending_users = ? where groups_id = ?',
                            [req.body.pending_users, group_id],
                                (err3, results3) => {
                                    if (err3) { return res.status(500).send({ error: err3 }) };
                                    const token = crypto.randomBytes(20).toString('hex');
                                    conn.query('insert into group_tokens(token, group_id, email_requested, create_date) values (?, ?, ?, CURRENT_TIMESTAMP())',
                                    [token, group_id, req.body.pending_users], 
                                        (err4, results4) => {
                                            if (err4) { return res.status(500).send({ error: err4 })};
                                            if (!from_default) {
                                                if (sendGroupEmail(req.body.pending_users, req.body.group_name, group_id, token)) {
                                                    return res.status(201).send(response);
                                                } else {
                                                    console.log("Erro no envio do email durante a criação do grupo");
                                                }
                                            }
                                        }
                                    )
                                }
                            )
                        } else {
                            if (!from_default && releaseConn || (from_default && releaseConn)) {
                                conn.release();
                                return res.status(201).send(response);
                            }
                        }
                    }
                )
            }
        )
}

router.post("/", (req, res, next) => {
    mysql.getConnection((error, conn) => {
        if (error) { return res.status(500).send({ error: error }) };
        let group_members = "1,2," + req.body.id_usuario;
        conn.query(`insert into os_groups (group_name, group_members, group_owner, image) values (?, ?, ?, ?)`, 
            [req.body.group_name, group_members, req.body.id_usuario, process.env.URL_API + '/public/cademint-group.png'],
            (err, results) => {
                if (err) { return res.status(500).send({ error: err }) };

                addGroupToMember(conn, res, req, req.body.id_usuario, results.insertId, false, false);
                addGroupToDefaultMembers(conn, res, req, results.insertId);
            }
        )
    });
});

router.patch("/group_description", login, (req, res, next) => {
    mysql.getConnection((error, conn) => {
        if (error) { return res.status(500).send({ error: error }) };
        conn.query('select group_owner from os_groups where groups_id = ?',
        [req.body.group_id],
            (err, results) => {
                if (err) { return res.status(500).send({ error: err }) };
                if (req.usuario.id_usuario != results[0].group_owner) {
                    conn.release();
                    const error = {
                        message: "Você não é o dono desse grupo"
                    }
                    return res.status(401).send(error);
                } else {
                    conn.query('update os_groups set group_description = ? where groups_id = ?',
                    [req.body.group_description, req.body.group_id],
                        (err2, results2) => {
                            if (err2) { return res.status(500).send({ error: err2 }) };
                            conn.release();
                            const response = {
                                message: "A descrição do grupo " + req.body.group_id + " foi alterada com sucesso!"
                            }
                            return res.status(200).send(response);
                        }
                    )
                }
            }
        )
    });
});

router.patch("/group_image/:group_id", login, uploadConfig.upload.single('user_imagem'), (req, res, next) => {
    if (req.file == undefined) {
        return res.status(500).send({ error: "Tipo de arquivo não suportado" });
    }
    mysql.getConnection((error, conn) => {
        if (error) { return res.status(500).send({ error: error }) };
        conn.query('select group_owner from os_groups where groups_id = ?',
        [req.params.group_id],
            (err, results) => {
                if (err) { return res.status(500).send({ error: err }) };
                if (req.usuario.id_usuario != results[0].group_owner) {
                    conn.release();
                    const error = {
                        message: "Você não é o dono desse grupo"
                    }
                    return res.status(401).send(error);
                } else {
                    conn.query('update os_groups set image = ? where groups_id = ?',
                    [req.file.transforms[0].location, req.params.group_id], 
                        (err2, results2) => {
                            conn.release();
                            if (err2) { return res.status(500).send({ error: err2 }) };
                            if (results.changedRows != 0) {
                                const response = {
                                    message: "Imagem do grupo " + req.params.group_id + " alterada com sucesso!",
                                    group_image_path: req.file.transforms[0].location
                                }
                                return res.status(200).send(response);
                            }
                            return res.status(404).send({ mensagem: "Nenhum grupo com esse id" });
                        }
                    )
                }
            }
        ) 
    });
});

router.patch("/exclude_group_image", login, (req, res, next) => {
    mysql.getConnection((error, conn) => {
        if (error) { return res.status(500).send({ error: error }) };
        conn.query('select group_owner from os_groups where groups_id = ?',
        [req.body.group_id],
            (err, results) => {
                if (err) { return res.status(500).send({ error: err }) };
                if (req.usuario.id_usuario != results[0].group_owner) {
                    conn.release();
                    const error = {
                        message: "Você não é o dono desse grupo"
                    }
                    return res.status(401).send(error);
                } else {
                    conn.query('SELECT image FROM os_groups WHERE groups_id = ?',
                    [req.body.group_id],
                        (err2, results2) => {
                            if (err2) { return res.status(500).send({ error: err2 }) };
                            let photo_url = results2[0].image.split("/")[3];
                            uploadConfig.deleteFromS3(photo_url);

                            conn.query('update os_groups set image = ? where groups_id = ?',
                            [process.env.URL_API + "/public/cademint-group.png", req.body.group_id], 
                                (err3, results3) => {
                                    conn.release();
                                    if (err3) { return res.status(500).send({ error: err3 }) };
                                    if (results3.changedRows != 0) {
                                        const response = {
                                            group_id: "Retorno do grupo " + req.body.group_id,
                                            action: "Imagem excluída com sucesso"
                                        }
                                        return res.status(200).send({ response });
                                    }
                                    return res.status(304).send({ mensagem: "Nenhuma alteração feita" });
                                }
                            )
                        }
                    );
                }
            }
        )
    });
});

router.patch("/group_name", login, (req, res, next) => {
    mysql.getConnection((error, conn) => {
        if (error) { return res.status(500).send({ error: error }) };
        conn.query('select group_owner from os_groups where groups_id = ?',
        [req.body.group_id],
            (err, results) => {
                if (err) { return res.status(500).send({ error: err }) };
                if (req.usuario.id_usuario != results[0].group_owner) {
                    conn.release();
                    const error = {
                        message: "Você não é o dono desse grupo"
                    }
                    return res.status(401).send(error);
                } else {
                    conn.query('update os_groups set group_name = ? where groups_id = ?',
                    [req.body.group_name, req.body.group_id],
                        (err2, results2) => {
                            if (err2) { return res.status(500).send({ error: err2 }) };
                            conn.release();
                            const response = {
                                message: "O nome do grupo " + req.body.group_id + " foi alterado com sucesso!"
                            }
                            return res.status(200).send(response);
                        }
                    )
                }
            }
        )
    });
});

router.post("/check_permission", login, (req, res, next) => {
    mysql.getConnection((error, conn) => {
        if (error) { return res.status(500).send({ error: error }) };
        conn.query('select group_owner from os_groups where groups_id = ?',
        [req.body.group_id],
            (err, results) => {
                if (err) { return res.status(500).send({ error: err }) };
                if (req.usuario.id_usuario != results[0].group_owner) {
                    conn.release();
                    const error = {
                        message: "Você não é o dono desse grupo"
                    }
                    return res.status(401).send(error);
                } else {
                    return res.status(200).send({ message: "Tudo certo!" });
                }
            }
        )
    });
});

router.post("/return_group", (req, res, next) => {
    mysql.getConnection((error, conn) => {
        if (error) { return res.status(500).send({ error: error }) };
        conn.query('select * from os_groups where groups_id = ?',
        [req.body.group_id], 
            (err, results) => {
                if (err) { return res.status(500).send({ error: err }) };
                if (results.length > 0) {
                    let group_members = results[0].group_members.split(",");
                    let group_members_objects = [];
                    for (let i in group_members) {
                        conn.query('select * from usuarios where id_usuario = ?',
                        [group_members[i]],
                            (err2, results2) => {
                                if (err2) { return res.status(500).send({ error: err2 }) };
                                group_members_objects[i] = {
                                    email: results2[0].email,
                                    nome: results2[0].nome,
                                    id_usuario: results2[0].id_usuario,
                                    profile_photo: results2[0].profile_photo,
                                    user_groups: results2[0].user_groups
                                }
                            }
                        )
                    }
                    setTimeout(() => {
                        conn.release();
                        let pending_users = results[0].pending_users;
                        let pending_users_object = "";
                        if (pending_users.indexOf(",") != -1) {
                            pending_users_object = pending_users.split(",");
                        } else if (pending_users.length > 0) {
                            pending_users_object = [pending_users];
                        }
                        const response = {
                            mensagem: "Retorno do grupo " + req.body.group_id,
                            nome: results[0].group_name,
                            group_id: req.body.group_id,
                            group_members: results[0].group_members,
                            group_members_objects: group_members_objects,
                            group_owner: results[0].group_owner,
                            pending_users: pending_users_object,
                            image: results[0].image,
                            group_description: results[0].group_description
                        }
                        return res.status(200).send({ response });
                    }, 500);
                } else {
                    return res.status(404).send({ mensagem: "Nenhum grupo com esse id" });
                }
            }
        )
    });
});

router.post("/remove_invitation", login, (req, res, next) => {
    mysql.getConnection((error, conn) => {
        if (error) { return res.status(500).send({ error: error }) };
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
        if (error) { return res.status(500).send({ error: error }) }
        conn.query('select * from os_groups where group_name = ?',
        [req.body.group_name], 
            (error, results) => {
                conn.release();
                if (error) { return res.status(500).send({ error: error }) }
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
                                if (sendGroupEmail(req.body.user_email, req.body.group_name, req.body.group_id, token)) {
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
        if (error) { return res.status(500).send({ error: error }) };
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