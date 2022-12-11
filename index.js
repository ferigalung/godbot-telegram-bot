require('dotenv').config();

// Telegram Bot API Config
const TelegramBot = require('node-telegram-bot-api');
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, {polling: true});

// OpenAI Config
const { Configuration, OpenAIApi } = require("openai");
const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

// global variable
bot.context = {};
const commands = [
    { 
        command: '/start',
        description: 'Start Bot'
    },
    { 
        command: '/chat_gpt',
        description: 'Summon Chat GPT'
    },
    { 
        command: '/dall_e',
        description: 'Summon DALL-E'
    }
]
bot.setMyCommands(commands);

// actions
bot.onText(/\/start/, msg => {
    if(!bot.context[msg.chat.id]) {
        bot.context[msg.chat.id] = { mode: null };
    }
    bot.sendMessage(msg.chat.id, `Hi ${msg.from.first_name}, Pick the mode first!. You can pick \/chat_gpt or \/dall_e`);
});

bot.onText(/\/dall_e/, msg => {
    bot.context[msg.chat.id].mode = 'dall_e';
    bot.sendMessage(msg.chat.id, 'Sure\, go ahed type some prompt to generate images\!', {parse_mode: 'Markdown'});
});

bot.onText(/\/chat_gpt/, msg => {
    bot.context[msg.chat.id].mode = 'chat_gpt';
    bot.sendMessage(msg.chat.id, 'Sure\, go ahed type some prompt to start conversation with ChatGPT\!', {parse_mode: 'Markdown'});
});

const createImage = async msg => {
    try {
        const response = await openai.createImage({
            prompt: msg.text.toString(),
            n:1,
            size: '256x256'
        })
        const imageUrl = response.data.data[0].url;
        bot.sendPhoto(msg.chat.id, imageUrl);
    } catch(err) {
        console.log(err);
        if(err.response?.status === 400) {
            bot.sendMessage(msg.chat.id, 'Sorry, that word is prohibited');
            return;
        };
        bot.sendMessage(msg.chat.id, 'Sorry, there\'s problem in our server');
    }
}

const davinciChat = async msg => {
    try {
        const response = await openai.createCompletion({
            model: 'text-davinci-003',
            prompt: msg.text.toString(),
            temperature: 0.5,
            max_tokens: 2048,
            n: 1,
            stream: false
        });
        bot.sendMessage(msg.chat.id, response.data.choices[0].text);
    } catch(err) {
        console.log(err);
        if(err.response?.status === 400) {
            bot.sendMessage(msg.chat.id, 'Sorry, that word is prohibited');
            return;
        };
        bot.sendMessage(msg.chat.id, 'Sorry, there\'s problem in our server');
    }
}

bot.on('message', async msg => {
    const text = msg.text.toString();
    if(commands.findIndex(value => value.command === text ) !== -1) 
        return;

    if(text.startsWith('/') && commands.findIndex(value => value.command === text ) === -1) {
        bot.sendMessage(msg.chat.id, 'invalid command!');
        return;
    }

    if(bot.context[msg.chat.id] && bot.context[msg.chat.id].mode === 'dall_e') {
        await createImage(msg);
        return;
    }

    if(bot.context[msg.chat.id] && bot.context[msg.chat.id].mode === 'chat_gpt') {
        await davinciChat(msg);
        return;
    }

    bot.sendMessage(msg.chat.id, 'Pick the mode first!. You can pick \/chat_gpt or \/dall_e');
});