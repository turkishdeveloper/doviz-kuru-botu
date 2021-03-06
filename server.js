const Twitter = require('twitter');
const https = require("https");
const ozluSozler = require("./ozlu-sozler");
// Gerekli apii bilgisi alınıyor...
const TwitterConfig = {
    consumer_key: process.env.TWITTER_CONSUMER_KEY || '',
    consumer_secret: process.env.TWITTER_CONSUMER_SECRET || '',
    access_token_key: process.env.TWITTER_TOKEN_KEY || '',
    access_token_secret: process.env.TWITTER_TOKEN_SECRET || ''
};

// API bilgisi yoksa boşuna uğraştırmıyorum ve komple hata döndürüyorum. API bilgisi olmayan bot, bot değildir.
if (!TwitterConfig.consumer_key) throw new Error("Twitter consumer key not found!")
if (!TwitterConfig.consumer_secret) throw new Error("Twitter consumer secret not found!")
if (!TwitterConfig.access_token_key) throw new Error("Twitter access token key not found!")
if (!TwitterConfig.access_token_secret) throw new Error("Twitter access token secret not found!")


var client = new Twitter(TwitterConfig);

const dovizTimer = setInterval(_ => {
    getInformations()
}, 900000)

// Rasgele bir ozlu soz seçip 6 saatte bir bunu paylaşıcaz. 
const ozluSozTimer = setInterval(_=>{
    const soz = ozluSozler[Math.floor(Math.random()*ozluSozler.length)];
    client.post('statuses/update', {
        status: soz
    })
    .then(function (tweet) {
        console.log("Tweet paylaşıldı, ", soz)
    })
    .catch(function (error) {
        console.log(error)
    })
}, 21600000)


function getInformations() {
    const date = new Date();
    const day = date.getDay();
    if((day == 6) || (day == 0)) return;
    // Altının son değerlerini alıyorum
    const altin = new Promise((resolve, reject) => {
        https.get("https://www.doviz.com/api/v1/golds/ons/latest", (res) => {
            if (res.statusCode != 200) return reject("Bağlantı problemi !")
            let dump = ""
            res.setEncoding('utf8');
            res.on('data', (d) => {
                dump += d
            });
            res.on("end", _ => {
                var data = JSON.parse(dump);
                resolve(data)
            })

        }).on('error', (e) => {
            reject(e)
        });
    })


    // Tüm döviz bilgilerini çekiyorum...
    const doviz = new Promise((resolve, reject) => {
        https.get("https://www.doviz.com/api/v1/currencies/all/latest", (res) => {
            if (res.statusCode != 200) return reject("Bağlantı problemi !")
            let dump = ""
            res.setEncoding('utf8');
            res.on('data', (d) => {
                dump += d
            });

            res.on("end", _ => {
                const data = JSON.parse(dump);

                //Sadece belirlemiş olduğum kurlar üzerinde işlem yapmak istiyorum. Bu yüzden bir liste oluşturalım. 
                // USD, EUR ve GBP yeterli olucaktır
                const currenyList = {
                    USD: {},
                    EUR: {},
                    GBP: {}
                };
                data.forEach(el => {
                    if (currenyList[el.code]) {
                        currenyList[el.code].buying = el.buying;
                        currenyList[el.code].selling = el.selling;
                        currenyList[el.code].change_rate = el.change_rate;
                    }
                })
                return resolve(currenyList)
            })

        }).on('error', (e) => {
            reject(e)
        });
    })

    const bist100 = new Promise((resolve, reject) => {
        https.get("https://www.doviz.com/api/v1/indexes/XU100/latest", (res) => {
            if (res.statusCode != 200) return reject("Bağlantı problemi !")
            let dump = ""
            res.setEncoding('utf8');
            res.on('data', (d) => {
                dump += d
            });

            res.on("end", _ => {
                var data = JSON.parse(dump);
                resolve(data)
            })

        }).on('error', (e) => {
            reject(e)
        });
    })

    const btc = new Promise((resolve, reject) => {
        https.get("https://www.btcturk.com/api/ticker", (res) => {
            if (res.statusCode != 200) return reject("Bağlantı problemi !")
            let dump = ""
            res.setEncoding('utf8');
            res.on('data', (d) => {
                dump += d
            });

            res.on("end", _ => {
                var data = JSON.parse(dump);
                resolve(data)
            })

        }).on('error', (e) => {
            reject(e)
        });
    })

    Promise.all([altin, doviz, bist100, btc]).then(results => {
        const tarihBilgisi = `Güncelleme: ${date.getHours() + ":" + date.getMinutes() + " - " + date.getDate() + "-" + (date.getMonth() + 1) + "-" + date.getFullYear()}`

        const altinBilgisi = `\n\n#ALTIN ALIŞ - ${results[0].buying}\n#ALTIN SATIŞ - ${results[0].selling}`;

        const dolarBilgisi = `\n\n#USD ALIŞ - ${results[1].USD.buying}\n#USD SATIŞ - ${results[1].USD.selling}`
        const euroBilgisi = `\n\n#EUR ALIŞ - ${results[1].EUR.buying}\n#EUR SATIŞ - ${results[1].EUR.selling}`
        const sterlinBilgisi = `\n\n#GBP ALIŞ - ${results[1].GBP.buying}\n#GBP SATIŞ - ${results[1].GBP.selling}`;

        const bistBilgisi = `\n\n#BIST100 - ${results[2].latest}`;

        const btcBilgisi = `\n\n#BTC - #TRY ${parseFloat(results[3][0].last)}`

        client.post('statuses/update', {
                status: `${tarihBilgisi + dolarBilgisi + euroBilgisi + btcBilgisi}${bistBilgisi + altinBilgisi + sterlinBilgisi}`
            })
            .then(function (tweet) {
                console.log("Tweet paylaşıldı, ")
            })
            .catch(function (error) {
                console.log(error)
            })
    }).catch(err => {
        console.log(err)
    })
}

getInformations()

console.log('\x1b[36m%s\x1b[0m', "Botumuz çalışmaya başladı...");


