const express = require('express');
const router = express.Router();
const mysql = require("../mysql").pool;
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const util = require('util');
const login = require("../middleware/login");
const aws = require('aws-sdk');
const multerS3 = require('multer-s3');

aws.config.update({
   accessKeyId: process.env.ACCESS_KEY_ID,
   secretAccessKey: process.env.SECRET_ACCESS_KEY,
   region: process.env.REGION 
});

const s3 = new aws.S3();

const fileFilter = (req, file, cb) => {
    if (file.mimetype === "image/jpeg" || file.mimetype === 'image/jpg' || file.mimetype === 'image/png') {
        cb(null, true);
    } else {
        cb(null, false);
    }
};

const upload = multer({
    storage: multerS3({
        s3,
        bucket: 'scrum-cademint-storage',
        acl: 'public-read',
        key(req, file, cb) {
            let fileName = new Date().toISOString() + file.originalname;
            cb(null, fileName.replace(":", "_").replace(":", "_"));
        }
    }),
    limits: {
        fileSize: 1024 * 1024 * 2
    },
    fileFilter: fileFilter
});

async function deleteFromS3 (attachmentId) {
    return s3.deleteObject({ Bucket: "scrum-cademint-storage", Key: attachmentId }).promise();
}

router.get("/", (req, res, next) => {
    mysql.getConnection((error, conn) => {
        if (error) { return res.status(500).send({ error: error }) }
        conn.query('select * from usuarios', 
            (error, results) => {
                conn.release();
                if (error) { return res.status(500).send({ error: error }) }
                if (results.length > 0) {
                    const response = {
                        mensagem: "Retorno de todos os usuários",
                        lista_de_usuarios: results.map(users => {
                            return {
                                id_usuario: users.id_usuario,
                                nome: users.nome
                            }
                        })
                        
                    }
                    return res.status(200).send({ response });
                } else {
                    return res.status(404).send({ mensagem: "Nenhum usuário cadastrado" });
                }
            }
        )
    });
});

router.get("/return_user", login, (req, res, next) => {
    mysql.getConnection((error, conn) => {
        if (error) { return res.status(500).send({ error: error }) };
        conn.query('select * from usuarios where id_usuario = ?', 
        [req.usuario.id_usuario], 
            (err, results) => {
                if (err) { return res.status(500).send({ error: err }) }
                if (results.length > 0) {
                    let user_groups = results[0].user_groups.split(",");
                    let user_groups_object = [];
                    let user_groups_id = "";
                    for (let i in user_groups) {
                        conn.query('select * from os_groups where groups_id = ?',
                        [user_groups[i]], 
                            (err2, results2) => {
                                if (err2) { return res.status(500).send({ error: err2 }) };
                                if (results2[0] != undefined) {
                                    let group_members_object = [], pending_users = results2[0].pending_users, pending_members_array = [];
                                    if (pending_users.indexOf(",")) { //Se entrar aqui significa que existe mais de um email na lista de usuarios pendentes
                                        pending_members_array = pending_users.split(",");
                                    } else {
                                        pending_members_array.push(results2[0].pending_users);
                                    }
                                    let resultsGroupMembers = results2[0].group_members.split(",");
                                    for (let j in resultsGroupMembers) {
                                        conn.query('select * from usuarios where id_usuario = ?',
                                        [resultsGroupMembers[j]],
                                            (err3, results3) => {
                                                if (err3) { return res.status(500).send({ error: err3 }) };
                                                group_members_object[j] = {
                                                    nome: results3[0].nome,
                                                    email: results3[0].email,
                                                    id_usuario: results3[0].id_usuario,
                                                    profile_photo: results3[0].profile_photo,
                                                    user_groups: results3[0].user_groups
                                                }
                                            }
                                        )
                                        
                                    }
                                    setTimeout(() => {
                                        user_groups_object[i] = {
                                            groups_id: results2[0].groups_id,
                                            group_name: results2[0].group_name,
                                            group_members: group_members_object,
                                            group_owner: results2[0].group_owner,
                                            pending_users: pending_members_array
                                        }
                                    }, 150)
                                    
                                    if (i == 0) {
                                        user_groups_id = results2[0].groups_id;
                                    } else {
                                        user_groups_id += "," + results2[0].groups_id;
                                    }
                                }
                            }
                        )
                    }
                    setTimeout(() => {
                        conn.release();
                        const response = {
                            mensagem: "Retorno de usuário " + req.usuario.id_usuario,
                            id_usuario: req.usuario.id_usuario,
                            email: req.usuario.email,
                            nome: results[0].nome,
                            profile_photo: results[0].profile_photo,
                            user_groups: user_groups_object,
                            user_groups_id: user_groups_id
                        }
                       return res.status(200).send({ response });
                    }, 200);
                } else {
                   return res.status(404).send({ mensagem: "Nenhum usuário com esse id" });
                }
            }
        )
    });
});

