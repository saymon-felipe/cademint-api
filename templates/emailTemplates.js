require('dotenv').config();

let templates = {
    emailInviteToGroup: function (groupName, groupLink) {
        return `
            <div style="width: 100%; height: 100%; font-family: Arial, Helvetica, sans-serif;">
                <p>Oi tudo bem? Meu nome é Ana Clara, assistente virtual da <strong>Cademint</strong>.</p>
                <p>Fiquei sabendo que você recebeu uma solicitação para fazer parte do grupo <i>${ groupName }</i></p>
                <p>Para entrar no grupo e criar uma conta caso você ainda não seja cadastrado em nossa plataforma, clique no botão abaixo!</p>
                
                <br>
                <a href="${ process.env.URL_SITE }/enter-group?${ groupLink }" style="text-decoration: none; color: rgb(0, 162, 232); font-weight: 600; font-size: 20px; background: #FFCA37; padding: 10px 15px; border-radius: 10px;">
                    ENTRAR NO GRUPO
                </a>
                <br>
                <br>
                <a href="${ process.env.URL_SITE }" target="_blank">
                    <img src="https://lh3.googleusercontent.com/nSELc2XaAc7vhthJSOiS-JPx2iH_PSDocmJhncmQycotrygh1y_i1dRk-nEU1_bG6I1OZvxWjcNvhPaN=w616-h220-rw" style="width: 400px;">
                </a>
                <hr>
                <h6>
                    Este é um email automático enviado por ana.cademint@gmail.com, não responda.
                    Caso queira enviar um email para nós <a href="mailto:contato.scrumcademint@gmail.com">clique aqui</a>.
                </h6>
            </div>
        `
    },
    resetPasswordEmail: function (token) {
        return `
            <div style="width: 100%; height: 100%; font-family: Arial, Helvetica, sans-serif;">
                <p>Oi tudo bem? Meu nome é Ana Clara, assistente virtual da <strong>Cademint</strong>.</p>
                <p>Você solicitou uma redefinição de senha em nosso sistema, para criar uma nova é só clicar no link abaixo.</p>
                <p>Lembrando que esse link tem validade de apenas 30 minutos para maior segurança da sua conta!</p>
                
                <br>
                <a href="${process.env.URL_SITE}/reset-password?reset_token=${token}" style="text-decoration: none; color: rgb(0, 162, 232); font-weight: 600; font-size: 20px; background: #FFCA37; padding: 10px 15px; border-radius: 10px;">
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
    }
}

module.exports = templates;