const express = require('express');
const app = express();
const path = require('path');
const bodyParser = require('body-parser');
const axios = require('axios');
const decodeJwt = require('./JwtDecoder');
const handler = require('./zenviaHandler');

const rcsToken = 'a71m3MknbnXkuUwZG6Vbm3c9bluFkwZ8wITJ';
const rcsApiUrl = 'https://api.zenvia.com/v2/channels/rcs/messages';
const secret = 'gTMb6RUAyw0OE5MNbk6c-v72i-qN2MZ4BPA92ksBpbG_Ltxt5yql7gc58m0jwJpmuBKxCVbZdiLsQ7zrY5xNKHZEmBj1RM07W7JpyD9ZasNfY3GibIkEWnPIzt7bT8fBKY6EzYpJsRhQd7jKVUmjgg98Ze_5krh6cx-WGkCXCg7FOm2S-XLTzG7n1x3kdrpCV74slqO744rljAze2VLbwa88MCNJ_JcaJee-2QcGtdXTMuUPrx--XXMzGDarxg2';


app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.raw({ type: 'application/jwt' }));

app.post('/save/', (req, res) => {
    console.log('Save route');
    const decoded = decodeJwt(req.body.toString('utf8'), secret);
    console.log('Decoded JWT:', decoded);
    res.status(200).send('Save');
});

app.post('/publish', (req, res) => {
    console.log('Publish route');
    const decoded = decodeJwt(req.body.toString('utf8'), secret);
    console.log('Decoded JWT:', decoded);
    res.status(200).send('Publish');
});

app.post('/validate', (req, res) => {
    console.log('Validate route');
    const decoded = decodeJwt(req.body.toString('utf8'), secret);
    console.log('Decoded JWT:', decoded);
    res.status(200).send('Validate');
});

app.post('/stop', (req, res) => {
    console.log('Stop route');
    const decoded = decodeJwt(req.body.toString('utf8'), secret);
    console.log('Decoded JWT:', decoded);
    res.status(200).send('Stop');
});