router.post("/return_user_by_email", (req, res, next) => {
    if (req.body.email == "") {
        return res.status(404).send({ error: "Erro na busca de usuário, email vazio!" });
    } else {
        mysql.getConnection((error, conn) => {
            if (error) { return res.status(500).send({ error: error }) }
            conn.query('select * from usuarios where email = ?',
            [req.body.email], 
                (error, results) => {
                    conn.release();
                    if (error) { return res.status(500).send({ error: error }) };
                    if (results.length == 0) {
                        const response = {
                            mensagem: "Usuário não cadastrado, prossiga para o cadastro!",
                            usuario: []
                        }
                        return res.status(404).send({ response });
                    } else {
                        let user_groups_array;
                        if (results[0].user_groups.indexOf(",") != -1) {
                            user_groups_array = results[0].user_groups.split(",");
                        } else {
                            user_groups_array = results[0].user_groups;
                        }
                        const response = {
                            mensagem: "Usuário cadastrado",
                            usuario: {
                                nome: results[0].nome,
                                user_groups: user_groups_array,
                                email: results[0].email,
                                id_usuario: results[0].id_usuario
                            }
                        }
                        return res.status(202).send({ response });
                    }
                }
            )
        });
    }
});

router.get("/get_name", login, (req, res, next) => {
    mysql.getConnection((error, conn) => {
        if (error) { return res.status(500).send({ error: error }) }
        conn.query('select nome from usuarios where id_usuario = ?',
        [req.usuario.id_usuario], 
            (error, results) => {
                conn.release();
                if (error) { return res.status(500).send({ error: error }) }
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
    mysql.getConnection((error, conn) => {
        if (error) { return res.status(500).send({ error: error }) }
        conn.query('select * from usuarios where id_usuario = ?',
        [req.usuario.id_usuario], 
            (error, results) => {
                conn.release();
                if (error) { return res.status(500).send({ error: error }) }
                if (results.length > 0) {
                    const response = {
                        mensagem: "Retorno de usuário " + req.usuario.id_usuario,
                        nome: results.nome
                    }
                    return res.status(200).send({ response });
                } else {
                    return res.status(404).send({ mensagem: "Nenhum usuário com esse id" });
                }
            }
        )
    });
});

router.get("/return_user_by_jwt", login, (req, res, next) => {
    mysql.getConnection((error, conn) => {
        if (error) { return res.status(500).send({ error: error }) }
        conn.query('select * from usuarios where id_usuario = ?',
        [req.usuario.id_usuario], 
            (error, results) => {
                conn.release();
                if (error) { return res.status(500).send({ error: error }) }
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
        if (error) { return res.status(500).send({ error: error }) }
        conn.query('SELECT profile_photo FROM usuarios WHERE id_usuario = ?',
        [req.usuario.id_usuario],
            (err, results) => {
                if (err) { return res.status(500).send({ error: err }) };
                let photo_url = results[0].profile_photo.split("/")[3];
                deleteFromS3(photo_url);

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

router.patch("/upload_photo", login, upload.single('user_imagem'), (req, res, next) => {
    if (req.file == undefined) {
        return res.status(500).send({ error: "Tipo de arquivo não suportado" })
    } else {
        mysql.getConnection((error, conn) => {
            if (error) { return res.status(500).send({ error: error }) }
            conn.query('update usuarios set profile_photo = ? where id_usuario = ?',
            [req.file.location, req.usuario.id_usuario], 
                (error, results) => {
                    conn.release();
                    if (error) { return res.status(500).send({ error: error }) }
                    if (results.changedRows != 0) {
                        const response = {
                            id_usuario: "Retorno de usuário " + req.usuario.id_usuario,
                            profile_photo: req.file.location
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
        if (error) { return res.status(500).send({ error: error }) }
        conn.query('update usuarios set nome = ? where id_usuario = ?',
        [req.body.nome, req.usuario.id_usuario], 
            (error, results) => {
                conn.release();
                if (error) { return res.status(500).send({ error: error }) }
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
        if (error) { return res.status(500).send({ error: error }) };
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

router.post("/exclude_group", login, (req, res, next) => {
    let group_id = req.body.group_id;
    let user_id = req.body.user_id;
    mysql.getConnection((error, conn) => {
        if (error) { return res.status(500).send({ error: error }) }
        conn.query('select user_groups from usuarios where id_usuario = ?',
        [user_id],
            (err, results) => {

            }
        )
    });
});

router.post("/cadastro", (req, res, next) => {
    mysql.getConnection((error, conn) => {
        if (error) { return res.status(500).send({ error: error }) }
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
                        conn.query(`insert into usuarios (nome, email, senha, beta_hash, profile_photo) values (?, ?, ?, ?, ?)`, 
                            [req.body.nome, req.body.email, hash, req.body.beta_hash, process.env.URL_API + '/public/default-user-image.png'],
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
        if (error) { return res.status(500).send({ error: error }) };
        conn.query('select * from usuarios where email = ?', [req.body.email],
            (err, results) => {
                if (err) { return res.status(500).send({ error: err }) };
                if (results.length < 1) {
                    return res.status(401).send({ mensagem: "Falha na autenticação" });
                }

                conn.query('select * from beta_testers where beta_hash = ?',
                    [results[0].beta_hash],
                    (err2, results2) => {
                        conn.release();
                        if (err2) { return res.status(404).send( {error: err2 } )};
                        if (results2.length > 0) {
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
        if (error) { return res.status(500).send({ error: error }) };
        conn.query('select user_groups from usuarios where id_usuario = ?',
        [req.usuario.id_usuario],
            (err, results) => {
                if (err) { return res.status(500).send({ error: err }) };
                
                conn.query(
                    'select * from os_groups where group_owner = ?',
                    [req.usuario.id_usuario],
                    (err2, results2) => {
                        if (err2) { return res.status(500).send({ error: err2 }) };

                        let target_group = results2[0].group_members;
                        let target_group_id = results2[0].groups_id;
                        let current_group_members;
                        if (target_group.group_members.indexOf(",") != -1) {
                            current_group_members = target_group.group_members.split(",");
                        } else {
                            current_group_members = target_group.group_members.split();
                        }
                        for (let i = 0; i < current_group_members.length; i++) {
                            conn.query('select user_groups from usuarios where id_usuario = ?',
                            [target_group.group_members[i]],
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
                        }, 1000);
                    }
                );
                
                setTimeout(() => {
                    conn.query(
                        'delete from usuarios where id_usuario = ?',
                        [req.usuario.id_usuario],
                        (err2, results2) => {
                            if (err2) { return res.status(500).send({ error: err2 }) };
                            conn.release();
                            const response = {
                                message: "Usuário excluído com sucesso!"
                            }
                            return res.status(200).send(response);
                        }
                    );
                }, 2 * 1000);
            }
        )
    });
});

module.exports = router;