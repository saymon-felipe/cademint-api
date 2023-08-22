const express = require('express');
const router = express.Router();
const mysql = require("../mysql").pool;
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const login = require("../middleware/login");
const uploadConfig = require('../config/upload');
const userLevel = require('../custom/userLevel');
const crypto = require('crypto');
const email = require('../config/email');
const _userService = require("../services/userService");

async function sendResetPasswordEmail(token, user_email) {
    const mailSent = await email.sendMail({
        html: createResetPasswordEmail(token),
        subject: `Redefinição de senha`,
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

function generateResetPasswordLink(token) {
    let temporaryLink = `reset_token=${token}`;
    return temporaryLink;
}

function createResetPasswordEmail(token) {
    let email = `
    <div style="width: 100%; height: 100%; font-family: Arial, Helvetica, sans-serif;">
        <p>Oi tudo bem? Meu nome é Ana Clara, assistente virtual da <strong>Cademint</strong>.</p>
        <p>Você solicitou uma redefinição de senha em nosso sistema, para criar uma nova é só clicar no link abaixo.</p>
        <p>Lembrando que esse link tem validade de apenas 30 minutos para maior segurança da sua conta!</p>
        
        <br>
        <a href="${process.env.URL_SITE}/reset-password?${generateResetPasswordLink(token)}" style="text-decoration: none; color: rgb(0, 162, 232); font-weight: 600; font-size: 20px; background: #FFCA37; padding: 10px 15px; border-radius: 10px;">
            REDEFINIR SENHA
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

router.post("/validate_reset_password_token", (req, res, next) => {
    _userService.checkResetPasswordToken(req.body.token).then((results) => {
        let response = {
            message: results,
            returnObj: {},
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

router.patch("/change_password", (req, res, next) => {
    _userService.resetPassword(req.body.token, req.body.senha).then((results) => {
        let response = {
            message: results,
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

router.get("/", (req, res, next) => {
    _userService.returnUsers().then((results) => {
        let response = {
            message: "Retorno de todos os usuários",
            returnObj: results,
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

router.get("/return_users_occupations", login, (req, res, next) => {
    _userService.returnUserOccupations(req.usuario.id_usuario).then((results) => {
        let response = {
            message: "Retorno dos cargos do usuario",
            returnObj: results,
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

router.get("/return_user", login, (req, res, next) => {
    _userService.returnUser(req.usuario.id_usuario).then((results) => {
        let response = {
            message: "Retorno do usuário " + req.usuario.id_usuario,
            returnObj: results,
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

router.post("/return_user_by_email", (req, res, next) => {
    let response = {
        message: "Retorno de usuário",
        returnObj: {},
        request: {
            type: "POST",
            status: 200
        }
    }

    if (req.body.email == "") {
        response.message = "Erro na busca de usuário, email vazio!";
        response.request.status = 404;
        return res.status(404).send(response);
    } else {
        _userService.returnUser(null, req.body.email).then((results) => {
            if (results == "Email não cadastrado") {
                response.message = error;
                response.request.status = 404;
                return res.status(404).send(response);
            } else {
                response.returnObj = results;
                return res.status(200).send(response);
            }
        }).catch((error) => {
            return res.status(500).send(error);
        })
    }
});

router.get("/get_name", login, (req, res, next) => {
    mysql.getConnection((error, conn) => {
        if (error) { return res.status(500).send(error) }
        conn.query('select nome from usuarios where id_usuario = ?',
        [req.usuario.id_usuario], 
            (error, results) => {
                conn.release();
                if (error) { return res.status(500).send(error) }
                if (results.length > 0) {
                    const response = {
                        user_name: results.nome
                    }
                    return res.status(200).send({ response });
                } else {
                    return res.status(404).send({ mensagem: "Nenhum usuário com esse id" });
                }
            }
        )
    });
});

router.get("/checkJWT", login, (req, res, next) => {
    userLevel.setUser(req.usuario.id_usuario);
    mysql.getConnection((error, conn) => {
        if (error) { return res.status(500).send(error) }
        conn.query('select * from usuarios where id_usuario = ?',
        [req.usuario.id_usuario], 
            (error, results) => {
                conn.release();
                if (error) { return res.status(500).send(error) }
                if (results.length > 0) {
                    const response = {
                        mensagem: "Retorno de usuário " + req.usuario.id_usuario,
                        nome: results.nome
                    }
                    userLevel.add(0.0010);
                    return res.status(200).send({ response });
                } else {
                    return res.status(404).send({ mensagem: "Nenhum usuário com esse id" });
                }
            }
        )
    });
});

router.post("/find_users", (req, res, next) => {
    mysql.getConnection((error, conn) => {
        if (error) { return res.status(500).send(error) };
        conn.query(`
                    select 
                        nome,
                        id_usuario,
                        profile_photo,
                        email,
                        user_groups,
                        user_level,
                        user_occupation
                    from usuarios
                    where nome like '%${req.body.search}%'
        `,
            (err, results) => {
                if (err) { return res.status(500).send({ error: err }) };
                conn.release();
                if (results.length == 0) {
                    const fallback = {
                        message: "Nenhum usuário encontrado com os critérios informados",
                        status: "empty"
                    }
                    return res.status(202).send(fallback);
                }
                let user_groups = results[0].user_groups;
                let user_occupation = results[0].user_occupation;
                if (user_groups.indexOf(",") != -1) {
                    user_groups = user_groups.split(",");
                }
                if (user_occupation.indexOf(",") != -1) {
                    user_occupation = user_occupation.split(",");
                }
                const response = {
                    message: "Retorno de todos os usuários pelo critério solicitado",
                    lista_de_usuarios: results.map(users => {
                        return {
                            nome: users.nome,
                            id_usuario: users.id_usuario,
                            profile_photo: users.profile_photo,
                            email: users.email,
                            user_groups: user_groups,
                            user_level: user_groups.user_level,
                            user_occupation: user_occupation
                        }
                    })
                }
                return res.status(200).send(response);
            }
        )
    });
});

router.patch("/change_bio", login, (req, res, next) => {
    mysql.getConnection((error, conn) => {
        if (error) { return res.status(500).send(error) };
        if (req.body.user_bio.length < 3 || req.body.user_bio == "") {
            return res.status(401).send({ message: "Texto muito curto ou vazio" });
        }
        conn.query('update usuarios set user_bio = ? where id_usuario = ?',
        [req.body.user_bio, req.usuario.id_usuario],
            (err, results) => {
                if (err) { return res.status(500).send({ error: err }) };
                conn.release();
                const response = {
                    message: "Biografia alterada com sucesso!",
                    user_bio: req.body.user_bio
                }
                return res.status(200).send(response);
            }
        )
    });
});

router.patch("/exclude_occupation", login, (req, res, next) => {
    mysql.getConnection((error, conn) => {
        if (error) { return res.status(500).send(error) };
        conn.query("update usuarios set user_occupation = ? where id_usuario = ?",
        [req.body.user_occupation, req.usuario.id_usuario],
            (err, results) => {
                if (err) { return res.status(500).send({ error: err }) };
                conn.release();
                const response = {
                    message: "Cargo excluido com sucesso!"
                }
                return res.status(200).send(response);
            }
        )
    });
});

router.patch("/add_occupation", login, (req, res, next) => {
    if (req.body.user_occupation.length > 15 || req.body.user_occupation == "" || req.body.user_occupation < 3) {
        return res.status(401).send({ error: "Cargo inválido!" });
    }

    _userService.addOccupation(req.usuario.id_usuario, req.body.user_occupation).then((results) => {
        let response = {
            message: "Cargo adicionado com sucesso",
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

router.get("/return_user_by_jwt", login, (req, res, next) => {
    mysql.getConnection((error, conn) => {
        if (error) { return res.status(500).send(error) }
        conn.query('select * from usuarios where id_usuario = ?',
        [req.usuario.id_usuario], 
            (error, results) => {
                conn.release();
                if (error) { return res.status(500).send(error) }
                if (results.length > 0) {
                    const response = {
                        mensagem: "Retorno de usuário " + req.usuario.id_usuario,
                        user_groups: results[0].user_groups
                    }
                    return res.status(200).send({ response });
                } else {
                    return res.status(404).send({ mensagem: "Nenhum usuário com esse id" });
                }
            }
        )
    });
});

router.patch("/exclude_photo", login, (req, res, next) => {
    mysql.getConnection((error, conn) => {
        if (error) { return res.status(500).send(error) }
        conn.query('SELECT profile_photo FROM usuarios WHERE id_usuario = ?',
        [req.usuario.id_usuario],
            (err, results) => {
                if (err) { return res.status(500).send({ error: err }) };
                let photo_url = results[0].profile_photo.split("/")[3];
                uploadConfig.deleteFromS3(photo_url);

                conn.query('update usuarios set profile_photo = ? where id_usuario = ?',
                [process.env.URL_API + "/public/default-user-image.png", req.usuario.id_usuario], 
                    (err2, results2) => {
                        conn.release();
                        if (err2) { return res.status(500).send({ error: err2 }) };
                        if (results2.changedRows != 0) {
                            const response = {
                                id_usuario: "Retorno de usuário " + req.usuario.id_usuario,
                                action: "Imagem excluída com sucesso"
                            }
                            return res.status(200).send({ response });
                        } else {
                            return res.status(304).send({ mensagem: "Nenhuma alteração feita" });
                        }
                    }
                )
            }
        );
    });
});

router.patch("/exclude_banner", login, (req, res, next) => {
    mysql.getConnection((error, conn) => {
        if (error) { return res.status(500).send(error) }
        conn.query('SELECT user_cover_image FROM usuarios WHERE id_usuario = ?',
        [req.usuario.id_usuario],
            (err, results) => {
                if (err) { return res.status(500).send({ error: err }) };
                let photo_url = results[0].user_cover_image.split("/")[3];
                uploadConfig.deleteFromS3(photo_url);

                conn.query('update usuarios set user_cover_image = ? where id_usuario = ?',
                [process.env.URL_API + "/public/default-banner-image.png", req.usuario.id_usuario], 
                    (err2, results2) => {
                        conn.release();
                        if (err2) { return res.status(500).send({ error: err2 }) };
                        if (results2.changedRows != 0) {
                            const response = {
                                id_usuario: "Retorno de usuário " + req.usuario.id_usuario,
                                action: "Imagem excluída com sucesso"
                            }
                            return res.status(200).send({ response });
                        } else {
                            return res.status(304).send({ mensagem: "Nenhuma alteração feita" });
                        }
                    }
                )
            }
        );
    });
});

router.patch("/upload_photo", login, uploadConfig.upload.single('user_imagem'), (req, res, next) => {
    if (req.file == undefined) {
        return res.status(500).send({ error: "Tipo de arquivo não suportado" })
    } else {
        mysql.getConnection((error, conn) => {
            if (error) { return res.status(500).send(error) };
            conn.query('update usuarios set profile_photo = ? where id_usuario = ?',
            [req.file.transforms[0].location, req.usuario.id_usuario], 
                (error, results) => {
                    conn.release();
                    if (error) { return res.status(500).send(error) }
                    if (results.changedRows != 0) {
                        const response = {
                            id_usuario: "Retorno de usuário " + req.usuario.id_usuario,
                            profile_photo: req.file.transforms[0].location
                        }
                        return res.status(200).send(response);
                    } else {
                        return res.status(404).send({ mensagem: "Nenhum usuário com esse id" });
                    }
                }
            )
        });
    }
});

router.patch("/upload_banner", login, uploadConfig.upload.single('user_imagem'), (req, res, next) => {
    if (req.file == undefined) {
        return res.status(500).send({ error: "Tipo de arquivo não suportado" })
    } else {
        mysql.getConnection((error, conn) => {
            if (error) { return res.status(500).send(error) }
            conn.query('update usuarios set user_cover_image = ? where id_usuario = ?',
            [req.file.transforms[0].location, req.usuario.id_usuario], 
                (error, results) => {
                    conn.release();
                    if (error) { return res.status(500).send(error) }
                    if (results.changedRows != 0) {
                        const response = {
                            id_usuario: "Retorno de usuário " + req.usuario.id_usuario,
                            profile_photo: req.file.transforms[0].location
                        }
                        return res.status(200).send({ response });
                    } else {
                        return res.status(404).send({ mensagem: "Nenhum usuário com esse id" });
                    }
                }
            )
        });
    }
});

router.post("/update_name", login, (req, res, next) => {
    mysql.getConnection((error, conn) => {
        if (error) { return res.status(500).send(error) }
        conn.query('update usuarios set nome = ? where id_usuario = ?',
        [req.body.nome, req.usuario.id_usuario], 
            (error, results) => {
                conn.release();
                if (error) { return res.status(500).send(error) }
                if (results.changedRows != 0) {
                    const response = {
                        message: "Usuário alterado com sucesso",
                        id_usuario: "Retorno de usuário " + req.usuario.id_usuario,
                        nome: req.body.nome
                    }
                    return res.status(200).send({ response });
                } else {
                    return res.status(404).send({ mensagem: "Nenhum usuário com esse id" });
                }
            }
        )
    });
});

router.post("/update_groups", (req, res, next) => {
    mysql.getConnection((error, conn) => {
        if (error) { return res.status(500).send(error) };
        conn.query('select user_groups from usuarios where id_usuario = ?',
        [req.body.id],
            (err2, results2) => {
                if (err2) { return res.status(500).send({ error: err2 }) };
                let current_user_groups = results2[0].user_groups, new_user_groups = [];
                if (current_user_groups == req.body.user_groups) {
                    new_user_groups = req.body.user_groups;
                } else {
                    if (current_user_groups == "") {
                        new_user_groups = req.body.user_groups;
                    } else {
                        if (current_user_groups.indexOf(",") != -1) {
                            new_user_groups = current_user_groups.split(",");
                            new_user_groups.push(req.body.user_groups);
                            new_user_groups = new_user_groups.join();
                        } else {
                            new_user_groups = current_user_groups + "," + req.body.user_groups;
                        }
                    }
                }
                conn.query('update usuarios set user_groups = ? where id_usuario = ?',
                [new_user_groups, req.body.id], 
                    (err, results) => {
                        conn.release();
                        if (err) { return res.status(500).send({ error: err }) };
                        if (results.changedRows != 0) {
                            const response = {
                                grupos_adicionados: "Grupo adicionado ao usuário: " + req.body.user_groups
                            }
                            return res.status(200).send({ response });
                        } else {
                            return res.status(404).send({ mensagem: "Nenhum usuário com esse id" });
                        }
                    }
                )
            }
        )
    });
});

router.post("/forgot_password", (req, res, next) => {
    try {
        mysql.getConnection((error, conn) => {
            if (error) { return res.status(500).send(error) };
            conn.query('select id_usuario from usuarios where email = ?',
            [req.body.email],
                (err, results) => {
                    if (err) { return res.status(500).send({ error: err }) };
                    if (results.length > 0) {
                        let id_usuario = results[0].id_usuario;
                        const token = crypto.randomBytes(20).toString('hex');
                        conn.query('update usuarios set reset_password_token = ? where id_usuario = ?',
                        [token, id_usuario],
                            (err2, results2) => {
                                if (err2) { return res.status(500).send({ error: err2 }) };
                                conn.query('update usuarios set reset_password_require_date = current_timestamp() where id_usuario = ?',
                                [id_usuario],
                                    (err3, results3) => {
                                        if (err3) { return res.status(500).send({ error: err3 }) };
                                        conn.release();
                                        const response = {
                                            message: "Um email foi enviado para você com validade de 30 minutos"
                                        }
                                        sendResetPasswordEmail(token, req.body.email);
                                        return res.status(200).send(response);
                                    }
                                )
                            }
                        )
                    } else {
                        conn.release();
                        return res.status(404).send({ error: "Usuário não encontrado" });
                    }
                }
            )
        });
    } catch (err) {
        return res.status(500).send({ error: err });
    }
});

router.post("/cadastro", (req, res, next) => {
    mysql.getConnection((error, conn) => {
        if (error) { return res.status(500).send(error) }
        conn.query('select * from usuarios where email = ?', [req.body.email],
            (err, results) => {
                if (err) { return res.status(500).send({ error: err }) }
                if (results.length > 0) {
                    conn.release();
                    res.status(409).send({mensagem: "Usuário já cadastrado"})
                } else {
                    bcrypt.hash(req.body.senha, 10, (errBcrypt, hash) => {
                        if (errBcrypt) {
                            return res.status(500).send({ error: errBcrypt })
                        }
                        if (req.body.nome.length > 9) { return res.status(500).send({mensagem: "Número de caracteres para o nome maior que o permitido!"}) };
                        conn.query(`insert into usuarios (nome, email, senha, beta_hash, profile_photo, user_cover_image) values (?, ?, ?, ?, ?, ?)`, 
                            [req.body.nome, req.body.email, hash, req.body.beta_hash, process.env.URL_API + '/public/default-user-image.png', process.env.URL_API + "/public/default-banner-image.png"],
                            (err2, results2) => {
                                conn.release();
                                if (err2) { return res.status(500).send({ error: err2 }) };
                                const response = {
                                    mensagem: "Usuário criado com sucesso!",
                                    usuario_criado: {
                                        id_usuario: results2.insertId,
                                        nome: req.body.nome,
                                        email: req.body.email,
                                        beta_hash: req.body.beta_hash
                                    }
                                }
                                return res.status(201).send({ response });
                            }
                        )
                    });
                }
            }
        )
    });
});

router.post("/login", (req, res, next) => {
    mysql.getConnection((error, conn) => {
        if (error) { return res.status(500).send(error) };
        conn.query('select * from usuarios where email = ?', [req.body.email],
            (err, results) => {
                if (err) { return res.status(500).send({ error: err }) };
                if (results.length < 1) {
                    conn.release();
                    return res.status(401).send({ mensagem: "Falha na autenticação" });
                }

                conn.query('select * from beta_testers where beta_hash = ?',
                    [results[0].beta_hash],
                    (err2, results2) => {
                        conn.release();
                        if (err2) { return res.status(404).send( {error: err2 } )};
                        if (results2.length > 0 || results2.length <= 0) { //Condição OU adicionada para permitir que usuarios sem acesso ao beta fechado possam se conectar, isso é temporário, pois no futuro essa funcionalidade do beta fechado será extinta
                            bcrypt.compare(req.body.senha, results[0].senha, (error2, result) => {
                                if (error2) {
                                    return res.status(401).send({ mensagem: "Falha na autenticação" });
                                }
                                if (result) {
                                    const token = jwt.sign({
                                        id_usuario: results[0].id_usuario,
                                        email: results[0].email
                                    }, process.env.JWT_KEY,
                                        {
                                            expiresIn: "8h"
                                        })
                                    return res.status(200).send({ 
                                        mensagem: "Autenticado com sucesso", 
                                        token: token,
                                        id_usuario: results[0].id_usuario
                                    })
                                }
                                return res.status(401).send({ mensagem: "Falha na autenticação" });
                            });
                        } else {
                            return res.status(403).send({ mensagem: "Você não tem acesso ao beta fechado!" });
                        }
                    }
                )
            }
        )
    });
});

router.post("/exclude_user", login, (req, res, next) => {
    mysql.getConnection((error, conn) => {
        if (error) { return res.status(500).send(error) };
        conn.query('select user_groups from usuarios where id_usuario = ?',
        [req.usuario.id_usuario],
            (err, results) => {
                if (err) { return res.status(500).send({ error: err }) };
                
                conn.query(
                    'select * from os_groups where group_owner = ?',
                    [req.usuario.id_usuario],
                    (err2, results2) => {
                        if (err2) { return res.status(500).send({ error: err2 }) };

                        let target_group_members = results2[0].group_members;
                        let target_group_id = results2[0].groups_id;
                        let current_group_members;
                        if (target_group_members.indexOf(",") != -1) {
                            current_group_members = target_group_members.split(",");
                        } else {
                            current_group_members = target_group_members.split();
                        }
                        for (let i = 0; i < current_group_members.length; i++) {
                            conn.query('select user_groups from usuarios where id_usuario = ?',
                            [target_group_members[i]],
                                (err3, results3) => {
                                    if (err3) { return res.status(500).send({ error: err3 }) };

                                    let current_user_groups = results3[0].user_groups;
                                    let current_user_groups_array;
                                    if (current_user_groups.indexOf(",") != -1) {
                                        current_user_groups_array = current_user_groups.split(",").splice(current_user_groups.indexOf(target_group_id), 1);
                                        current_user_groups_array = current_user_groups_array.join(",");
                                    } 

                                    conn.query('update usuarios set user_groups = ? where id_usuario = ?',
                                    [current_user_groups_array, current_group_members[i]],
                                        (err4, results4) => {
                                            if (err4) { return res.status(500).send({ error: err4 }) };
                                            
                                        }
                                    )
                                }
                            )
                        }

                        setTimeout(() => {
                            let user_groups = results[0].user_groups;
                            if (user_groups.indexOf(",") != -1) {
                                user_groups = user_groups.split(",");
                            } else {
                                user_groups = user_groups.split();
                            }

                            for (let i = 0; i < user_groups.length; i++) {
                                conn.query('select group_members from os_groups where groups_id = ?',
                                [user_groups[i]],
                                    (err2, results2) => {
                                        if (err2) { return res.status(500).send({ error: err2 }) };

                                        let group_members = results2[0].group_members, new_group_members;
                                        if (group_members.indexOf(",") != -1) {
                                            new_group_members = group_members.split(",");
                                            new_group_members.splice(new_group_members.findIndex(obj => obj == user_groups[i]), 1);
                                            new_group_members = new_group_members.join(",");
                                        } else {
                                            new_group_members = "";
                                        }
                                        conn.query('update os_groups set group_members = ? where groups_id = ?',
                                        [new_group_members, user_groups[i]],
                                            (err3, results3) => {
                                                if (err3) { return res.status(500).send({ error: err3 }) };

                                                conn.query('update os_groups set group_members = ? where groups_id = ?',
                                                [new_group_members, user_groups[i]],
                                                    (err4, results4) => {
                                                        if (err4) { return res.status(500).send({ error: err4 }) };
                                                    }
                                                )
                                            }
                                        )
                                    }
                                )
                            }
                            setTimeout(() => {
                                conn.query(
                                    'delete from usuarios where id_usuario = ?',
                                    [req.usuario.id_usuario],
                                    (err3, results3) => {
                                        if (err3) { return res.status(500).send({ error: err3 }) };

                                        conn.query('delete from os_groups where group_owner = ?',
                                        [req.usuario.id_usuario],
                                            (err4, results4) => {
                                                if (err4) { return res.status(500).send({ error: err4 }) };
                                                conn.release();
                                                const response = {
                                                    message: "Usuário excluído com sucesso!"
                                                }
                                                return res.status(200).send(response);
                                            }
                                        )
                                    }
                                );
                            }, 1000);
                        }, 1000);
                    }
                );
            }
        )
    });
});

module.exports = router;