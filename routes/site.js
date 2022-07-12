const express = require('express');
const router = express.Router();
const util = require('util');
const email = require('../config/email');
const crypto = require('crypto');
const mysql = require("../mysql").pool;

async function sendEmail(user_email, name) {
    const mailSent = await email.sendMail({
        html: createEmailInviteUserToGroup(name),
        subject: `Você está na fila de espera do beta da Cademint!`,
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

async function sendEnterEmail(user_email, name, token) {
    const mailSent = await transport.sendMail({
        html: createEmailBetaUserAccepted(name, token, user_email),
        subject: `PARABÉNS! Você está no beta fechado da Cademint!`,
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

async function sendMoreInformationsEmail(user_email, name) {
    const mailSent = await transport.sendMail({
        html: createEmailBetaMoreInformations(name),
        subject: `Como funciona o beta da Cademint?`,
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

async function sendRejectedEmail(user_email, name) {
    const mailSent = await transport.sendMail({
        html: createEmailRejectedBeta(name),
        subject: `Não foi dessa vez ${name}!`,
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

function createEmailRejectedBeta(name) {
    let email = `
    <div style="width: 100%; height: 100%; font-family: Arial, Helvetica, sans-serif; color: #000">
        <h3 style="color: #000;">Olá <strong>${name}</strong>!</h3>
        <p style="color: #000;">
            Agradecemos seu interesse em participar do beta fechado da Cademint! Contudo você não foi selecionado para fazer parte desse período de teste inicial da nossa plataforma.
        </p>
        <p style="color: #000;">
            Mas não fique chateado, você ainda pode criar sua conta e aguardar até que a versão oficial seja liberada!
        </p>
        <p style="color: #000">
            Para criar sua conta, clique no botão abaixo!
        </p>
        <br>
        <br>
        <a href="${process.env.URL_SITE + process.env.SITE_NAME}/register.html" style="text-decoration: none; color: rgb(0, 162, 232); font-weight: 600; font-size: 20px; background: #FFCA37; padding: 10px 15px; border-radius: 10px;">
            CRIAR CONTA GRATUITAMENTE!
        </a>
        <br>
        <br>
        <p style="color: #000">
            Nos vemos em breve!
        </p>
        <br>
        <br>
        <a href="https://saymon-felipe.github.io/cademint" target="_blank">
            <img src="https://lh3.googleusercontent.com/nSELc2XaAc7vhthJSOiS-JPx2iH_PSDocmJhncmQycotrygh1y_i1dRk-nEU1_bG6I1OZvxWjcNvhPaN=w616-h220-rw" style="width: 400px;">
        </a>
        <hr>
        <h6 style="color: #000;">
            Este é um email automático enviado por ana.cademint@gmail.com, não responda.
            Caso queira enviar um email para nós <a href="mailto:contato.scrumcademint@gmail.com">clique aqui</a>.
        </h6>
    </div>
    `
    return email;
}

function createEmailBetaMoreInformations(name) {
    let email = `
    <div style="width: 100%; height: 100%; font-family: Arial, Helvetica, sans-serif; color: #000">
        <h3 style="color: #000;">Olá <strong>${name}</strong>, a baixo estão mais informações sobre o beta fechado da Cademint!</h3>
        <p style="color: #000;">
            Estamos iniciando essa fase de beta fechado para que algumas pessoas possam usar nossa plataforma ainda em fase de desenvolvimento, com isso nós poderemos aprender e aprimorar vários aspectos da Cademint e assim disponibilizar
            um produto completo e confiável para o público no futuro!
        </p>
        <p style="color: #000;">
            Depois de cadastrar seu nome e email no site, sua solicitação entra na fila de espera e nosso sistema decidirá se você entrará ou não no beta fechado. Caso você não seja selecionado, a criação de conta permanece disponível
            para você, ou seja, você pode criar sua conta e depois aguardar para poder utilizar o aplicativo quando o a versão oficial for lançada.
        </p>
        <p style="color: #000;">
            E se você for selecionado, você receberá um email com um link que permitirá você criar sua conta e participar do beta fechado. Somente a conta que for criada com esse código será permitida de fazer login na plataforma, então
            <strong>NÃO COMPARTILHE ESSE CÓDIGO COM NINGUÉM</strong>.
        </p>
        <p style="color: #000">
            Por fim, os benefícios que os selecionados terão são:
        </p>
        <ul style="color: #000">
            <li>Total acesso à plataforma onde todos os recursos serão liberados</li>
            <li>Acesso aos recursos que ainda serão desenvolvidos até o beta fechado terminar</li>
            <li>Quando o beta terminar, a pessoa selecionada terá beneficios dentro da versão oficial da plataforma</li>
            <li>Suporte 24 horas</li>
        </ul>
        <br>
        <p style="color: #000">
            Agora é só esperar para ver se você será selecionado ou não!
        </p>
        <p style="color: #000">
            Nos vemos em breve!
        </p>
        <br>
        <br>
        <a href="https://saymon-felipe.github.io/cademint" target="_blank">
            <img src="https://lh3.googleusercontent.com/nSELc2XaAc7vhthJSOiS-JPx2iH_PSDocmJhncmQycotrygh1y_i1dRk-nEU1_bG6I1OZvxWjcNvhPaN=w616-h220-rw" style="width: 400px;">
        </a>
        <hr>
        <h6 style="color: #000;">
            Este é um email automático enviado por ana.cademint@gmail.com, não responda.
            Caso queira enviar um email para nós <a href="mailto:contato.scrumcademint@gmail.com">clique aqui</a>.
        </h6>
    </div>
    `
    return email;
}

function createEmailBetaUserAccepted(name, token, user_email){
    let email = `
    <div style="width: 100%; height: 100%; font-family: Arial, Helvetica, sans-serif; color: #000">
        <h3 style="color: #000;"><strong>${name}</strong> tenho ótimas notícias!</h3>
        <p style="color: #000;">Você foi selecionado para fazer parte do beta fechado da Cademint!</p>
        <p style="color: #000;">Lembre-se, no beta fechado você tem acesso à todos os recursos da plataforma que existem e que serão desenvolvidos, até o lançamento oficial da plataforma (que ainda não tem previsão).</p>
        <p style="color: #000;">Para criar sua conta com acesso ao beta fechado, clique no botão abaixo!</p>
        <br>
        <a href="${process.env.URL_SITE}/register/&email=${user_email}&beta_hash=${token}&name=${name}" style="text-decoration: none; color: rgb(0, 162, 232); font-weight: 600; font-size: 20px; background: #FFCA37; padding: 10px 15px; border-radius: 10px;">
            CRIAR CONTA GRATUITAMENTE!
        </a>
        <br>
        <br>
        <a href="https://saymon-felipe.github.io/cademint" target="_blank">
            <img src="https://lh3.googleusercontent.com/nSELc2XaAc7vhthJSOiS-JPx2iH_PSDocmJhncmQycotrygh1y_i1dRk-nEU1_bG6I1OZvxWjcNvhPaN=w616-h220-rw" style="width: 400px;">
        </a>
        <hr>
        <h6 style="color: #000;">
            Este é um email automático enviado por ana.cademint@gmail.com, não responda.
            Caso queira enviar um email para nós <a href="mailto:contato.scrumcademint@gmail.com">clique aqui</a>.
        </h6>
    </div>
    `
    return email;
} 

function createEmailInviteUserToGroup(name) {
    let email = `
    <div style="width: 100%; height: 100%; font-family: Arial, Helvetica, sans-serif; color: #000">
        <p style="color: #000;">Oi ${name} tudo bem? Meu nome é Ana Clara, assistente virtual da <strong>Cademint</strong>.</p>
        <p style="color: #000;">Estou aqui para dizer que você já está na fila de espera para participar do beta fechado da <b>Cademint</b>!</p>
        <p style="color: #000;">Agora é só esperar e torcer para ser selecionado!</p>
        <br>
        <a href="https://saymon-felipe.github.io/cademint" target="_blank">
            <img src="https://lh3.googleusercontent.com/nSELc2XaAc7vhthJSOiS-JPx2iH_PSDocmJhncmQycotrygh1y_i1dRk-nEU1_bG6I1OZvxWjcNvhPaN=w616-h220-rw" style="width: 400px;">
        </a>
        <hr>
        <h6 style="color: #000;">
            Este é um email automático enviado por ana.cademint@gmail.com, não responda.
            Caso queira enviar um email para nós <a href="mailto:contato.scrumcademint@gmail.com">clique aqui</a>.
        </h6>
    </div>
    `
    return email;
}

router.post("/enter_closed_beta", (req, res, next) => {
    let name = req.body.name;
    let email = req.body.email;
    let number = 1;
    let randomNumber = Math.floor(Math.random() * 2);
    let finalNumber = randomNumber == number ? number : "";

    if (name.length > 9) {
        return res.status(401).send({ mensagem: "Número de caracteres maior que o permitido!" });
    }
    
    mysql.getConnection((error, conn) => {
        if (error) { return res.status(500).send({ error: error }) };
        conn.query('select * from usuarios where email = ?', 
            [email],
            (err, results) => {
                if (results.length > 0) {
                    conn.release();
                    return res.status(409).send({ mensagem: "Usuário ja está cadastrado em nossa plataforma!" });
                } else {
                    conn.query('select * from beta_queue where email = ?',
                        [email],
                        (err2, results2) => {
                            if (err2) { res.status(500).send({ error: err2 }) };
                            if (results2.length > 0) {
                                conn.release();
                                return res.status(409).send({ mensagem: "Você ja está na fila de espera!" });
                            } else {
                                conn.query('insert into beta_queue (nome, email) values (?, ?)',
                                    [name, email],
                                    (err3, results3) => {
                                        if (err3) { return res.status(500).send({ error: err3 }) };
                                        if (finalNumber != "") {
                                            const token = crypto.randomBytes(20).toString("hex");
                                            conn.query('insert into beta_testers (beta_hash) values (?)', 
                                                [token],
                                                (err4, results4) => {
                                                    conn.release();
                                                    if (err4) { return res.status(500).send({ error: "Erro ao cadastrar o token do usuario beta." }) };
                                                }
                                            )
                                            setTimeout(() => {
                                                sendEnterEmail(email, name, token);
                                            }, 300 * 1000);
                                        } else {
                                            setTimeout(() => {
                                                sendRejectedEmail(email, name);
                                            }, 300 * 1000);
                                        }
                                        
                                        if (sendEmail(email, name)) {
                                            const response = {
                                                message: "Você está na fila de espera para entrar no beta fechado de Cademint!",
                                                name: name,
                                                email: email
                                            }
                                            setTimeout(() => {
                                                sendMoreInformationsEmail(email, name);
                                            }, 15 * 1000);
                                        
                                            return res.status(200).send({ response });
                                        } else {
                                            return res.status(500).send({ error: "Houve um erro ao enviar o email" });
                                        }
                                    }
                                )
                            }
                        }
                    )
                }
            }
        )
    });
});

module.exports = router;