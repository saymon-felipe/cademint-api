require('dotenv').config();

let templates = {
    notificacaoUso: function (user_name) {
        return `
            📢 Olá, ${user_name}! Tudo certo?

            Aqui é a equipe da Cademint! Passando rapidinho para lembrar você de dar uma olhada nos seus projetos e tarefas na plataforma.

            ⚡ É sempre bom manter tudo organizado e em dia!

            Se precisar de algo, estamos por aqui. Qualquer dúvida, é só chamar! 🚀

            🔗 https://test-cademint.netlify.app
        `.split("\n").map(line => line.trim()).join("\n");
    
    }
}

module.exports = templates;