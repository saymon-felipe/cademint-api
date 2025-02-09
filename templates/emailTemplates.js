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
    },
    adminConnectWhatsapp: function () {
        return `
            <div style="width: 100%; max-width: 600px; margin: 20px auto; padding: 20px; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1); font-family: Arial, Helvetica, sans-serif;">
                <div style="text-align: center; padding: 20px; background-color: #4CAF50; color: #ffffff; border-radius: 8px;">
                    <h1 style="margin: 0;">Cademint</h1>
                    <p style="margin: 0; font-size: 18px;">Reconectar WhatsApp Web</p>
                </div>
                <div style="padding: 20px;">
                    <p style="font-size: 16px; line-height: 1.5;">ADMIN CADEMINT</p>
                    <p style="font-size: 16px; line-height: 1.5;">A conexão do bot do whatsapp caiu, favor reconectar.</p>
                    <p style="font-size: 16px; line-height: 1.5;">Escaneie o QR Code em anexo para reconectar:</p>

                    <a href="${process.env.URL_SITE}" style="text-decoration: none; color: rgb(0, 162, 232); font-weight: 600; font-size: 20px; background: #FFCA37; padding: 10px 15px; border-radius: 10px;">
                        Acessar o sistema
                    </a>
                </div>
                <div style="text-align: center; margin-top: 20px; font-size: 14px; color: #777;">
                    <a href="${process.env.URL_SITE}" target="_blank">
                        <img src="https://lh3.googleusercontent.com/nSELc2XaAc7vhthJSOiS-JPx2iH_PSDocmJhncmQycotrygh1y_i1dRk-nEU1_bG6I1OZvxWjcNvhPaN=w616-h220-rw" style="width: 400px;">
                    </a>
                    <hr>
                    <h6>
                        Este é um email automático enviado por ana.cademint@gmail.com, não responda.
                        Caso queira enviar um email para nós <a href="mailto:contato.scrumcademint@gmail.com">clique aqui</a>.
                    </h6>
                </div>
            </div>
        `
    },
    adminWhatsappConected: function (qrCode) {
        return `
            <div style="width: 100%; max-width: 600px; margin: 20px auto; padding: 20px; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1); font-family: Arial, Helvetica, sans-serif;">
                <div style="text-align: center; padding: 20px; background-color: #4CAF50; color: #ffffff; border-radius: 8px;">
                    <h1 style="margin: 0;">Cademint</h1>
                    <p style="margin: 0; font-size: 18px;">WhatsApp Web Reconectado</p>
                </div>
                <div style="padding: 20px;">
                    <p style="font-size: 16px; line-height: 1.5;">ADMIN CADEMINT</p>
                    <p style="font-size: 16px; line-height: 1.5;">A conexão do bot do whatsapp foi restaurada com sucesso!</p>

                    <a href="${process.env.URL_SITE}" style="text-decoration: none; color: rgb(0, 162, 232); font-weight: 600; font-size: 20px; background: #FFCA37; padding: 10px 15px; border-radius: 10px;">
                        Acessar o sistema
                    </a>
                </div>
                <div style="text-align: center; margin-top: 20px; font-size: 14px; color: #777;">
                    <a href="${process.env.URL_SITE}" target="_blank">
                        <img src="https://lh3.googleusercontent.com/nSELc2XaAc7vhthJSOiS-JPx2iH_PSDocmJhncmQycotrygh1y_i1dRk-nEU1_bG6I1OZvxWjcNvhPaN=w616-h220-rw" style="width: 400px;">
                    </a>
                    <hr>
                    <h6>
                        Este é um email automático enviado por ana.cademint@gmail.com, não responda.
                        Caso queira enviar um email para nós <a href="mailto:contato.scrumcademint@gmail.com">clique aqui</a>.
                    </h6>
                </div>
            </div>
        `
    }
}

module.exports = templates;