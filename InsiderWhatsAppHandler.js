const { default: axios } = require("axios");

var recentMessages = []
var msgStatusId;
var mctk = {}

//funcção chamada sempre que uma menssagem é enviada
function setStatus(zResponse){

    console.log('Setting Message Status')

    if (msgStatusId==undefined) {
        msgStatusId = setInterval(() => {sendStatus()}, 1*30*1000); //cria um intervalo de tempo em ms para enviar as mensagens, atualmente 30s
    }

    var newStatus = {
        'keys': {messageId: zResponse.id},
        'values':{
            to: zResponse.to,
            from: zResponse.from,
            type: zResponse.contents[0].type,
            status: "Enviado",
            text: zResponse.contents[0].text
            }
    }
    recentMessages.push(newStatus)

    //se a menssagem armazena for a 200 (ou limite que o MC aguenta) ele envia pro MC
    if (Object.keys(recentMessages).length == 200) {
        sendStatus()
    }
}

//função chamada sempre no webhook de MESSAGE_STATUS
function updateStatus(mId, mStatus){
    console.log('Updating Message Status')
    recentMessages.forEach((msg)=>{

        if (msg['keys']['messageId']==mId) {
              msg['values']['status'] = mStatus
        }

    })

}

function sendStatus(){
    
    console.log('Sending status')

    //pega a lista de objetos de mensagens e copia para outra variável, assim podendo zerar a variável original e iniciar um novo batch
    var messagesBatch = []
    recentMessages.forEach(msg => {
        messagesBatch.push(msg)
    });  
    recentMessages = []
    //limpa o intervalor de tempo pra executar o envio, que será resetado no próximo envio
    clearInterval(msgStatusId)

    //verificação se o mctk (marketing ckloud token) existe e se foi cirado a menos de 20 minutos (ou tempo máximo de expiração)
    //se timestamp nao existir, e se existir e for maior que 20 minutos atrás, retorna false
    //inverso para true para a autenticação rodar nessas condições
    if (!(Date.now()-mctk['timestamp'] <= 20*60*1000)) {
        authSFMC().then((res)=>{
            if (res == 200) updateDE(messagesBatch)
        })
    }
    
    else updateDE(messagesBatch)

    
}

//função async pra poder ter o método .then e chamar a função updateDE apenas após finalizar a autenticação e for um sucesso (200)
async function authSFMC(){

    console.log('Authenticating')

    let data = JSON.stringify({
    "grant_type": "client_credentials",
    "client_id": "x1tamhbo9usds5v2jn36ouzl",
    "client_secret": "IXrck29g5GQLoQZEpQB39vCu",
    "account_id": "500008088"
    });

    let config = {
        method: 'post',
        maxBodyLength: Infinity,
        url: 'https://mcy56lqntd9k5x-nkk02zhh8s208.auth.marketingcloudapis.com/v2/token',
        headers: { 
            'Content-Type': 'application/json'
        },
        data : data
        };

        try {
            const response = await axios.request(config)
            //cria as chaves no objeto mctk pra guardar o token como vai ser usado e quando, em milissegundos, o token foi criado
            mctk['token'] = "Bearer " + response.data['access_token']
            mctk['timestamp'] = Date.now()
            return response.status
        } catch (error) {
            console.log(error)
            return response.status
        }
    
  
}

function updateDE(data){

    console.log('Updating Data Extension')

    let config = {
        method: 'post',
        maxBodyLength: Infinity,
        url: 'https://mcy56lqntd9k5x-nkk02zhh8s208.rest.marketingcloudapis.com/hub/v1/dataeventsasync/key:8AFFBAD4-C78D-403C-AD7B-BC354D790A85/rowset',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': mctk['token']
        },
        data : data
      };
      
      axios.request(config)
      .then((response) => {
        console.log(response.status);
      })
      .catch((error) => {
        console.log(error);
      });

}

module.exports = {setStatus, updateStatus}