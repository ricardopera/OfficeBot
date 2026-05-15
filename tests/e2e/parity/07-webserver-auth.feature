# spec-id: PARITY-07
# rastreabilidade: webserver/requirements.md WS-01 a WS-22

@paridade @critico
Funcionalidade: Webserver Auth e WebUI

  Cenario: Login com JWT
    Dado que o usuario envia username/password valido
    Quando POST /login
    Entao recebe cookie "officebot-session" httpOnly
    E token JWT com expiracao configuravel

  Cenario: Token extraction
    Dado que o request tem Authorization Bearer <token>
    Ou cookie "officebot-session" <token>
    Quando TokenMiddleware processa
    Entao o token e extraido e validado

  Cenario: Rate limiting auth
    Dado que 6 tentativas de login em 15 minutos do mesmo IP
    Quando a 6a tentativa e feita
    Entao o request e rejeitado com 429

  Cenario: WebSocket auth-expired
    Dado que uma conexao WebSocket ativa recebe "auth-expired"
    Quando o browser adapter processa
    Entao shouldReconnect=false e redirect para /login

  Cenario: Senha default gerada randomicamente
    Dado que e a primeira inicializacao sem usuarios
    Quando o webserver inicia
    Entao uma senha de 12-17 chars e gerada
    E exibida no console + QR code

  Cenario: Logout invalida token
    Dado que o usuario esta autenticado com token valido
    Quando POST /logout
    Entao o token e invalidado
    E o cookie e limpo