app.post('/execute', async (req, res) => {
    console.log('Execute route');
    const decoded = decodeJwt(req.body.toString('utf8'), secret);
    console.log('Decoded JWT:', decoded);

    const inArguments = decoded.inArguments;
    if (!Array.isArray(inArguments) || inArguments.length === 0) {
        res.status(400).send('No inArguments provided');
        return;
    }

    const rcsMessage = inArguments.find(arg => 'rcsMessage' in arg)?.rcsMessage;
    const phone = inArguments.find(arg => 'phone' in arg)?.phone;
    const from = inArguments.find(arg => 'from' in arg)?.from;
    const lista_card = inArguments.find(arg => 'lista_card' in arg)?.lista_card;
    console.log('RCS Message:', rcsMessage, 'Phone:', phone, 'From', from, 'lista', lista_card);

    if (from == '$_m-agent@rbm-sp-for-devs-basic-ld9khhv.iam.gserviceaccount.com') {
        try {
            console.log('Sending RCS message to Zenvia API...');
            const response = await axios.post(rcsApiUrl, {
                from: from,
                to: phone,
                contents: [
                    { type: "text", text: rcsMessage }
                ],
                conversation: { solution: "conversion" }
            }, {
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-TOKEN': rcsToken
                },
            });

            console.log('Zenvia API response:', JSON.stringify(response.data));

            if (response.status === 200) {
                res.status(200).send('RCS message sent successfully');
                handler.setStatus(zResponse)
            } else {
                res.status(response.status).send(response.statusText);
            }
        } catch (error) {
            console.error('Error sending RCS message:', error.message);
            res.status(500).send('Error sending RCS message: ' + error.message);
        }
    }
    else {
        try {
            let contents = []; // Inicializa um array vazio para armazenar os cards
            if (lista_card.length > 1) {

                var listar_de_cards = []
                if (Array.isArray(lista_card)) {
                    console.log('listajson é uma lista:', lista_card);

                    // Iterar sobre a lista
                    lista_card.forEach(item => {
                        // Verificar se cada item é um objeto
                        if (typeof item === 'object' && item !== null) {
                            if (item.Button2_Text === undefined || item.Button2_Text === null || item.Button2_Text === '') {

                                var cards = {
                                    title: item.Titulo_Card,
                                    text: item.Descriptio_Card,
                                    media: {
                                        url: item.Url_Imagem,
                                        disposition: "ON_THE_TOP_MEDIUM_HEIGHT",
                                        caption: "Our amazing office!"
                                    },
                                    buttons: [
                                        {
                                            type: "link",
                                            text: item.Button_Text,
                                            url: item.LinkButton
                                        }
                                    ]
                                }
                            } else {
                                var cards = {
                                    title: item.Titulo_Card,
                                    text: item.Descriptio_Card,
                                    media: {
                                        url: item.Url_Imagem,
                                        disposition: "ON_THE_TOP_MEDIUM_HEIGHT",
                                        caption: "Our amazing office!"
                                    },
                                    buttons: [
                                        {
                                            type: "link",
                                            text: item.Button_Text,
                                            url: item.LinkButton
                                        },
                                        {
                                            type: "link",
                                            text: item.Button2_Text,
                                            url: item.LinkButton2
                                        }
                                    ]
                                }

                            }

                            listar_de_cards.push(cards)
                            console.log(listar_de_cards);
                        } else {
                            console.error('Um item na lista não é um objeto:', item);
                        }
                    });
                } else {
                    console.error('listajson não é uma lista.');
                }
                try {
                    console.log('Sending RCS message to Zenvia API...');
                    const response = await axios.post(rcsApiUrl, {
                        from: from,
                        to: phone,
                        contents: [
                            {
                                "type": "carousel",
                                "cardWidth": "MEDIUM",
                                "cards": listar_de_cards
                            }

                        ],
                        conversation: { solution: "conversion" }
                    }, {
                        headers: {
                            'Content-Type': 'application/json',
                            'X-API-TOKEN': rcsToken
                        },
                    });

                    console.log('Zenvia API response:', JSON.stringify(response.data));

                    if (response.status === 200) {
                        res.status(200).send('RCS message sent successfully');
                    } else {
                        res.status(response.status).send(response.statusText);
                    }
                } catch (error) {
                    console.error('Error sending RCS message:', error.message);
                    res.status(500).send('Error sending RCS message: ' + error.message);
                }




            } else {
                lista_card.forEach(item => {
                    // Verificar se cada item é um objeto
                    if (item.Button2_Text === undefined || item.Button2_Text === null || item.Button2_Text === '') {

                        var card = {
                            "type": "card",
                            title: item.Titulo_Card,
                            text: item.Descriptio_Card,
                            media: {
                                url: item.Url_Imagem,
                                disposition: "ON_THE_TOP_MEDIUM_HEIGHT",
                                caption: "Our amazing office!"
                            },
                            buttons: [
                                {
                                    type: "link",
                                    text: item.Button_Text,
                                    url: item.LinkButton
                                }
                            ]
                        };
                    } else {
                        var card = {
                            "type": "card",
                            title: item.Titulo_Card,
                            text: item.Descriptio_Card,
                            media: {
                                url: item.Url_Imagem,
                                disposition: "ON_THE_TOP_MEDIUM_HEIGHT",
                                caption: "Our amazing office!"
                            },
                            buttons: [
                                {
                                    type: "link",
                                    text: item.Button_Text,
                                    url: item.LinkButton
                                },
                                {
                                    type: "link",
                                    text: item.Button2_Text,
                                    url: item.LinkButton2
                                }
                            ]
                        };
                    }


                    contents.push(card); // Adiciona o card ao array contents
                });

                console.log('Sending RCS message to Zenvia API...');
                const response = await axios.post(rcsApiUrl, {
                    from: from,
                    to: phone,
                    contents: contents,
                    conversation: { solution: "conversion" }
                }, {
                    headers: {
                        'Content-Type': 'application/json',
                        'X-API-TOKEN': rcsToken
                    },
                });


                console.log('Zenvia API response:', JSON.stringify(response.data));

                if (response.status === 200) {
                    res.status(200).send('RCS message sent successfully');
                    try {
                        var settings = {
                            "url": "https://mcy56lqntd9k5x-nkk02zhh8s208.auth.marketingcloudapis.com/v2/token",
                            "method": "POST",
                            "timeout": 0,
                            "headers": {
                              "Content-Type": "application/json"
                            },
                            "data": JSON.stringify({
                              "grant_type": "client_credentials",
                              "client_id": "x1tamhbo9usds5v2jn36ouzl",
                              "client_secret": "IXrck29g5GQLoQZEpQB39vCu",
                              "account_id": "500008088"
                            }),
                          };
                          
                          $.ajax(settings).done(function (response) {
                            console.log(response);
                          });
                    } catch (e) {
                    console.log(e);
                    }
                } else {
                    res.status(response.status).send(response.statusText);
                }
            }

        } catch (error) {
            console.error('Error sending RCS message:', error.message);
            res.status(500).send('Error sending RCS message: ' + error.message);
        }

    }

});

app.post('/webhook', (req, res) =>{
    const data = req.body
    res.sendStatus(200)
    console.log('Webhook route')
    if (data.type == 'MESSAGE_STATUS' ) {
        handler.updateStatus(data.messageId, data.messageStatus.code)
    }
})

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
